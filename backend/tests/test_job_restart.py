import time
from pathlib import Path

from fastapi.testclient import TestClient

from backend.app.core.config import Settings
from backend.app.infrastructure.migrations import upgrade_database
from backend.app.main import create_app


def test_queued_job_survives_restart_and_is_executed(tmp_path: Path):
    storage_root = tmp_path / "storage"
    stopped_settings = Settings(
        environment="test",
        storage_root=storage_root,
        job_worker_enabled=False,
        job_heartbeat_seconds=1.0,
        job_lease_seconds=30,
    )
    upgrade_database(stopped_settings)

    with TestClient(create_app(stopped_settings)) as client:
        accepted = client.post(
            "/api/v1/sources/ingest-async",
            files={"file": ("restart.csv", b"id,name\n1,Ana\n", "text/csv")},
        )
        assert accepted.status_code == 202
        job_id = accepted.json()["data"]["job"]["id"]
        assert client.get(f"/api/v1/jobs/{job_id}").json()["data"]["status"] == "queued"

    running_settings = Settings(
        environment="test",
        storage_root=storage_root,
        job_worker_enabled=True,
        job_poll_interval_seconds=0.05,
        job_heartbeat_seconds=1.0,
        job_lease_seconds=30,
        job_shutdown_timeout_seconds=5,
    )
    with TestClient(create_app(running_settings)) as client:
        deadline = time.monotonic() + 5
        status = "queued"
        while time.monotonic() < deadline:
            status = client.get(f"/api/v1/jobs/{job_id}").json()["data"]["status"]
            if status == "succeeded":
                break
            time.sleep(0.05)

        assert status == "succeeded"
