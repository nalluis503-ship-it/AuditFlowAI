from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from anyio import to_thread
from fastapi import UploadFile

from backend.app.application.cancellation import OperationCancelled
from backend.app.core.errors import (
    AuditFlowError,
    InvalidSourceError,
    ResourceNotFoundError,
)
from backend.app.domain.models import (
    ProfileCompleteness,
    ProfileOptions,
    SourceProfile,
    SourceRecord,
    SourceStatus,
)
from backend.app.domain.repositories import SourceRepository
from backend.app.infrastructure.storage import FileSystemSourceStorage
from backend.app.profiling.registry import ProfilerRegistry

PROFILE_VERSION = "1.1"
ProgressReporter = Callable[[float, str | None, str | None], None]
CancellationCheck = Callable[[], None]


def _noop_progress(
    _percent: float,
    _stage: str | None,
    _message: str | None,
) -> None:
    return None


def _noop_cancel() -> None:
    return None


class SourceService:
    def __init__(
        self,
        repository: SourceRepository,
        storage: FileSystemSourceStorage,
        profilers: ProfilerRegistry,
    ) -> None:
        self._repository = repository
        self._storage = storage
        self._profilers = profilers

    async def receive(self, upload: UploadFile) -> SourceRecord:
        original_name = self._storage.safe_original_name(upload.filename)
        extension = Path(original_name).suffix.lower()
        if extension not in self._profilers.supported_extensions:
            await upload.close()
            raise InvalidSourceError(
                "The source format is not supported.",
                code="unsupported_source_format",
                status_code=400,
                details={
                    "extension": extension,
                    "supported_extensions": sorted(
                        self._profilers.supported_extensions
                    ),
                },
            )

        source_id = uuid4().hex
        now = datetime.now(UTC)
        record = SourceRecord(
            id=source_id,
            original_name=original_name,
            extension=extension.lstrip("."),
            media_type=upload.content_type,
            status=SourceStatus.RECEIVING,
            stored_at=now,
            updated_at=now,
        )
        self._repository.create(record)

        try:
            stored = await self._storage.store(
                upload,
                source_id=source_id,
                extension=extension,
            )
            record.size_bytes = stored.size_bytes
            record.sha256 = stored.sha256
            record.stored_path = str(stored.path)
            record.status = SourceStatus.STORED
            record.updated_at = datetime.now(UTC)
            self._repository.update(record)
            return record
        except Exception as exc:
            self._mark_failed(
                record,
                exc,
                default_code="unexpected_ingestion_error",
            )
            if isinstance(exc, AuditFlowError):
                exc.details.setdefault("source_id", source_id)
            raise

    async def ingest(
        self,
        upload: UploadFile,
        *,
        options: ProfileOptions | None = None,
    ) -> SourceProfile:
        record = await self.receive(upload)
        return await self.profile(
            record.id,
            options=options or ProfileOptions(),
        )

    async def profile(
        self,
        source_id: str,
        *,
        options: ProfileOptions,
    ) -> SourceProfile:
        return await to_thread.run_sync(
            lambda: self.profile_sync(source_id, options=options)
        )

    async def reprofile(
        self,
        source_id: str,
        *,
        options: ProfileOptions,
    ) -> SourceProfile:
        return await self.profile(source_id, options=options)

    def profile_sync(
        self,
        source_id: str,
        *,
        options: ProfileOptions,
        report_progress: ProgressReporter = _noop_progress,
        check_cancelled: CancellationCheck = _noop_cancel,
    ) -> SourceProfile:
        record = self._require_record(source_id)
        previous_profile = record.profile
        if not record.stored_path:
            raise InvalidSourceError(
                "The source does not have a stored original file.",
                code="source_file_missing",
                details={"source_id": source_id},
            )

        record.status = SourceStatus.PROFILING
        record.error_code = None
        record.error_message = None
        record.updated_at = datetime.now(UTC)
        self._repository.update(record)

        try:
            report_progress(
                5.0,
                "preparing",
                "The stored source is being validated.",
            )
            check_cancelled()

            path = Path(record.stored_path)
            if not path.is_file():
                raise InvalidSourceError(
                    "The stored source file is missing.",
                    code="source_file_missing",
                    details={"source_id": record.id},
                )

            profiler = self._profilers.resolve(path)
            report_progress(
                15.0,
                "profiling",
                f"The {profiler.name} engine is profiling the source.",
            )
            try:
                sheets = profiler.profile(
                    path,
                    source_id=record.id,
                    options=options,
                )
            finally:
                self._storage.cleanup_work(record.id)

            check_cancelled()
            report_progress(
                90.0,
                "persisting",
                "The verified profile is being persisted.",
            )

            profile = SourceProfile(
                id=record.id,
                original_name=record.original_name,
                extension=record.extension,
                media_type=record.media_type,
                size_bytes=record.size_bytes,
                sha256=record.sha256 or "",
                stored_at=record.stored_at,
                status=SourceStatus.READY,
                profile_version=PROFILE_VERSION,
                profile_engine=profiler.name,
                completeness=ProfileCompleteness.EXACT,
                sheets=sheets,
            )
            self._storage.persist_profile(
                record.id,
                profile.model_dump_json(indent=2),
            )

            record.profile = profile
            record.status = SourceStatus.READY
            record.updated_at = datetime.now(UTC)
            record.error_code = None
            record.error_message = None
            self._repository.update(record)
            report_progress(
                100.0,
                "completed",
                "The source profile is ready.",
            )
            return profile
        except OperationCancelled:
            record.profile = previous_profile
            record.status = (
                SourceStatus.READY
                if previous_profile is not None
                else SourceStatus.STORED
            )
            record.updated_at = datetime.now(UTC)
            record.error_code = None
            record.error_message = None
            self._repository.update(record)
            raise
        except Exception as exc:
            self._mark_failed(
                record,
                exc,
                default_code="unexpected_profile_error",
            )
            raise

    def list(
        self,
        *,
        limit: int,
        offset: int,
    ) -> tuple[list[SourceRecord], int]:
        return (
            self._repository.list(limit=limit, offset=offset),
            self._repository.count(),
        )

    def get(self, source_id: str) -> SourceRecord:
        return self._require_record(source_id)

    def delete(self, source_id: str) -> None:
        self._require_record(source_id)
        self._storage.delete(source_id)
        self._repository.delete(source_id)

    def _mark_failed(
        self,
        record: SourceRecord,
        exc: Exception,
        *,
        default_code: str,
    ) -> None:
        record.status = SourceStatus.FAILED
        record.updated_at = datetime.now(UTC)
        if isinstance(exc, AuditFlowError):
            record.error_code = exc.code
            record.error_message = exc.message
        else:
            record.error_code = default_code
            record.error_message = str(exc)
        self._repository.update(record)

    def _require_record(self, source_id: str) -> SourceRecord:
        record = self._repository.get(source_id)
        if record is None:
            raise ResourceNotFoundError("source", source_id)
        return record
