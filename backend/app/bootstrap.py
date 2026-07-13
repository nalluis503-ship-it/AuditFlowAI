from uuid import uuid4

from backend.app.api.dependencies import AppContainer
from backend.app.application.capability_service import CapabilityService
from backend.app.application.job_service import JobService
from backend.app.application.source_service import SourceService
from backend.app.application.upload_service import UploadSessionService
from backend.app.core.config import Settings
from backend.app.execution.registry import JobExecutorRegistry
from backend.app.execution.runner import JobRunner
from backend.app.execution.source_complete_upload_executor import (
    SourceCompleteUploadExecutor,
)
from backend.app.execution.source_profile_executor import SourceProfileExecutor
from backend.app.execution.worker import LocalJobWorker
from backend.app.infrastructure.database import Database
from backend.app.infrastructure.job_repository import SqlAlchemyJobRepository
from backend.app.infrastructure.migrations import head_revision
from backend.app.infrastructure.resumable_storage import ResumableUploadStorage
from backend.app.infrastructure.source_repository import SqlAlchemySourceRepository
from backend.app.infrastructure.storage import FileSystemSourceStorage
from backend.app.infrastructure.upload_repository import SqlAlchemyUploadRepository
from backend.app.profiling.duckdb_profiler import DuckDBTabularProfiler
from backend.app.profiling.registry import ProfilerRegistry
from backend.app.profiling.xlsx_profiler import XlsxProfiler


def build_container(settings: Settings) -> AppContainer:
    settings.prepare_directories()

    database = Database(settings)
    database.require_schema(head_revision(settings))

    source_repository = SqlAlchemySourceRepository(database)
    source_storage = FileSystemSourceStorage(settings)
    profilers = ProfilerRegistry(
        [
            DuckDBTabularProfiler(settings),
            XlsxProfiler(settings),
        ]
    )
    source_service = SourceService(
        repository=source_repository,
        storage=source_storage,
        profilers=profilers,
    )

    job_repository = SqlAlchemyJobRepository(database)
    upload_repository = SqlAlchemyUploadRepository(database)
    upload_storage = ResumableUploadStorage(settings.upload_storage)
    upload_service = UploadSessionService(
        repository=upload_repository,
        storage=upload_storage,
        source_service=source_service,
        settings=settings,
    )
    upload_service.cleanup_expired()
    executors = JobExecutorRegistry(
        [
            SourceProfileExecutor(source_service),
            SourceCompleteUploadExecutor(upload_service),
        ]
    )
    job_service = JobService(
        repository=job_repository,
        executors=executors,
        settings=settings,
    )
    worker_id = f"local-{uuid4().hex}"
    runner = JobRunner(
        repository=job_repository,
        executors=executors,
        settings=settings,
        worker_id=worker_id,
    )
    worker = LocalJobWorker(
        repository=job_repository,
        runner=runner,
        settings=settings,
        worker_id=worker_id,
    )

    return AppContainer(
        settings=settings,
        database=database,
        source_service=source_service,
        upload_service=upload_service,
        job_service=job_service,
        capability_service=CapabilityService(),
        job_worker=worker,
    )
