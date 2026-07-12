from pathlib import Path

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import inspect

from backend.app.core.config import Settings
from backend.app.infrastructure.database import Base, Database
from backend.app.infrastructure.job_repository import JobEventRow, JobRow  # noqa: F401
from backend.app.infrastructure.migrations import (
    alembic_config,
    head_revision,
    upgrade_database,
)
from backend.app.infrastructure.source_repository import SourceRow  # noqa: F401


def test_durable_job_schema_is_managed_by_alembic(tmp_path: Path):
    settings = Settings(
        environment="test",
        storage_root=tmp_path / "storage",
        job_worker_enabled=False,
    )
    upgrade_database(settings)
    database = Database(settings)

    tables = set(inspect(database.engine).get_table_names())
    assert {"sources", "jobs", "job_events"}.issubset(tables)
    assert database.current_revision() == head_revision(settings)
    assert database.current_revision() == "20260712_0002"


def test_upgrade_from_source_catalog_preserves_existing_rows(tmp_path: Path):
    from datetime import UTC, datetime

    from sqlalchemy import text

    settings = Settings(
        environment="test",
        storage_root=tmp_path / "storage",
        job_worker_enabled=False,
    )
    upgrade_database(settings, "20260712_0001")
    database = Database(settings)
    now = datetime.now(UTC)

    with database.session() as session:
        session.execute(
            text(
                """
                INSERT INTO sources (
                    id, original_name, extension, media_type, size_bytes,
                    sha256, stored_path, status, stored_at, updated_at,
                    error_code, error_message, profile_json
                ) VALUES (
                    :id, :original_name, :extension, :media_type, :size_bytes,
                    :sha256, :stored_path, :status, :stored_at, :updated_at,
                    NULL, NULL, NULL
                )
                """
            ),
            {
                "id": "existing-source",
                "original_name": "existing.csv",
                "extension": "csv",
                "media_type": "text/csv",
                "size_bytes": 10,
                "sha256": "a" * 64,
                "stored_path": "storage/sources/existing.csv",
                "status": "ready",
                "stored_at": now.isoformat(),
                "updated_at": now.isoformat(),
            },
        )

    upgrade_database(settings)

    with database.session() as session:
        count = session.scalar(
            text("SELECT COUNT(*) FROM sources WHERE id = 'existing-source'")
        )
        job_count = session.scalar(text("SELECT COUNT(*) FROM jobs"))

    assert count == 1
    assert job_count == 0
    assert database.current_revision() == "20260712_0002"


def test_migrated_schema_matches_sqlalchemy_metadata(tmp_path: Path):
    settings = Settings(
        environment="test",
        storage_root=tmp_path / "storage",
        job_worker_enabled=False,
    )
    upgrade_database(settings)
    database = Database(settings)

    with database.engine.connect() as connection:
        context = MigrationContext.configure(
            connection,
            opts={"compare_type": True},
        )
        differences = compare_metadata(context, Base.metadata)

    assert differences == []


def test_durable_jobs_migration_downgrades_and_reapplies_cleanly(tmp_path: Path):
    settings = Settings(
        environment="test",
        storage_root=tmp_path / "storage",
        job_worker_enabled=False,
    )
    upgrade_database(settings)
    database = Database(settings)

    command.downgrade(alembic_config(settings), "20260712_0001")
    tables_after_downgrade = set(inspect(database.engine).get_table_names())
    assert "sources" in tables_after_downgrade
    assert "jobs" not in tables_after_downgrade
    assert "job_events" not in tables_after_downgrade
    assert database.current_revision() == "20260712_0001"

    upgrade_database(settings)
    assert database.current_revision() == "20260712_0002"
    assert database.schema_is_ready("20260712_0002") is True
