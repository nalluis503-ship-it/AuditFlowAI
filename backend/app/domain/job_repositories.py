from __future__ import annotations

from datetime import datetime
from typing import Protocol

from backend.app.domain.job_models import JobEvent, JobRecord, JobStatus


class JobRepository(Protocol):
    def create(self, job: JobRecord) -> JobRecord: ...

    def get(self, job_id: str) -> JobRecord | None: ...

    def get_by_idempotency_key(self, idempotency_key: str) -> JobRecord | None: ...

    def list(
        self,
        *,
        limit: int,
        offset: int,
        status: JobStatus | None = None,
        job_type: str | None = None,
    ) -> list[JobRecord]: ...

    def count(
        self,
        *,
        status: JobStatus | None = None,
        job_type: str | None = None,
    ) -> int: ...

    def list_events(self, job_id: str, *, limit: int) -> list[JobEvent]: ...

    def has_active_for_resource(
        self,
        *,
        resource_type: str,
        resource_id: str,
    ) -> bool: ...

    def request_cancel(self, job_id: str, *, now: datetime) -> JobRecord | None: ...

    def retry(self, job_id: str, *, now: datetime) -> JobRecord | None: ...

    def claim_next(
        self,
        *,
        worker_id: str,
        supported_types: frozenset[str],
        now: datetime,
        lease_expires_at: datetime,
    ) -> JobRecord | None: ...

    def heartbeat(
        self,
        job_id: str,
        *,
        worker_id: str,
        now: datetime,
        lease_expires_at: datetime,
    ) -> bool: ...

    def update_progress(
        self,
        job_id: str,
        *,
        worker_id: str,
        percent: float,
        stage: str | None,
        message: str | None,
        now: datetime,
        lease_expires_at: datetime,
    ) -> bool: ...

    def complete(
        self,
        job_id: str,
        *,
        worker_id: str,
        result: dict,
        now: datetime,
    ) -> JobRecord | None: ...

    def fail(
        self,
        job_id: str,
        *,
        worker_id: str,
        error_code: str,
        error_message: str,
        retryable: bool,
        now: datetime,
        retry_at: datetime,
    ) -> JobRecord | None: ...

    def mark_canceled(
        self,
        job_id: str,
        *,
        worker_id: str,
        now: datetime,
    ) -> JobRecord | None: ...

    def is_cancel_requested(self, job_id: str, *, worker_id: str) -> bool: ...

    def recover_expired(self, *, now: datetime) -> int: ...
