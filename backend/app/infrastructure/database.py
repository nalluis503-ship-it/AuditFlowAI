from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from backend.app.core.config import Settings


class Base(DeclarativeBase):
    pass


class Database:
    def __init__(self, settings: Settings) -> None:
        settings.prepare_directories()
        self.engine = create_engine(
            settings.database_url,
            connect_args={
                "check_same_thread": False,
                "timeout": settings.sqlite_busy_timeout_seconds,
            },
            pool_pre_ping=True,
        )
        event.listen(self.engine, "connect", self._configure_sqlite_connection)
        self.session_factory = sessionmaker(
            bind=self.engine,
            class_=Session,
            expire_on_commit=False,
        )

    @staticmethod
    def _configure_sqlite_connection(
        dbapi_connection: Any,
        _connection_record: object,
    ) -> None:
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
        finally:
            cursor.close()

    @contextmanager
    def session(self) -> Iterator[Session]:
        session = self.session_factory()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def ping(self) -> bool:
        with self.session() as session:
            session.execute(text("SELECT 1"))
        return True

    def current_revision(self) -> str | None:
        tables = set(inspect(self.engine).get_table_names())
        if "alembic_version" not in tables:
            return None

        with self.session() as session:
            return session.scalar(text("SELECT version_num FROM alembic_version"))

    def schema_is_ready(self, expected_revision: str) -> bool:
        tables = set(inspect(self.engine).get_table_names())
        required = {
            "sources",
            "jobs",
            "job_events",
            "upload_sessions",
            "upload_parts",
            "tabular_runs",
            "tabular_run_inputs",
        }
        return (
            required.issubset(tables) and self.current_revision() == expected_revision
        )

    def require_schema(self, expected_revision: str) -> None:
        current_revision = self.current_revision()
        tables = set(inspect(self.engine).get_table_names())
        required = {
            "sources",
            "jobs",
            "job_events",
            "upload_sessions",
            "upload_parts",
            "tabular_runs",
            "tabular_run_inputs",
        }
        if required.issubset(tables) and current_revision == expected_revision:
            return

        missing = sorted(required - tables)
        raise RuntimeError(
            "The database schema is not at the expected Alembic revision. "
            "Run 'python -m backend.scripts.migrate_database' before starting "
            f"the API. Current revision: {current_revision or 'none'}. "
            f"Expected revision: {expected_revision}. "
            f"Missing tables: {missing or 'none'}."
        )
