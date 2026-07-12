from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field, computed_field


class JobStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELED = "canceled"

    @property
    def is_terminal(self) -> bool:
        return self in {
            JobStatus.SUCCEEDED,
            JobStatus.FAILED,
            JobStatus.CANCELED,
        }


class JobRecord(BaseModel):
    id: str
    job_type: str = Field(min_length=1, max_length=128)
    payload: dict[str, Any] = Field(default_factory=dict)
    resource_type: str | None = Field(default=None, min_length=1, max_length=64)
    resource_id: str | None = Field(default=None, min_length=1, max_length=128)
    status: JobStatus
    priority: int = Field(default=0, ge=-1000, le=1000)
    max_attempts: int = Field(ge=1)
    attempt_count: int = Field(default=0, ge=0)
    available_at: datetime
    lease_owner: str | None = None
    lease_expires_at: datetime | None = None
    cancellation_requested_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
    progress_percent: float = Field(default=0.0, ge=0, le=100)
    progress_stage: str | None = None
    progress_message: str | None = None
    result: dict[str, Any] | None = None
    error_code: str | None = None
    error_message: str | None = None
    idempotency_key: str | None = None

    @computed_field
    @property
    def cancel_requested(self) -> bool:
        return self.cancellation_requested_at is not None


class JobEvent(BaseModel):
    id: int
    job_id: str
    event_type: str
    occurred_at: datetime
    payload: dict[str, Any] = Field(default_factory=dict)
    resource_type: str | None = Field(default=None, min_length=1, max_length=64)
    resource_id: str | None = Field(default=None, min_length=1, max_length=128)
