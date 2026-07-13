from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from pathlib import Path

from pydantic import BaseModel, Field, computed_field


@dataclass(frozen=True, slots=True)
class StoredUploadPart:
    path: Path
    size_bytes: int
    sha256: str


@dataclass(frozen=True, slots=True)
class AssembledUpload:
    path: Path
    size_bytes: int
    sha256: str


class UploadSessionStatus(StrEnum):
    OPEN = "open"
    ASSEMBLING = "assembling"
    COMPLETED = "completed"
    ABORTED = "aborted"
    EXPIRED = "expired"
    FAILED = "failed"

    @property
    def is_terminal(self) -> bool:
        return self in {
            UploadSessionStatus.COMPLETED,
            UploadSessionStatus.ABORTED,
            UploadSessionStatus.EXPIRED,
        }


class UploadPartRecord(BaseModel):
    session_id: str = Field(min_length=1, max_length=64)
    part_number: int = Field(ge=1)
    size_bytes: int = Field(ge=1)
    sha256: str = Field(min_length=64, max_length=64)
    stored_path: str
    created_at: datetime


class UploadSessionRecord(BaseModel):
    id: str = Field(min_length=1, max_length=64)
    source_id: str = Field(min_length=1, max_length=64)
    original_name: str = Field(min_length=1, max_length=512)
    extension: str = Field(min_length=1, max_length=32)
    media_type: str | None = Field(default=None, max_length=255)
    expected_size_bytes: int = Field(ge=1)
    part_size_bytes: int = Field(ge=1)
    expected_part_count: int = Field(ge=1)
    expected_sha256: str | None = Field(default=None, min_length=64, max_length=64)
    status: UploadSessionStatus
    created_at: datetime
    updated_at: datetime
    expires_at: datetime
    completed_at: datetime | None = None
    error_code: str | None = Field(default=None, max_length=128)
    error_message: str | None = None
    received_part_count: int = Field(default=0, ge=0)
    received_size_bytes: int = Field(default=0, ge=0)

    @computed_field
    @property
    def progress_percent(self) -> float:
        if self.expected_size_bytes <= 0:
            return 0.0
        return round(
            min(100.0, (self.received_size_bytes / self.expected_size_bytes) * 100),
            4,
        )

    @computed_field
    @property
    def complete(self) -> bool:
        return self.status == UploadSessionStatus.COMPLETED
