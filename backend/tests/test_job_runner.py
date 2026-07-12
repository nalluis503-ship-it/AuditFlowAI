import threading
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from backend.app.application.job_service import JobService
from backend.app.core.config import Settings
from backend.app.domain.job_models import JobStatus
from backend.app.execution.contracts import (
    JobExecutionContext,
    RetryableJobError,
)
from backend.app.execution.registry import JobExecutorRegistry
from backend.app.execution.runner import JobRunner
from backend.app.infrastructure.database import Database
from backend.app.infrastructure.job_repository import SqlAlchemyJobRepository
from backend.app.infrastructure.migrations import upgrade_database


class FlakyExecutor:
    job_type = "test.flaky"

    def __init__(self) -> None:
        self.calls = 0

    def execute(
        self,
        context: JobExecutionContext,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        self.calls += 1
        context.report_progress(50, "halfway", "Halfway")
        if self.calls == 1:
            raise RetryableJobError("Temporary failure", code="temporary")
        return {"echo": payload["value"]}


class AlwaysRetryableExecutor:
    job_type = "test.always_retryable"

    def execute(
        self,
        context: JobExecutionContext,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        raise RetryableJobError("Still temporary", code="temporary")


class CancelAwareExecutor:
    job_type = "test.cancel"

    def __init__(self, started: threading.Event, release: threading.Event) -> None:
        self.started = started
        self.release = release

    def execute(
        self,
        context: JobExecutionContext,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        self.started.set()
        self.release.wait(timeout=5)
        context.raise_if_cancelled()
        return payload


def _runtime(tmp_path: Path, executor):
    settings = Settings(
        environment="test",
        storage_root=tmp_path / "storage",
        job_worker_enabled=False,
        job_default_max_attempts=1,
        job_max_attempts=5,
        job_retry_base_seconds=1,
        job_retry_max_seconds=2,
        job_heartbeat_seconds=1.0,
        job_lease_seconds=30,
    )
    upgrade_database(settings)
    repository = SqlAlchemyJobRepository(Database(settings))
    registry = JobExecutorRegistry([executor])
    service = JobService(
        repository=repository,
        executors=registry,
        settings=settings,
    )
    runner = JobRunner(
        repository=repository,
        executors=registry,
        settings=settings,
        worker_id="test-worker",
    )
    return settings, repository, service, runner


def test_failed_job_can_be_retried_manually(tmp_path):
    executor = FlakyExecutor()
    _, _, service, runner = _runtime(tmp_path, executor)
    job = service.create(job_type=executor.job_type, payload={"value": 7})

    assert runner.run_once() is True
    failed = service.get(job.id)
    assert failed.status == JobStatus.FAILED
    assert failed.attempt_count == 1
    assert failed.error_code == "temporary"

    retried = service.retry(job.id)
    assert retried.status == JobStatus.QUEUED
    assert retried.max_attempts == 2

    assert runner.run_once() is True
    succeeded = service.get(job.id)
    assert succeeded.status == JobStatus.SUCCEEDED
    assert succeeded.attempt_count == 2
    assert succeeded.result == {"echo": 7}


def test_running_job_observes_cooperative_cancellation(tmp_path):
    started = threading.Event()
    release = threading.Event()
    executor = CancelAwareExecutor(started, release)
    _, _, service, runner = _runtime(tmp_path, executor)
    job = service.create(job_type=executor.job_type, payload={"value": 1})

    thread = threading.Thread(target=runner.run_once)
    thread.start()
    assert started.wait(timeout=5)

    requested = service.cancel(job.id)
    assert requested.cancel_requested is True
    release.set()
    thread.join(timeout=5)

    canceled = service.get(job.id)
    assert canceled.status == JobStatus.CANCELED
    assert canceled.finished_at is not None


def test_expired_worker_lease_is_recovered(tmp_path):
    executor = FlakyExecutor()
    _, repository, service, _ = _runtime(tmp_path, executor)
    job = service.create(
        job_type=executor.job_type,
        payload={"value": 3},
        max_attempts=2,
    )
    now = datetime.now(UTC)

    claimed = repository.claim_next(
        worker_id="dead-worker",
        supported_types=frozenset({executor.job_type}),
        now=now,
        lease_expires_at=now - timedelta(seconds=1),
    )
    assert claimed is not None
    assert claimed.status == JobStatus.RUNNING

    assert repository.recover_expired(now=now + timedelta(seconds=1)) == 1
    recovered = service.get(job.id)
    assert recovered.status == JobStatus.QUEUED
    assert recovered.lease_owner is None
    assert recovered.progress_stage == "recovered"


def test_atomic_claim_prevents_double_execution(tmp_path):
    executor = FlakyExecutor()
    _, repository, service, _ = _runtime(tmp_path, executor)
    job = service.create(job_type=executor.job_type, payload={"value": 9})
    now = datetime.now(UTC)

    first = repository.claim_next(
        worker_id="worker-a",
        supported_types=frozenset({executor.job_type}),
        now=now,
        lease_expires_at=now + timedelta(seconds=30),
    )
    second = repository.claim_next(
        worker_id="worker-b",
        supported_types=frozenset({executor.job_type}),
        now=now,
        lease_expires_at=now + timedelta(seconds=30),
    )

    assert first is not None
    assert first.id == job.id
    assert second is None


def test_manual_retries_respect_global_attempt_limit(tmp_path):
    executor = AlwaysRetryableExecutor()
    settings, _, service, runner = _runtime(tmp_path, executor)
    assert settings.job_max_attempts == 5
    job = service.create(
        job_type=executor.job_type,
        payload={},
        max_attempts=1,
    )

    for expected_attempt in range(1, settings.job_max_attempts + 1):
        assert runner.run_once() is True
        failed = service.get(job.id)
        assert failed.status == JobStatus.FAILED
        assert failed.attempt_count == expected_attempt
        if expected_attempt < settings.job_max_attempts:
            assert service.retry(job.id).status == JobStatus.QUEUED

    from backend.app.application.job_service import JobConflictError

    try:
        service.retry(job.id)
    except JobConflictError as exc:
        assert exc.code == "job_conflict"
    else:
        raise AssertionError("Retry should have been rejected at the global limit.")
