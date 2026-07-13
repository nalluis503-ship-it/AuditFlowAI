from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, model_validator

from backend.app.domain.job_models import JobEvent, JobRecord, JobStatus
from backend.app.domain.models import (
    ProfileOptions,
    SourceProfile,
    SourceStatus,
)
from backend.app.domain.tabular_models import TabularPlan, TabularRunRecord
from backend.app.domain.upload_models import UploadSessionStatus


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


class UploadSessionCreateRequest(BaseModel):
    original_name: str = Field(min_length=1, max_length=512)
    media_type: str | None = Field(default=None, max_length=255)
    size_bytes: int = Field(ge=1)
    part_size_bytes: int | None = Field(default=None, ge=1)
    sha256: str | None = Field(default=None, min_length=64, max_length=64)


class UploadSessionView(BaseModel):
    id: str
    source_id: str
    original_name: str
    extension: str
    media_type: str | None
    expected_size_bytes: int
    part_size_bytes: int
    expected_part_count: int
    expected_sha256: str | None
    status: UploadSessionStatus
    created_at: datetime
    updated_at: datetime
    expires_at: datetime
    completed_at: datetime | None
    error_code: str | None
    error_message: str | None
    received_part_count: int
    received_size_bytes: int
    progress_percent: float
    next_missing_part_number: int | None = None


class UploadPartView(BaseModel):
    session_id: str
    part_number: int
    size_bytes: int
    sha256: str
    created_at: datetime


class UploadCompletionResult(BaseModel):
    upload_session: UploadSessionView
    job: JobRecord
    source_id: str


class UploadPartList(BaseModel):
    items: list[UploadPartView]
    total: int
    limit: int
    offset: int


class TabularRunCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=512)
    output_name: str = Field(min_length=1, max_length=512)
    plan: TabularPlan
    priority: int = Field(default=0, ge=-1000, le=1000)
    max_attempts: int | None = Field(default=None, ge=1, le=1000)
    idempotency_key: str | None = Field(default=None, min_length=1, max_length=255)


class TabularRunView(BaseModel):
    run: TabularRunRecord
    job: JobRecord | None = None


class TabularRunSubmission(BaseModel):
    run: TabularRunRecord
    job: JobRecord


class TabularRunList(BaseModel):
    items: list[TabularRunView]
    total: int
    limit: int
    offset: int
