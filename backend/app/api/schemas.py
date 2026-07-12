from datetime import datetime

from pydantic import BaseModel, Field

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
