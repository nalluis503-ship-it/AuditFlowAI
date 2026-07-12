from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from backend.app.core.config import Settings
from backend.app.core.errors import AuditFlowError, ResourceNotFoundError
from backend.app.domain.job_models import JobEvent, JobRecord, JobStatus
from backend.app.domain.job_repositories import JobRepository
from backend.app.execution.registry import JobExecutorRegistry


class JobConflictError(AuditFlowError):
    def __init__(self, message: str, *, job_id: str) -> None:
        super().__init__(
            message,
            code="job_conflict",
            status_code=409,
            details={"job_id": job_id},
        )


class UnsupportedJobTypeError(AuditFlowError):
    def __init__(self, job_type: str, supported_types: frozenset[str]) -> None:
        super().__init__(
            "The requested job type does not have a registered executor.",
            code="unsupported_job_type",
            status_code=422,
            details={
                "job_type": job_type,
                "supported_types": sorted(supported_types),
            },
        )


class JobService:
    def __init__(
        self,
        *,
        repository: JobRepository,
        executors: JobExecutorRegistry,
        settings: Settings,
    ) -> None:
        self._repository = repository
        self._executors = executors
        self._settings = settings

    def create(
        self,
        *,
        job_type: str,
        payload: dict[str, Any],
        resource_type: str | None = None,
        resource_id: str | None = None,
        priority: int = 0,
        max_attempts: int | None = None,
        idempotency_key: str | None = None,
    ) -> JobRecord:
        if not self._executors.supports(job_type):
            raise UnsupportedJobTypeError(job_type, self._executors.supported_types)

        if (resource_type is None) != (resource_id is None):
            raise AuditFlowError(
                "resource_type and resource_id must be provided together.",
                code="invalid_job_resource_reference",
                status_code=422,
            )

        if idempotency_key:
            existing = self._repository.get_by_idempotency_key(idempotency_key)
            if existing is not None:
                return existing

        attempts = max_attempts or self._settings.job_default_max_attempts
        if attempts > self._settings.job_max_attempts:
            raise AuditFlowError(
                "The requested retry limit exceeds the configured maximum.",
                code="invalid_job_attempt_limit",
                status_code=422,
                details={
                    "requested": attempts,
                    "maximum": self._settings.job_max_attempts,
                },
            )

        now = datetime.now(UTC)
        job = JobRecord(
            id=uuid4().hex,
            job_type=job_type,
            payload=payload,
            resource_type=resource_type,
            resource_id=resource_id,
            status=JobStatus.QUEUED,
            priority=priority,
            max_attempts=attempts,
            attempt_count=0,
            available_at=now,
            created_at=now,
            updated_at=now,
            progress_percent=0.0,
            progress_stage="queued",
            progress_message="The job is waiting for a worker.",
            idempotency_key=idempotency_key,
        )
        return self._repository.create(job)

    def get(self, job_id: str) -> JobRecord:
        job = self._repository.get(job_id)
        if job is None:
            raise ResourceNotFoundError("job", job_id)
        return job

    def list(
        self,
        *,
        limit: int,
        offset: int,
        status: JobStatus | None,
        job_type: str | None,
    ) -> tuple[list[JobRecord], int]:
        return (
            self._repository.list(
                limit=limit,
                offset=offset,
                status=status,
                job_type=job_type,
            ),
            self._repository.count(status=status, job_type=job_type),
        )

    def ensure_resource_is_idle(
        self,
        *,
        resource_type: str,
        resource_id: str,
    ) -> None:
        if self._repository.has_active_for_resource(
            resource_type=resource_type,
            resource_id=resource_id,
        ):
            raise AuditFlowError(
                "The resource has an active durable job.",
                code="resource_job_active",
                status_code=409,
                details={
                    "resource_type": resource_type,
                    "resource_id": resource_id,
                },
            )

    def list_events(self, job_id: str, *, limit: int) -> list[JobEvent]:
        self.get(job_id)
        return self._repository.list_events(job_id, limit=limit)

    def cancel(self, job_id: str) -> JobRecord:
        existing = self.get(job_id)
        if existing.status.is_terminal:
            return existing

        updated = self._repository.request_cancel(
            job_id,
            now=datetime.now(UTC),
        )
        if updated is None:
            raise ResourceNotFoundError("job", job_id)
        return updated

    def retry(self, job_id: str) -> JobRecord:
        existing = self.get(job_id)
        if existing.status not in {JobStatus.FAILED, JobStatus.CANCELED}:
            raise JobConflictError(
                "Only failed or canceled jobs can be retried manually.",
                job_id=job_id,
            )
        if existing.attempt_count >= self._settings.job_max_attempts:
            raise JobConflictError(
                "The configured manual retry limit has been reached.",
                job_id=job_id,
            )

        updated = self._repository.retry(
            job_id,
            now=datetime.now(UTC),
        )
        if updated is None:
            raise ResourceNotFoundError("job", job_id)
        if updated.status != JobStatus.QUEUED:
            raise JobConflictError(
                "The job changed state before it could be retried.",
                job_id=job_id,
            )
        return updated
