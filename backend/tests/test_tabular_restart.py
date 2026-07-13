from pathlib import Path

from fastapi.testclient import TestClient

from backend.app.core.config import Settings
from backend.app.infrastructure.migrations import upgrade_database
from backend.app.main import create_app


def _settings(tmp_path: Path) -> Settings:
    return Settings(
        environment="test",
        storage_root=tmp_path / "storage",
        max_upload_bytes=64 * 1024 * 1024,
        duckdb_memory_limit="256MB",
        duckdb_threads=2,
        job_worker_enabled=False,
        job_retry_base_seconds=1,
        job_heartbeat_seconds=1.0,
        job_lease_seconds=30,
    )


def test_queued_tabular_run_survives_api_restart(tmp_path: Path):
    settings = _settings(tmp_path)
    upgrade_database(settings)

    with TestClient(create_app(settings)) as first_client:
        source_response = first_client.post(
            "/api/v1/sources/ingest",
            files={
                "file": (
                    "restart-input.csv",
                    b"id,amount\n1,10\n2,20\n",
                    "text/csv",
                )
            },
        )
        assert source_response.status_code == 201, source_response.text
        source = source_response.json()["data"]
        run_response = first_client.post(
            "/api/v1/tabular-runs",
            json={
                "name": "Restart-safe projection",
                "output_name": "restart-result.parquet",
                "plan": {
                    "version": "1.0",
                    "inputs": [{"alias": "source", "source_id": source["id"]}],
                    "steps": [
                        {
                            "type": "select",
                            "id": "selected",
                            "input": "source",
                            "columns": [
                                {
                                    "name": "id",
                                    "expression": {
                                        "kind": "cast",
                                        "data_type": "integer",
                                        "arguments": [
                                            {"kind": "column", "column": "id"}
                                        ],
                                    },
                                },
                                {
                                    "name": "amount",
                                    "expression": {
                                        "kind": "cast",
                                        "data_type": "integer",
                                        "arguments": [
                                            {
                                                "kind": "column",
                                                "column": "amount",
                                            }
                                        ],
                                    },
                                },
                            ],
                        }
                    ],
                    "output": "selected",
                },
            },
        )
        assert run_response.status_code == 202, run_response.text
        submission = run_response.json()["data"]
        run_id = submission["run"]["id"]
        output_source_id = submission["run"]["output_source_id"]
        job_id = submission["job"]["id"]
        assert submission["job"]["status"] == "queued"

    with TestClient(create_app(settings)) as restarted_client:
        queued = restarted_client.get(f"/api/v1/jobs/{job_id}").json()["data"]
        assert queued["status"] == "queued"
        assert restarted_client.app.state.container.job_worker.run_once() is True

        completed = restarted_client.get(f"/api/v1/tabular-runs/{run_id}").json()[
            "data"
        ]
        assert completed["job"]["status"] == "succeeded"
        assert completed["run"]["output_source_id"] == output_source_id

        preview = restarted_client.get(
            f"/api/v1/sources/{output_source_id}/preview",
            params={"limit": 10},
        ).json()["data"]
        assert preview["rows"] == [["1", "10"], ["2", "20"]]
