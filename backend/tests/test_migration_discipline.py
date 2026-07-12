from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from backend.app.core.config import Settings
from backend.app.infrastructure.database import Database
from backend.app.infrastructure.migrations import head_revision, upgrade_database
from backend.app.main import create_app


def test_database_requires_current_alembic_revision(tmp_path: Path):
    settings = Settings(
        environment="test",
        storage_root=tmp_path / "storage",
    )
    database = Database(settings)
    expected_revision = head_revision(settings)

    assert database.schema_is_ready(expected_revision) is False
    with pytest.raises(RuntimeError, match="expected Alembic revision"):
        database.require_schema(expected_revision)

    upgrade_database(settings)

    assert database.schema_is_ready(expected_revision) is True
    with TestClient(create_app(settings)) as client:
        assert client.get("/ready").json() == {"status": "ready"}


def test_database_rejects_stale_alembic_revision(tmp_path: Path):
    settings = Settings(
        environment="test",
        storage_root=tmp_path / "storage",
    )
    upgrade_database(settings)
    database = Database(settings)
    expected_revision = head_revision(settings)

    with database.session() as session:
        session.execute(
            text("UPDATE alembic_version SET version_num = 'stale_revision'")
        )

    assert database.schema_is_ready(expected_revision) is False
    with pytest.raises(RuntimeError, match="stale_revision"):
        database.require_schema(expected_revision)
