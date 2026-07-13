from collections.abc import AsyncIterable, Callable
from datetime import datetime
from typing import Protocol

from backend.app.domain.upload_models import (
    AssembledUpload,
    StoredUploadPart,
    UploadPartRecord,
    UploadSessionRecord,
    UploadSessionStatus,
)


class UploadRepository(Protocol):
    def create_session(self, session: UploadSessionRecord) -> UploadSessionRecord: ...

    def get_session(self, session_id: str) -> UploadSessionRecord | None: ...

    def list_parts(self, session_id: str) -> list[UploadPartRecord]: ...

    def list_parts_page(
        self,
        session_id: str,
        *,
        limit: int,
        offset: int,
    ) -> list[UploadPartRecord]: ...

    def get_part(
        self,
        session_id: str,
        part_number: int,
    ) -> UploadPartRecord | None: ...

    def add_part(
        self,
        part: UploadPartRecord,
        *,
        expires_at: datetime,
    ) -> UploadPartRecord: ...

    def begin_assembly(
        self,
        session_id: str,
        *,
        now: datetime,
    ) -> UploadSessionRecord | None: ...

    def mark_completed(
        self,
        session_id: str,
        *,
        now: datetime,
    ) -> UploadSessionRecord | None: ...

    def mark_failed(
        self,
        session_id: str,
        *,
        error_code: str,
        error_message: str,
        now: datetime,
    ) -> UploadSessionRecord | None: ...

    def mark_expired(
        self,
        session_id: str,
        *,
        now: datetime,
    ) -> UploadSessionRecord | None: ...

    def abort(
        self,
        session_id: str,
        *,
        now: datetime,
    ) -> UploadSessionRecord | None: ...

    def delete_session(self, session_id: str) -> None: ...

    def list_expired(
        self,
        *,
        now: datetime,
        limit: int,
    ) -> list[UploadSessionRecord]: ...

    def count_sessions(
        self,
        *,
        status: UploadSessionStatus | None = None,
    ) -> int: ...


class UploadStorage(Protocol):
    async def store_part(
        self,
        *,
        session_id: str,
        part_number: int,
        content: AsyncIterable[bytes],
        expected_size_bytes: int,
        expected_sha256: str,
    ) -> StoredUploadPart: ...

    def assemble(
        self,
        session: UploadSessionRecord,
        parts: list[UploadPartRecord],
        *,
        progress_callback: Callable[[int, int], None] | None = None,
        cancellation_check: Callable[[], None] | None = None,
    ) -> AssembledUpload: ...

    def delete_session(self, session_id: str) -> None: ...
