from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from backend.app.core.config import Settings


class Base(DeclarativeBase):
    pass


class Database:
    def __init__(self, settings: Settings) -> None:
        settings.prepare_directories()
        self.engine = create_engine(
            settings.database_url,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True,
        )
        self.session_factory = sessionmaker(
            bind=self.engine,
            class_=Session,
            expire_on_commit=False,
        )

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
        return "sources" in tables and self.current_revision() == expected_revision

    def require_schema(self, expected_revision: str) -> None:
        current_revision = self.current_revision()
        tables = set(inspect(self.engine).get_table_names())
        if "sources" in tables and current_revision == expected_revision:
            return

        raise RuntimeError(
            "The database schema is not at the expected Alembic revision. "
            "Run 'python -m backend.scripts.migrate_database' before starting "
            f"the API. Current revision: {current_revision or 'none'}. "
            f"Expected revision: {expected_revision}."
        )
