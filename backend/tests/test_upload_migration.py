from datetime import UTC, datetime
from pathlib import Path

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import inspect, text

from backend.app.core.config import Settings
from backend.app.infrastructure.database import Base, Database
from backend.app.infrastructure.job_repository import JobEventRow, JobRow  # noqa: F401
from backend.app.infrastructure.migrations import (
    alembic_config,
    upgrade_database,
)
from backend.app.infrastructure.source_repository import SourceRow  # noqa: F401
from backend.app.infrastructure.upload_repository import (  # noqa: F401
    UploadPartRow,
    UploadSessionRow,
)


def _settings(tmp_path: Path) -> Settings:
    return Settings(
        environment="test",
        storage_root=tmp_path / "storage",
        job_worker_enabled=False,
    )


def test_resumable_upload_schema_is_managed_by_alembic(tmp_path: Path):
    settings = _settings(tmp_path)
    upgrade_database(settings)
    database = Database(settings)

    tables = set(inspect(database.engine).get_table_names())
    assert {
        "sources",
        "jobs",
        "job_events",
        "upload_sessions",
        "upload_parts",
    }.issubset(tables)
    assert database.current_revision() == "20260712_0003"
    assert database.schema_is_ready("20260712_0003") is True

    with database.engine.connect() as connection:
        context = MigrationContext.configure(
            connection,
            opts={"compare_type": True},
        )
        differences = compare_metadata(context, Base.metadata)

    assert differences == []


def test_upgrade_from_durable_jobs_preserves_existing_data(tmp_path: Path):
    settings = _settings(tmp_path)
    upgrade_database(settings, "20260712_0002")
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
                    'kept-source', 'kept.csv', 'csv', 'text/csv', 5,
                    :sha256, 'kept.csv', 'stored', :now, :now,
                    NULL, NULL, NULL
                )
                """
            ),
            {"sha256": "a" * 64, "now": now.isoformat()},
        )
        session.execute(
            text(
                """
                INSERT INTO jobs (
                    id, job_type, payload_json, resource_type, resource_id,
                    status, priority, max_attempts, attempt_count, available_at,
                    lease_owner, lease_expires_at, cancellation_requested_at,
                    created_at, updated_at, started_at, finished_at,
                    progress_percent, progress_stage, progress_message,
                    result_json, error_code, error_message, idempotency_key
                ) VALUES (
                    'kept-job', 'source.profile', '{}', 'source', 'kept-source',
                    'queued', 0, 3, 0, :now,
                    NULL, NULL, NULL, :now, :now, NULL, NULL,
                    0, 'queued', NULL, NULL, NULL, NULL, 'kept-job-key'
                )
                """
            ),
            {"now": now.isoformat()},
        )

    upgrade_database(settings)

    with database.session() as session:
        source_count = session.scalar(
            text("SELECT COUNT(*) FROM sources WHERE id = 'kept-source'")
        )
        job_count = session.scalar(
            text("SELECT COUNT(*) FROM jobs WHERE id = 'kept-job'")
        )
        upload_count = session.scalar(text("SELECT COUNT(*) FROM upload_sessions"))

    assert source_count == 1
    assert job_count == 1
    assert upload_count == 0
    assert database.current_revision() == "20260712_0003"


def test_upload_migration_downgrades_to_jobs_and_reapplies(tmp_path: Path):
    settings = _settings(tmp_path)
    upgrade_database(settings)
    database = Database(settings)

    command.downgrade(alembic_config(settings), "20260712_0002")
    tables = set(inspect(database.engine).get_table_names())
    assert "sources" in tables
    assert "jobs" in tables
    assert "job_events" in tables
    assert "upload_sessions" not in tables
    assert "upload_parts" not in tables
    assert database.current_revision() == "20260712_0002"

    upgrade_database(settings)
    assert database.current_revision() == "20260712_0003"
    assert database.schema_is_ready("20260712_0003") is True
