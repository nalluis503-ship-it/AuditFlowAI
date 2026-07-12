from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    and_,
    func,
    or_,
    select,
    update,
)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.domain.job_models import JobEvent, JobRecord, JobStatus
from backend.app.infrastructure.database import Base, Database


class JobRow(Base):
    __tablename__ = "jobs"
    __table_args__ = (
        Index(
            "ix_jobs_claim",
            "status",
            "available_at",
            "priority",
            "created_at",
        ),
        Index(
            "ix_jobs_resource_active",
            "resource_type",
            "resource_id",
            "status",
        ),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    job_type: Mapped[str] = mapped_column(String(128), index=True)
    payload_json: Mapped[str] = mapped_column(Text)
    resource_type: Mapped[str | None] = mapped_column(String(64))
    resource_id: Mapped[str | None] = mapped_column(String(128))
    status: Mapped[str] = mapped_column(String(32), index=True)
    priority: Mapped[int] = mapped_column(Integer, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    lease_owner: Mapped[str | None] = mapped_column(String(128))
    lease_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancellation_requested_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    progress_percent: Mapped[float] = mapped_column(Float, default=0.0)
    progress_stage: Mapped[str | None] = mapped_column(String(128))
    progress_message: Mapped[str | None] = mapped_column(Text)
    result_json: Mapped[str | None] = mapped_column(Text)
    error_code: Mapped[str | None] = mapped_column(String(128))
    error_message: Mapped[str | None] = mapped_column(Text)
    idempotency_key: Mapped[str | None] = mapped_column(
        String(255),
        unique=True,
    )


class JobEventRow(Base):
    __tablename__ = "job_events"
    __table_args__ = (Index("ix_job_events_job_occurred", "job_id", "occurred_at"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("jobs.id", ondelete="CASCADE"),
        index=True,
    )
    event_type: Mapped[str] = mapped_column(String(64))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    resource_type: Mapped[str | None] = mapped_column(String(64))
    resource_id: Mapped[str | None] = mapped_column(String(128))


def _decode_json(payload: str | None) -> dict[str, Any] | None:
    if payload is None:
        return None
    value = json.loads(payload)
    return value if isinstance(value, dict) else {}


def _to_record(row: JobRow) -> JobRecord:
    return JobRecord(
        id=row.id,
        job_type=row.job_type,
        payload=_decode_json(row.payload_json) or {},
        resource_type=row.resource_type,
        resource_id=row.resource_id,
        status=JobStatus(row.status),
        priority=row.priority,
        max_attempts=row.max_attempts,
        attempt_count=row.attempt_count,
        available_at=row.available_at,
        lease_owner=row.lease_owner,
        lease_expires_at=row.lease_expires_at,
        cancellation_requested_at=row.cancellation_requested_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
        started_at=row.started_at,
        finished_at=row.finished_at,
        progress_percent=row.progress_percent,
        progress_stage=row.progress_stage,
        progress_message=row.progress_message,
        result=_decode_json(row.result_json),
        error_code=row.error_code,
        error_message=row.error_message,
        idempotency_key=row.idempotency_key,
    )


def _to_event(row: JobEventRow) -> JobEvent:
    return JobEvent(
        id=row.id,
        job_id=row.job_id,
        event_type=row.event_type,
        occurred_at=row.occurred_at,
        payload=_decode_json(row.payload_json) or {},
        resource_type=row.resource_type,
        resource_id=row.resource_id,
    )


def _apply(row: JobRow, job: JobRecord) -> None:
    row.job_type = job.job_type
    row.payload_json = json.dumps(job.payload, separators=(",", ":"))
    row.resource_type = job.resource_type
    row.resource_id = job.resource_id
    row.status = job.status.value
    row.priority = job.priority
    row.max_attempts = job.max_attempts
    row.attempt_count = job.attempt_count
    row.available_at = job.available_at
    row.lease_owner = job.lease_owner
    row.lease_expires_at = job.lease_expires_at
    row.cancellation_requested_at = job.cancellation_requested_at
    row.created_at = job.created_at
    row.updated_at = job.updated_at
    row.started_at = job.started_at
    row.finished_at = job.finished_at
    row.progress_percent = job.progress_percent
    row.progress_stage = job.progress_stage
    row.progress_message = job.progress_message
    row.result_json = (
        json.dumps(job.result, separators=(",", ":"))
        if job.result is not None
        else None
    )
    row.error_code = job.error_code
    row.error_message = job.error_message
    row.idempotency_key = job.idempotency_key


def _event(
    job_id: str,
    event_type: str,
    occurred_at: datetime,
    payload: dict[str, Any] | None = None,
    *,
    resource_type: str | None = None,
    resource_id: str | None = None,
) -> JobEventRow:
    return JobEventRow(
        job_id=job_id,
        event_type=event_type,
        occurred_at=occurred_at,
        payload_json=json.dumps(payload or {}, separators=(",", ":")),
        resource_type=resource_type,
        resource_id=resource_id,
    )


class SqlAlchemyJobRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    def create(self, job: JobRecord) -> JobRecord:
        row = JobRow(id=job.id)
        _apply(row, job)
        try:
            with self._database.session() as session:
                session.add(row)
                session.flush()
                session.add(
                    _event(
                        job.id,
                        "job.queued",
                        job.created_at,
                        {"job_type": job.job_type},
                        resource_type=job.resource_type,
                        resource_id=job.resource_id,
                    )
                )
            return job
        except IntegrityError:
            if job.idempotency_key is None:
                raise
            existing = self.get_by_idempotency_key(job.idempotency_key)
            if existing is None:
                raise
            return existing

    def get(self, job_id: str) -> JobRecord | None:
        with self._database.session() as session:
            row = session.get(JobRow, job_id)
            return _to_record(row) if row is not None else None

    def get_by_idempotency_key(self, idempotency_key: str) -> JobRecord | None:
        with self._database.session() as session:
            row = session.scalar(
                select(JobRow).where(JobRow.idempotency_key == idempotency_key)
            )
            return _to_record(row) if row is not None else None

    def list(
        self,
        *,
        limit: int,
        offset: int,
        status: JobStatus | None = None,
        job_type: str | None = None,
    ) -> list[JobRecord]:
        statement = select(JobRow)
        if status is not None:
            statement = statement.where(JobRow.status == status.value)
        if job_type is not None:
            statement = statement.where(JobRow.job_type == job_type)
        statement = (
            statement.order_by(JobRow.created_at.desc()).limit(limit).offset(offset)
        )
        with self._database.session() as session:
            rows = session.scalars(statement).all()
            return [_to_record(row) for row in rows]

    def count(
        self,
        *,
        status: JobStatus | None = None,
        job_type: str | None = None,
    ) -> int:
        statement = select(func.count()).select_from(JobRow)
        if status is not None:
            statement = statement.where(JobRow.status == status.value)
        if job_type is not None:
            statement = statement.where(JobRow.job_type == job_type)
        with self._database.session() as session:
            return int(session.scalar(statement) or 0)

    def list_events(self, job_id: str, *, limit: int) -> list[JobEvent]:
        statement = (
            select(JobEventRow)
            .where(JobEventRow.job_id == job_id)
            .order_by(JobEventRow.id.asc())
            .limit(limit)
        )
        with self._database.session() as session:
            rows = session.scalars(statement).all()
            return [_to_event(row) for row in rows]

    def has_active_for_resource(
        self,
        *,
        resource_type: str,
        resource_id: str,
    ) -> bool:
        statement = (
            select(func.count())
            .select_from(JobRow)
            .where(
                JobRow.resource_type == resource_type,
                JobRow.resource_id == resource_id,
                JobRow.status.in_([JobStatus.QUEUED.value, JobStatus.RUNNING.value]),
            )
        )
        with self._database.session() as session:
            return int(session.scalar(statement) or 0) > 0

    def request_cancel(self, job_id: str, *, now: datetime) -> JobRecord | None:
        with self._database.session() as session:
            row = session.get(JobRow, job_id)
            if row is None:
                return None
            status = JobStatus(row.status)
            if status.is_terminal:
                return _to_record(row)

            row.cancellation_requested_at = now
            row.updated_at = now
            if status == JobStatus.QUEUED:
                row.status = JobStatus.CANCELED.value
                row.finished_at = now
                row.progress_stage = "canceled"
                row.progress_message = "The job was canceled before execution."
                event_type = "job.canceled"
            else:
                event_type = "job.cancel_requested"

            session.add(
                _event(
                    job_id,
                    event_type,
                    now,
                    resource_type=row.resource_type,
                    resource_id=row.resource_id,
                )
            )
            session.flush()
            return _to_record(row)

    def retry(self, job_id: str, *, now: datetime) -> JobRecord | None:
        with self._database.session() as session:
            row = session.get(JobRow, job_id)
            if row is None:
                return None
            status = JobStatus(row.status)
            if status not in {JobStatus.FAILED, JobStatus.CANCELED}:
                return _to_record(row)

            row.status = JobStatus.QUEUED.value
            row.available_at = now
            row.updated_at = now
            row.finished_at = None
            row.lease_owner = None
            row.lease_expires_at = None
            row.cancellation_requested_at = None
            row.error_code = None
            row.error_message = None
            row.progress_percent = 0.0
            row.progress_stage = "queued"
            row.progress_message = "The job was queued for a manual retry."
            if row.attempt_count >= row.max_attempts:
                row.max_attempts = row.attempt_count + 1
            session.add(
                _event(
                    job_id,
                    "job.retried",
                    now,
                    resource_type=row.resource_type,
                    resource_id=row.resource_id,
                )
            )
            session.flush()
            return _to_record(row)

    def claim_next(
        self,
        *,
        worker_id: str,
        supported_types: frozenset[str],
        now: datetime,
        lease_expires_at: datetime,
    ) -> JobRecord | None:
        if not supported_types:
            return None

        candidate = (
            select(JobRow.id)
            .where(
                JobRow.status == JobStatus.QUEUED.value,
                JobRow.available_at <= now,
                JobRow.cancellation_requested_at.is_(None),
                JobRow.job_type.in_(supported_types),
            )
            .order_by(
                JobRow.priority.desc(),
                JobRow.created_at.asc(),
            )
            .limit(1)
            .scalar_subquery()
        )
        statement = (
            update(JobRow)
            .where(
                JobRow.id == candidate,
                JobRow.status == JobStatus.QUEUED.value,
            )
            .values(
                status=JobStatus.RUNNING.value,
                attempt_count=JobRow.attempt_count + 1,
                lease_owner=worker_id,
                lease_expires_at=lease_expires_at,
                started_at=func.coalesce(JobRow.started_at, now),
                updated_at=now,
                progress_stage="running",
                progress_message="A worker claimed the job.",
            )
            .returning(JobRow)
        )
        with self._database.session() as session:
            row = session.scalars(statement).first()
            if row is None:
                return None
            session.add(
                _event(
                    row.id,
                    "job.started",
                    now,
                    {
                        "worker_id": worker_id,
                        "attempt": row.attempt_count,
                    },
                    resource_type=row.resource_type,
                    resource_id=row.resource_id,
                )
            )
            session.flush()
            return _to_record(row)

    def heartbeat(
        self,
        job_id: str,
        *,
        worker_id: str,
        now: datetime,
        lease_expires_at: datetime,
    ) -> bool:
        statement = (
            update(JobRow)
            .where(
                JobRow.id == job_id,
                JobRow.status == JobStatus.RUNNING.value,
                JobRow.lease_owner == worker_id,
            )
            .values(
                updated_at=now,
                lease_expires_at=lease_expires_at,
            )
        )
        with self._database.session() as session:
            return (session.execute(statement).rowcount or 0) == 1

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
    ) -> bool:
        values: dict[str, Any] = {
            "progress_percent": percent,
            "updated_at": now,
            "lease_expires_at": lease_expires_at,
        }
        if stage is not None:
            values["progress_stage"] = stage
        if message is not None:
            values["progress_message"] = message

        statement = (
            update(JobRow)
            .where(
                JobRow.id == job_id,
                JobRow.status == JobStatus.RUNNING.value,
                JobRow.lease_owner == worker_id,
            )
            .values(**values)
            .returning(JobRow.resource_type, JobRow.resource_id)
        )
        with self._database.session() as session:
            resource = session.execute(statement).first()
            if resource is None:
                return False
            session.add(
                _event(
                    job_id,
                    "job.progress",
                    now,
                    {
                        "percent": percent,
                        "stage": stage,
                        "message": message,
                    },
                    resource_type=resource.resource_type,
                    resource_id=resource.resource_id,
                )
            )
            return True

    def complete(
        self,
        job_id: str,
        *,
        worker_id: str,
        result: dict,
        now: datetime,
    ) -> JobRecord | None:
        statement = (
            update(JobRow)
            .where(
                JobRow.id == job_id,
                JobRow.status == JobStatus.RUNNING.value,
                JobRow.lease_owner == worker_id,
                JobRow.cancellation_requested_at.is_(None),
            )
            .values(
                status=JobStatus.SUCCEEDED.value,
                result_json=json.dumps(result, separators=(",", ":")),
                error_code=None,
                error_message=None,
                progress_percent=100.0,
                progress_stage="completed",
                progress_message="The job completed successfully.",
                lease_owner=None,
                lease_expires_at=None,
                updated_at=now,
                finished_at=now,
            )
            .returning(JobRow)
        )
        with self._database.session() as session:
            row = session.scalars(statement).first()
            if row is None:
                return None
            session.add(
                _event(
                    job_id,
                    "job.succeeded",
                    now,
                    {"result_keys": sorted(result)},
                    resource_type=row.resource_type,
                    resource_id=row.resource_id,
                )
            )
            session.flush()
            return _to_record(row)

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
    ) -> JobRecord | None:
        with self._database.session() as session:
            row = session.get(JobRow, job_id)
            if (
                row is None
                or row.status != JobStatus.RUNNING.value
                or row.lease_owner != worker_id
            ):
                return None

            canceled = row.cancellation_requested_at is not None
            can_retry = (
                retryable and not canceled and row.attempt_count < row.max_attempts
            )

            row.error_code = error_code
            row.error_message = error_message
            row.updated_at = now
            row.lease_owner = None
            row.lease_expires_at = None

            if canceled:
                row.status = JobStatus.CANCELED.value
                row.finished_at = now
                row.progress_stage = "canceled"
                row.progress_message = "The job stopped after cancellation."
                event_type = "job.canceled"
                payload = {"error_code": error_code}
            elif can_retry:
                row.status = JobStatus.QUEUED.value
                row.available_at = retry_at
                row.progress_stage = "retry_wait"
                row.progress_message = "The job will be retried automatically."
                event_type = "job.retry_scheduled"
                payload = {
                    "error_code": error_code,
                    "retry_at": retry_at.isoformat(),
                    "attempt": row.attempt_count,
                }
            else:
                row.status = JobStatus.FAILED.value
                row.finished_at = now
                row.progress_stage = "failed"
                row.progress_message = "The job failed."
                event_type = "job.failed"
                payload = {
                    "error_code": error_code,
                    "attempt": row.attempt_count,
                }

            session.add(
                _event(
                    job_id,
                    event_type,
                    now,
                    payload,
                    resource_type=row.resource_type,
                    resource_id=row.resource_id,
                )
            )
            session.flush()
            return _to_record(row)

    def mark_canceled(
        self,
        job_id: str,
        *,
        worker_id: str,
        now: datetime,
    ) -> JobRecord | None:
        statement = (
            update(JobRow)
            .where(
                JobRow.id == job_id,
                JobRow.status == JobStatus.RUNNING.value,
                JobRow.lease_owner == worker_id,
            )
            .values(
                status=JobStatus.CANCELED.value,
                lease_owner=None,
                lease_expires_at=None,
                updated_at=now,
                finished_at=now,
                progress_stage="canceled",
                progress_message="The job was canceled.",
            )
            .returning(JobRow)
        )
        with self._database.session() as session:
            row = session.scalars(statement).first()
            if row is None:
                return None
            session.add(
                _event(
                    job_id,
                    "job.canceled",
                    now,
                    resource_type=row.resource_type,
                    resource_id=row.resource_id,
                )
            )
            session.flush()
            return _to_record(row)

    def is_cancel_requested(self, job_id: str, *, worker_id: str) -> bool:
        with self._database.session() as session:
            row = session.scalar(
                select(JobRow).where(
                    JobRow.id == job_id,
                    JobRow.status == JobStatus.RUNNING.value,
                    JobRow.lease_owner == worker_id,
                )
            )
            if row is None:
                return True
            return row.cancellation_requested_at is not None

    def recover_expired(self, *, now: datetime) -> int:
        condition = and_(
            JobRow.status == JobStatus.RUNNING.value,
            or_(
                JobRow.lease_expires_at.is_(None),
                JobRow.lease_expires_at <= now,
            ),
        )
        recovered = 0
        with self._database.session() as session:
            rows = session.scalars(select(JobRow).where(condition)).all()
            for row in rows:
                row.lease_owner = None
                row.lease_expires_at = None
                row.updated_at = now
                if row.cancellation_requested_at is not None:
                    row.status = JobStatus.CANCELED.value
                    row.finished_at = now
                    row.progress_stage = "canceled"
                    row.progress_message = "The interrupted job was canceled."
                    event_type = "job.canceled"
                elif row.attempt_count < row.max_attempts:
                    row.status = JobStatus.QUEUED.value
                    row.available_at = now
                    row.progress_stage = "recovered"
                    row.progress_message = "The interrupted job was recovered."
                    event_type = "job.recovered"
                else:
                    row.status = JobStatus.FAILED.value
                    row.finished_at = now
                    row.error_code = "job_lease_expired"
                    row.error_message = (
                        "The worker lease expired after all attempts were used."
                    )
                    row.progress_stage = "failed"
                    row.progress_message = "The interrupted job could not be retried."
                    event_type = "job.failed"
                session.add(
                    _event(
                        row.id,
                        event_type,
                        now,
                        resource_type=row.resource_type,
                        resource_id=row.resource_id,
                    )
                )
                recovered += 1
        return recovered
