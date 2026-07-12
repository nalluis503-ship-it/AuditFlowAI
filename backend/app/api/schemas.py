from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, model_validator

from backend.app.domain.job_models import JobEvent, JobRecord, JobStatus
from backend.app.domain.models import (
    ProfileOptions,
    SourceProfile,
    SourceStatus,
)


class ApiError(BaseModel):
    code: str
    details: dict = Field(default_factory=dict)


class ApiResponse[T](BaseModel):
    success: bool = True
    message: str
    data: T | None = None
    error: ApiError | None = None


class SourceSummary(BaseModel):
    id: str
    original_name: str
    extension: str
    media_type: str | None
    size_bytes: int
    sha256: str | None
    status: SourceStatus
    stored_at: datetime
    updated_at: datetime
    error_code: str | None
    error_message: str | None
    profile_available: bool
    sheet_count: int
    total_rows: int


class SourceDetail(BaseModel):
    id: str
    original_name: str
    extension: str
    media_type: str | None
    size_bytes: int
    sha256: str | None
    status: SourceStatus
    stored_at: datetime
    updated_at: datetime
    error_code: str | None
    error_message: str | None
    profile: SourceProfile | None


class SourceList(BaseModel):
    items: list[SourceSummary]
    total: int
    limit: int
    offset: int


class ReprofileRequest(ProfileOptions):
    pass


class AsyncSourceIngestResult(BaseModel):
    source: SourceSummary
    job: JobRecord


class AsyncReprofileResult(BaseModel):
    source_id: str
    job: JobRecord


class JobCreateRequest(BaseModel):
    job_type: str = Field(min_length=1, max_length=128)
    payload: dict[str, Any] = Field(default_factory=dict)
    resource_type: str | None = Field(default=None, min_length=1, max_length=64)
    resource_id: str | None = Field(default=None, min_length=1, max_length=128)
    priority: int = Field(default=0, ge=-1000, le=1000)
    max_attempts: int | None = Field(default=None, ge=1, le=1000)
    idempotency_key: str | None = Field(default=None, min_length=1, max_length=255)

    @model_validator(mode="after")
    def validate_resource_reference(self) -> "JobCreateRequest":
        if (self.resource_type is None) != (self.resource_id is None):
            raise ValueError("resource_type and resource_id must be provided together.")
        return self


class JobList(BaseModel):
    items: list[JobRecord]
    total: int
    limit: int
    offset: int
    status: JobStatus | None = None
    job_type: str | None = None


class JobEventList(BaseModel):
    items: list[JobEvent]
    total: int
