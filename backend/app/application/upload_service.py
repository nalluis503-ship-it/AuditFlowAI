from __future__ import annotations

import math
import re
from collections.abc import AsyncIterable, Callable
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import uuid4

from backend.app.application.cancellation import OperationCancelled
from backend.app.application.source_service import SourceService
from backend.app.core.config import Settings
from backend.app.core.errors import (
    AuditFlowError,
    InvalidSourceError,
    ResourceNotFoundError,
)
from backend.app.domain.models import ProfileOptions
from backend.app.domain.upload_models import (
    UploadPartRecord,
    UploadSessionRecord,
    UploadSessionStatus,
)
from backend.app.domain.upload_repositories import UploadRepository, UploadStorage

_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
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


class UploadSessionService:
    def __init__(
        self,
        *,
        repository: UploadRepository,
        storage: UploadStorage,
        source_service: SourceService,
        settings: Settings,
    ) -> None:
        self._repository = repository
        self._storage = storage
        self._source_service = source_service
        self._settings = settings

    def create(
        self,
        *,
        original_name: str,
        media_type: str | None,
        expected_size_bytes: int,
        part_size_bytes: int | None,
        expected_sha256: str | None,
    ) -> UploadSessionRecord:
        safe_name, extension = self._source_service.normalize_source_name(original_name)

        if expected_size_bytes < 1:
            raise InvalidSourceError(
                "The declared source size must be greater than zero.",
                code="invalid_upload_size",
                status_code=422,
            )
        if expected_size_bytes > self._settings.resumable_max_upload_bytes:
            raise InvalidSourceError(
                "The source exceeds the configured resumable-upload limit.",
                code="resumable_source_too_large",
                status_code=413,
                details={
                    "max_upload_bytes": self._settings.resumable_max_upload_bytes,
                },
            )

        selected_part_size = (
            part_size_bytes or self._settings.resumable_default_part_bytes
        )
        if not (
            self._settings.resumable_min_part_bytes
            <= selected_part_size
            <= self._settings.resumable_max_part_bytes
        ):
            raise InvalidSourceError(
                "The requested part size is outside the configured range.",
                code="invalid_upload_part_size",
                status_code=422,
                details={
                    "minimum": self._settings.resumable_min_part_bytes,
                    "maximum": self._settings.resumable_max_part_bytes,
                },
            )

        expected_part_count = math.ceil(expected_size_bytes / selected_part_size)
        if expected_part_count > self._settings.resumable_max_parts:
            raise InvalidSourceError(
                "The upload would require too many parts.",
                code="upload_part_count_exceeded",
                status_code=422,
                details={
                    "expected_part_count": expected_part_count,
                    "maximum": self._settings.resumable_max_parts,
                },
            )

        normalized_sha256 = None
        if expected_sha256 is not None:
            normalized_sha256 = expected_sha256.strip().lower()
            if not _SHA256_RE.fullmatch(normalized_sha256):
                raise InvalidSourceError(
                    "The declared SHA-256 is invalid.",
                    code="invalid_source_sha256",
                    status_code=422,
                )

        now = datetime.now(UTC)
        record = UploadSessionRecord(
            id=uuid4().hex,
            source_id=uuid4().hex,
            original_name=safe_name,
            extension=extension.lstrip("."),
            media_type=media_type,
            expected_size_bytes=expected_size_bytes,
            part_size_bytes=selected_part_size,
            expected_part_count=expected_part_count,
            expected_sha256=normalized_sha256,
            status=UploadSessionStatus.OPEN,
            created_at=now,
            updated_at=now,
            expires_at=now
            + timedelta(seconds=self._settings.upload_session_ttl_seconds),
        )
        return self._repository.create_session(record)

    def get(self, session_id: str) -> UploadSessionRecord:
        session = self._expire_if_needed(self._require_session(session_id))
        if session.status == UploadSessionStatus.COMPLETED:
            self._storage.delete_session(session.id)
        return session

    def list_parts(self, session_id: str) -> list[UploadPartRecord]:
        self.get(session_id)
        return self._repository.list_parts(session_id)

    def list_parts_page(
        self,
        session_id: str,
        *,
        limit: int,
        offset: int,
    ) -> tuple[list[UploadPartRecord], int]:
        session = self.get(session_id)
        parts = self._repository.list_parts_page(
            session.id,
            limit=limit,
            offset=offset,
        )
        return parts, session.received_part_count

    async def upload_part(
        self,
        session_id: str,
        *,
        part_number: int,
        expected_sha256: str,
        content: AsyncIterable[bytes],
    ) -> UploadPartRecord:
        session = self.get(session_id)
        self._ensure_accepts_parts(session)
        self._validate_part_number(session, part_number)

        normalized_sha256 = expected_sha256.strip().lower()
        if not _SHA256_RE.fullmatch(normalized_sha256):
            raise InvalidSourceError(
                "The part SHA-256 header is invalid.",
                code="invalid_upload_part_sha256",
                status_code=422,
                details={"part_number": part_number},
            )

        expected_size = self.expected_part_size(session, part_number)
        existing = self._repository.get_part(session_id, part_number)
        if existing is not None:
            if (
                existing.sha256 == normalized_sha256
                and existing.size_bytes == expected_size
                and Path(existing.stored_path).is_file()
            ):
                return existing
            raise AuditFlowError(
                "A different payload is already registered for this part.",
                code="upload_part_conflict",
                status_code=409,
                details={"part_number": part_number},
            )

        stored = await self._storage.store_part(
            session_id=session_id,
            part_number=part_number,
            content=content,
            expected_size_bytes=expected_size,
            expected_sha256=normalized_sha256,
        )
        part = UploadPartRecord(
            session_id=session_id,
            part_number=part_number,
            size_bytes=stored.size_bytes,
            sha256=stored.sha256,
            stored_path=str(stored.path),
            created_at=datetime.now(UTC),
        )
        try:
            persisted = self._repository.add_part(
                part,
                expires_at=part.created_at
                + timedelta(seconds=self._settings.upload_session_ttl_seconds),
            )
        except Exception:
            stored.path.unlink(missing_ok=True)
            raise
        same_payload = (
            persisted.sha256 == part.sha256 and persisted.size_bytes == part.size_bytes
        )
        same_storage_path = Path(persisted.stored_path) == stored.path
        if not same_storage_path:
            stored.path.unlink(missing_ok=True)
        if not same_payload:
            raise AuditFlowError(
                "The upload part changed while it was being registered.",
                code="upload_part_concurrency_conflict",
                status_code=409,
                details={"part_number": part_number},
            )
        return persisted

    def prepare_completion(self, session_id: str) -> UploadSessionRecord:
        session = self.get(session_id)
        if session.status == UploadSessionStatus.COMPLETED:
            return session

        self._ensure_can_complete(session)
        parts = self._repository.list_parts(session.id)
        self._validate_complete_part_set(session, parts)
        return session

    def complete_sync(
        self,
        session_id: str,
        *,
        report_progress: ProgressReporter = _noop_progress,
        check_cancelled: CancellationCheck = _noop_cancel,
    ) -> dict[str, Any]:
        session = self.get(session_id)
        if session.status == UploadSessionStatus.COMPLETED:
            source = self._source_service.get(session.source_id)
            return {
                "upload_session_id": session.id,
                "source_id": source.id,
                "source_status": source.status.value,
                "sha256": source.sha256,
            }

        self._ensure_can_complete(session)
        parts = self._repository.list_parts(session.id)
        self._validate_complete_part_set(session, parts)
        started = self._repository.begin_assembly(
            session.id,
            now=datetime.now(UTC),
        )
        if started is None:
            raise ResourceNotFoundError("upload_session", session.id)
        if started.status == UploadSessionStatus.COMPLETED:
            source = self._source_service.get(started.source_id)
            return {
                "upload_session_id": started.id,
                "source_id": source.id,
                "source_status": source.status.value,
                "sha256": source.sha256,
            }
        if started.status != UploadSessionStatus.ASSEMBLING:
            raise AuditFlowError(
                "The upload session cannot be assembled in its current state.",
                code="upload_session_state_conflict",
                status_code=409,
                details={"status": started.status.value},
            )

        try:
            report_progress(5.0, "validating_parts", "Upload parts are being verified.")
            check_cancelled()

            def assembly_progress(
                completed_parts: int,
                total_parts: int,
            ) -> None:
                check_cancelled()
                fraction = completed_parts / max(total_parts, 1)
                report_progress(
                    5.0 + fraction * 45.0,
                    "assembling",
                    f"Assembled {completed_parts} of {total_parts} parts.",
                )

            assembled = self._storage.assemble(
                started,
                parts,
                progress_callback=assembly_progress,
                cancellation_check=check_cancelled,
            )
            check_cancelled()
            report_progress(
                55.0,
                "registering_source",
                "The verified source is being registered.",
            )
            source = self._source_service.register_prepared_source(
                source_id=started.source_id,
                original_name=started.original_name,
                media_type=started.media_type,
                prepared_path=assembled.path,
                size_bytes=assembled.size_bytes,
                sha256=assembled.sha256,
            )

            def profile_progress(
                percent: float,
                stage: str | None,
                message: str | None,
            ) -> None:
                check_cancelled()
                report_progress(
                    55.0 + min(100.0, max(0.0, percent)) * 0.44,
                    f"profile.{stage}" if stage else "profiling",
                    message,
                )

            profile = self._source_service.profile_sync(
                source.id,
                options=ProfileOptions(),
                report_progress=profile_progress,
                check_cancelled=check_cancelled,
            )
            completed = self._repository.mark_completed(
                started.id,
                now=datetime.now(UTC),
            )
            if completed is None:
                raise ResourceNotFoundError("upload_session", started.id)
            self._storage.delete_session(started.id)
            report_progress(100.0, "completed", "The resumable upload is ready.")
            return {
                "upload_session_id": completed.id,
                "source_id": profile.id,
                "source_status": profile.status.value,
                "sha256": profile.sha256,
                "profile_version": profile.profile_version,
                "profile_engine": profile.profile_engine,
                "sheet_count": len(profile.sheets),
            }
        except OperationCancelled:
            self._repository.mark_failed(
                started.id,
                error_code="upload_completion_canceled",
                error_message="The upload completion was canceled.",
                now=datetime.now(UTC),
            )
            raise
        except AuditFlowError as exc:
            self._repository.mark_failed(
                started.id,
                error_code=exc.code,
                error_message=exc.message,
                now=datetime.now(UTC),
            )
            raise
        except Exception as exc:
            self._repository.mark_failed(
                started.id,
                error_code="unexpected_upload_completion_error",
                error_message=str(exc),
                now=datetime.now(UTC),
            )
            raise

    def abort(self, session_id: str) -> UploadSessionRecord:
        session = self.get(session_id)
        if session.status == UploadSessionStatus.EXPIRED:
            self._storage.delete_session(session.id)
            return session
        if session.status == UploadSessionStatus.COMPLETED:
            raise AuditFlowError(
                "A completed upload session cannot be aborted.",
                code="upload_session_already_completed",
                status_code=409,
                details={"source_id": session.source_id},
            )
        if session.status == UploadSessionStatus.ASSEMBLING:
            raise AuditFlowError(
                "The upload session is currently being assembled.",
                code="upload_session_active",
                status_code=409,
            )
        aborted = self._repository.abort(
            session.id,
            now=datetime.now(UTC),
        )
        if aborted is None:
            raise ResourceNotFoundError("upload_session", session.id)
        self._storage.delete_session(session.id)
        return aborted

    def cleanup_expired(self, *, limit: int = 1000) -> int:
        now = datetime.now(UTC)
        expired_sessions = self._repository.list_expired(now=now, limit=limit)
        cleaned = 0
        for session in expired_sessions:
            marked = self._repository.mark_expired(session.id, now=now)
            if marked is None:
                continue
            self._storage.delete_session(session.id)
            cleaned += 1
        return cleaned

    def expected_part_size(
        self,
        session: UploadSessionRecord,
        part_number: int,
    ) -> int:
        self._validate_part_number(session, part_number)
        if part_number < session.expected_part_count:
            return session.part_size_bytes
        consumed = session.part_size_bytes * (session.expected_part_count - 1)
        return session.expected_size_bytes - consumed

    def next_missing_part(self, session_id: str) -> int | None:
        session = self.get(session_id)
        if session.status.is_terminal:
            return None
        received = {
            part.part_number for part in self._repository.list_parts(session.id)
        }
        for number in range(1, session.expected_part_count + 1):
            if number not in received:
                return number
        return None

    def _require_session(self, session_id: str) -> UploadSessionRecord:
        session = self._repository.get_session(session_id)
        if session is None:
            raise ResourceNotFoundError("upload_session", session_id)
        return session

    def _expire_if_needed(
        self,
        session: UploadSessionRecord,
    ) -> UploadSessionRecord:
        now = datetime.now(UTC)
        expires_at = session.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        if (
            session.status in {UploadSessionStatus.OPEN, UploadSessionStatus.FAILED}
            and expires_at <= now
        ):
            expired = self._repository.mark_expired(session.id, now=now)
            self._storage.delete_session(session.id)
            if expired is not None:
                return expired
        return session

    @staticmethod
    def _ensure_accepts_parts(session: UploadSessionRecord) -> None:
        if session.status not in {
            UploadSessionStatus.OPEN,
            UploadSessionStatus.FAILED,
        }:
            raise AuditFlowError(
                "The upload session is not accepting parts.",
                code="upload_session_not_writable",
                status_code=409,
                details={"status": session.status.value},
            )

    @staticmethod
    def _ensure_can_complete(session: UploadSessionRecord) -> None:
        if session.status not in {
            UploadSessionStatus.OPEN,
            UploadSessionStatus.FAILED,
            UploadSessionStatus.ASSEMBLING,
        }:
            raise AuditFlowError(
                "The upload session cannot be completed in its current state.",
                code="upload_session_not_completable",
                status_code=409,
                details={"status": session.status.value},
            )

    @staticmethod
    def _validate_part_number(
        session: UploadSessionRecord,
        part_number: int,
    ) -> None:
        if not 1 <= part_number <= session.expected_part_count:
            raise InvalidSourceError(
                "The upload part number is outside the session plan.",
                code="upload_part_number_out_of_range",
                status_code=422,
                details={
                    "part_number": part_number,
                    "expected_part_count": session.expected_part_count,
                },
            )

    @staticmethod
    def _validate_complete_part_set(
        session: UploadSessionRecord,
        parts: list[UploadPartRecord],
    ) -> None:
        expected_numbers = set(range(1, session.expected_part_count + 1))
        received_numbers = {part.part_number for part in parts}
        missing = sorted(expected_numbers - received_numbers)
        if missing:
            raise AuditFlowError(
                "The upload session is missing parts.",
                code="upload_parts_incomplete",
                status_code=409,
                details={
                    "missing_part_numbers": missing[:100],
                    "missing_part_count": len(missing),
                },
            )
        total = sum(part.size_bytes for part in parts)
        if total != session.expected_size_bytes:
            raise AuditFlowError(
                "The registered upload parts do not match the declared source size.",
                code="upload_parts_size_mismatch",
                status_code=409,
                details={
                    "expected_size_bytes": session.expected_size_bytes,
                    "registered_size_bytes": total,
                },
            )
