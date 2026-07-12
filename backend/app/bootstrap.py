from backend.app.api.dependencies import AppContainer
from backend.app.application.capability_service import CapabilityService
from backend.app.application.source_service import SourceService
from backend.app.core.config import Settings
from backend.app.infrastructure.database import Database
from backend.app.infrastructure.migrations import head_revision
from backend.app.infrastructure.source_repository import (
    SqlAlchemySourceRepository,
)
from backend.app.infrastructure.storage import FileSystemSourceStorage
from backend.app.profiling.duckdb_profiler import DuckDBTabularProfiler
from backend.app.profiling.registry import ProfilerRegistry
from backend.app.profiling.xlsx_profiler import XlsxProfiler


def build_container(settings: Settings) -> AppContainer:
    settings.prepare_directories()

    database = Database(settings)
    database.require_schema(head_revision(settings))

    repository = SqlAlchemySourceRepository(database)
    storage = FileSystemSourceStorage(settings)
    profilers = ProfilerRegistry(
        [
            DuckDBTabularProfiler(settings),
            XlsxProfiler(settings),
        ]
    )

    return AppContainer(
        settings=settings,
        database=database,
        source_service=SourceService(
            repository=repository,
            storage=storage,
            profilers=profilers,
        ),
        capability_service=CapabilityService(),
    )
