import hashlib
from pathlib import Path

from fastapi.testclient import TestClient

from backend.app.core.config import Settings
from backend.app.infrastructure.migrations import upgrade_database
from backend.app.main import create_app


def _settings(tmp_path: Path) -> Settings:
    return Settings(
        environment="test",
        storage_root=tmp_path / "storage",
        resumable_max_upload_bytes=32 * 1024 * 1024,
        resumable_default_part_bytes=64 * 1024,
        resumable_min_part_bytes=64 * 1024,
        resumable_max_part_bytes=1024 * 1024,
        upload_session_ttl_seconds=3600,
        job_worker_enabled=False,
        job_heartbeat_seconds=1.0,
        job_lease_seconds=30,
    )


def _put(client: TestClient, session_id: str, number: int, part: bytes):
    return client.put(
        f"/api/v1/upload-sessions/{session_id}/parts/{number}",
        content=part,
        headers={"X-Part-SHA256": hashlib.sha256(part).hexdigest()},
    )


def test_upload_session_survives_api_restart(tmp_path: Path):
    settings = _settings(tmp_path)
    upgrade_database(settings)
    content = ("id,value\n" + "".join(f"{i},{i * 2}\n" for i in range(10000))).encode()
    part_size = 64 * 1024
    parts = [
        content[offset : offset + part_size]
        for offset in range(0, len(content), part_size)
    ]

    with TestClient(create_app(settings)) as first_client:
        created = first_client.post(
            "/api/v1/upload-sessions",
            json={
                "original_name": "restart.csv",
                "size_bytes": len(content),
                "part_size_bytes": part_size,
                "sha256": hashlib.sha256(content).hexdigest(),
            },
        ).json()["data"]
        session_id = created["id"]
        assert _put(first_client, session_id, 1, parts[0]).status_code == 200

    with TestClient(create_app(settings)) as second_client:
        restored = second_client.get(f"/api/v1/upload-sessions/{session_id}").json()[
            "data"
        ]
        assert restored["received_part_count"] == 1
        assert restored["next_missing_part_number"] == 2

        for number, part in enumerate(parts[1:], start=2):
            assert _put(second_client, session_id, number, part).status_code == 200

        accepted = second_client.post(
            f"/api/v1/upload-sessions/{session_id}/complete"
        ).json()["data"]
        assert second_client.app.state.container.job_worker.run_once() is True

        job = second_client.get(f"/api/v1/jobs/{accepted['job']['id']}").json()["data"]
        assert job["status"] == "succeeded"
        source = second_client.get(f"/api/v1/sources/{accepted['source_id']}").json()[
            "data"
        ]
        assert source["status"] == "ready"


def test_expired_upload_storage_is_cleaned_on_restart(tmp_path: Path):
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import text

    from backend.app.infrastructure.database import Database

    settings = _settings(tmp_path)
    upgrade_database(settings)
    content = b"id,value\n1,2\n" + (b"x" * (64 * 1024))
    part_size = 64 * 1024

    with TestClient(create_app(settings)) as first_client:
        created = first_client.post(
            "/api/v1/upload-sessions",
            json={
                "original_name": "expired.csv",
                "size_bytes": len(content),
                "part_size_bytes": part_size,
            },
        ).json()["data"]
        session_id = created["id"]
        first_part = content[:part_size]
        assert _put(first_client, session_id, 1, first_part).status_code == 200
        upload_dir = settings.upload_storage / session_id
        assert upload_dir.exists()

    database = Database(settings)
    with database.session() as session:
        session.execute(
            text(
                """
                UPDATE upload_sessions
                SET expires_at = :expired_at
                WHERE id = :session_id
                """
            ),
            {
                "expired_at": (datetime.now(UTC) - timedelta(hours=1)).isoformat(),
                "session_id": session_id,
            },
        )

    with TestClient(create_app(settings)) as second_client:
        detail = second_client.get(f"/api/v1/upload-sessions/{session_id}").json()[
            "data"
        ]
        assert detail["status"] == "expired"
        assert not upload_dir.exists()
