import hashlib
import shutil
from contextlib import suppress
from dataclasses import dataclass
from pathlib import Path

from fastapi import UploadFile

from backend.app.core.config import Settings
from backend.app.core.errors import InvalidSourceError


@dataclass(frozen=True, slots=True)
class StoredUpload:
    path: Path
    size_bytes: int
    sha256: str


class FileSystemSourceStorage:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    @staticmethod
    def safe_original_name(filename: str | None) -> str:
        if not filename:
            raise InvalidSourceError(
                "The uploaded file must have a name.",
                code="missing_filename",
                status_code=400,
            )

        normalized = filename.replace("\\", "/")
        safe_name = Path(normalized).name.strip()

        if not safe_name or safe_name in {".", ".."}:
            raise InvalidSourceError(
                "The uploaded file name is invalid.",
                code="invalid_filename",
                status_code=400,
            )

        return safe_name

    def source_path(self, source_id: str, extension: str) -> Path:
        return self._settings.source_storage / source_id / f"original{extension}"

    async def store(
        self,
        upload: UploadFile,
        *,
        source_id: str,
        extension: str,
    ) -> StoredUpload:
        destination = self.source_path(source_id, extension)
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = destination.with_suffix(destination.suffix + ".part")
        size_bytes = 0
        digest = hashlib.sha256()

        try:
            with temporary.open("xb") as output:
                while True:
                    chunk = await upload.read(self._settings.upload_chunk_bytes)
                    if not chunk:
                        break

                    size_bytes += len(chunk)
                    if size_bytes > self._settings.max_upload_bytes:
                        raise InvalidSourceError(
                            "The file exceeds the configured direct-upload limit.",
                            code="source_too_large",
                            status_code=413,
                            details={
                                "max_upload_bytes": (self._settings.max_upload_bytes),
                            },
                        )

                    digest.update(chunk)
                    output.write(chunk)

            if size_bytes == 0:
                raise InvalidSourceError(
                    "The uploaded file is empty.",
                    code="empty_source",
                    status_code=400,
                )

            temporary.replace(destination)
            return StoredUpload(
                path=destination,
                size_bytes=size_bytes,
                sha256=digest.hexdigest(),
            )
        except Exception:
            temporary.unlink(missing_ok=True)
            destination.unlink(missing_ok=True)
            self._remove_empty_parent(destination.parent)
            raise
        finally:
            await upload.close()

    def persist_profile(self, source_id: str, payload: str) -> Path:
        destination = self._settings.profile_storage / f"{source_id}.json"
        temporary = destination.with_suffix(".json.tmp")
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary.write_text(payload, encoding="utf-8")
        temporary.replace(destination)
        return destination

    def delete(self, source_id: str) -> None:
        source_dir = self._settings.source_storage / source_id
        if source_dir.exists():
            for item in source_dir.iterdir():
                if item.is_file():
                    item.unlink(missing_ok=True)
            self._remove_empty_parent(source_dir)

        profile = self._settings.profile_storage / f"{source_id}.json"
        profile.unlink(missing_ok=True)
        self.cleanup_work(source_id)

    def cleanup_work(self, source_id: str) -> None:
        work_dir = self._settings.work_storage / source_id
        if work_dir.exists():
            shutil.rmtree(work_dir, ignore_errors=True)

    @staticmethod
    def _remove_empty_parent(path: Path) -> None:
        with suppress(FileNotFoundError, OSError):
            path.rmdir()
