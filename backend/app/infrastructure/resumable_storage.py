from __future__ import annotations

import hashlib
import os
import shutil
from collections.abc import AsyncIterable, Callable
from contextlib import suppress
from pathlib import Path
from uuid import uuid4

from backend.app.core.errors import AuditFlowError, InvalidSourceError
from backend.app.domain.upload_models import (
    AssembledUpload,
    StoredUploadPart,
    UploadPartRecord,
    UploadSessionRecord,
)


class ResumableUploadStorage:
    def __init__(self, upload_root: Path) -> None:
        self._upload_root = upload_root

    def session_dir(self, session_id: str) -> Path:
        return self._upload_root / session_id

    def part_path(
        self,
        session_id: str,
        part_number: int,
        storage_token: str,
    ) -> Path:
        return (
            self.session_dir(session_id)
            / "parts"
            / f"{part_number:08d}-{storage_token}.part"
        )

    async def store_part(
        self,
        *,
        session_id: str,
        part_number: int,
        content: AsyncIterable[bytes],
        expected_size_bytes: int,
        expected_sha256: str,
    ) -> StoredUploadPart:
        parts_dir = self.session_dir(session_id) / "parts"
        parts_dir.mkdir(parents=True, exist_ok=True)

        storage_token = uuid4().hex[:12]
        destination = self.part_path(
            session_id,
            part_number,
            storage_token,
        )
        temporary = parts_dir / f".{part_number:08d}-{uuid4().hex[:8]}.tmp"
        digest = hashlib.sha256()
        size_bytes = 0
        try:
            with temporary.open("xb") as output:
                async for chunk in content:
                    if not chunk:
                        continue
                    size_bytes += len(chunk)
                    if size_bytes > expected_size_bytes:
                        raise InvalidSourceError(
                            "The uploaded part exceeds its expected size.",
                            code="upload_part_too_large",
                            status_code=413,
                            details={
                                "part_number": part_number,
                                "expected_size_bytes": expected_size_bytes,
                            },
                        )
                    digest.update(chunk)
                    output.write(chunk)
                output.flush()
                os.fsync(output.fileno())

            if size_bytes != expected_size_bytes:
                raise InvalidSourceError(
                    "The uploaded part size does not match the session plan.",
                    code="upload_part_size_mismatch",
                    status_code=422,
                    details={
                        "part_number": part_number,
                        "expected_size_bytes": expected_size_bytes,
                        "received_size_bytes": size_bytes,
                    },
                )

            actual_sha256 = digest.hexdigest()
            if actual_sha256 != expected_sha256:
                raise InvalidSourceError(
                    "The uploaded part checksum does not match.",
                    code="upload_part_checksum_mismatch",
                    status_code=422,
                    details={
                        "part_number": part_number,
                        "expected_sha256": expected_sha256,
                        "actual_sha256": actual_sha256,
                    },
                )

            temporary.replace(destination)
            return StoredUploadPart(
                path=destination,
                size_bytes=size_bytes,
                sha256=actual_sha256,
            )
        except Exception:
            temporary.unlink(missing_ok=True)
            raise

    def assemble(
        self,
        session: UploadSessionRecord,
        parts: list[UploadPartRecord],
        *,
        progress_callback: Callable[[int, int], None] | None = None,
        cancellation_check: Callable[[], None] | None = None,
    ) -> AssembledUpload:
        if len(parts) != session.expected_part_count:
            raise InvalidSourceError(
                "The upload session is missing one or more parts.",
                code="upload_parts_incomplete",
                status_code=409,
                details={
                    "expected_part_count": session.expected_part_count,
                    "received_part_count": len(parts),
                },
            )

        expected_numbers = list(range(1, session.expected_part_count + 1))
        received_numbers = [part.part_number for part in parts]
        if received_numbers != expected_numbers:
            missing = sorted(set(expected_numbers) - set(received_numbers))
            raise InvalidSourceError(
                "The upload session parts are not contiguous.",
                code="upload_parts_not_contiguous",
                status_code=409,
                details={"missing_part_numbers": missing[:100]},
            )

        session_dir = self.session_dir(session.id)
        session_dir.mkdir(parents=True, exist_ok=True)
        destination = session_dir / "assembled.bin"
        temporary = session_dir / "assembled.bin.tmp"
        digest = hashlib.sha256()
        size_bytes = 0

        if destination.exists():
            with destination.open("rb") as existing:
                while chunk := existing.read(8 * 1024 * 1024):
                    size_bytes += len(chunk)
                    digest.update(chunk)
            actual_sha256 = digest.hexdigest()
            if size_bytes == session.expected_size_bytes and (
                session.expected_sha256 is None
                or actual_sha256 == session.expected_sha256
            ):
                return AssembledUpload(
                    path=destination,
                    size_bytes=size_bytes,
                    sha256=actual_sha256,
                )
            raise AuditFlowError(
                "A previously assembled upload failed integrity verification.",
                code="assembled_source_storage_conflict",
                status_code=409,
                details={"session_id": session.id},
            )

        digest = hashlib.sha256()
        size_bytes = 0
        try:
            with temporary.open("wb") as output:
                for completed_parts, part in enumerate(parts, start=1):
                    if cancellation_check is not None:
                        cancellation_check()
                    part_path = Path(part.stored_path)
                    if not part_path.is_file():
                        raise InvalidSourceError(
                            "An uploaded part is missing from storage.",
                            code="upload_part_missing_from_storage",
                            status_code=409,
                            details={"part_number": part.part_number},
                        )

                    part_digest = hashlib.sha256()
                    part_size = 0
                    with part_path.open("rb") as source:
                        while chunk := source.read(8 * 1024 * 1024):
                            part_size += len(chunk)
                            part_digest.update(chunk)
                            digest.update(chunk)
                            output.write(chunk)

                    if part_size != part.size_bytes:
                        raise InvalidSourceError(
                            "An uploaded part changed after it was registered.",
                            code="upload_part_storage_size_mismatch",
                            status_code=409,
                            details={"part_number": part.part_number},
                        )
                    if part_digest.hexdigest() != part.sha256:
                        raise InvalidSourceError(
                            "An uploaded part failed its stored checksum verification.",
                            code="upload_part_storage_checksum_mismatch",
                            status_code=409,
                            details={"part_number": part.part_number},
                        )
                    size_bytes += part_size
                    if progress_callback is not None:
                        progress_callback(completed_parts, len(parts))

                output.flush()
                os.fsync(output.fileno())

            if size_bytes != session.expected_size_bytes:
                raise InvalidSourceError(
                    "The assembled source size does not match the declared size.",
                    code="assembled_source_size_mismatch",
                    status_code=422,
                    details={
                        "expected_size_bytes": session.expected_size_bytes,
                        "actual_size_bytes": size_bytes,
                    },
                )

            actual_sha256 = digest.hexdigest()
            if (
                session.expected_sha256 is not None
                and actual_sha256 != session.expected_sha256
            ):
                raise InvalidSourceError(
                    "The assembled source checksum does not match.",
                    code="assembled_source_checksum_mismatch",
                    status_code=422,
                    details={
                        "expected_sha256": session.expected_sha256,
                        "actual_sha256": actual_sha256,
                    },
                )

            temporary.replace(destination)
            return AssembledUpload(
                path=destination,
                size_bytes=size_bytes,
                sha256=actual_sha256,
            )
        except AuditFlowError:
            temporary.unlink(missing_ok=True)
            raise
        except Exception as exc:
            temporary.unlink(missing_ok=True)
            raise AuditFlowError(
                "The uploaded parts could not be assembled.",
                code="upload_assembly_failed",
                status_code=500,
                details={"session_id": session.id},
            ) from exc

    def delete_session(self, session_id: str) -> None:
        directory = self.session_dir(session_id)
        if directory.exists():
            shutil.rmtree(directory, ignore_errors=True)

    def delete_assembled(self, session_id: str) -> None:
        with suppress(OSError):
            (self.session_dir(session_id) / "assembled.bin").unlink(missing_ok=True)
