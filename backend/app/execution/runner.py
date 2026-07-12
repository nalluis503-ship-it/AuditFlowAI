import logging
import threading
from datetime import UTC, datetime, timedelta
from typing import Any

from backend.app.application.cancellation import OperationCancelled
from backend.app.core.config import Settings
from backend.app.domain.job_repositories import JobRepository
from backend.app.execution.contracts import (
    JobExecutionContext,
    PermanentJobError,
    RetryableJobError,
)
from backend.app.execution.registry import JobExecutorRegistry

logger = logging.getLogger(__name__)


class JobRunner:
    def __init__(
        self,
        *,
        repository: JobRepository,
        executors: JobExecutorRegistry,
        settings: Settings,
        worker_id: str,
    ) -> None:
        self._repository = repository
        self._executors = executors
        self._settings = settings
        self._worker_id = worker_id

    def run_once(self) -> bool:
        now = datetime.now(UTC)
        job = self._repository.claim_next(
            worker_id=self._worker_id,
            supported_types=self._executors.supported_types,
            now=now,
            lease_expires_at=now + timedelta(seconds=self._settings.job_lease_seconds),
        )
        if job is None:
            return False

        executor = self._executors.resolve(job.job_type)
        heartbeat_stop = threading.Event()
        heartbeat_thread = threading.Thread(
            target=self._heartbeat_loop,
            args=(job.id, heartbeat_stop),
            name=f"auditflow-heartbeat-{job.id[:8]}",
            daemon=True,
        )
        heartbeat_thread.start()

        try:
            context = JobExecutionContext(
                job_id=job.id,
                report_progress_callback=lambda percent, stage, message: (
                    self._report_progress(job.id, percent, stage, message)
                ),
                cancellation_check=lambda: self._raise_if_cancelled(job.id),
            )
            context.raise_if_cancelled()
            result = executor.execute(context, job.payload)
            context.raise_if_cancelled()
            self._complete(job.id, result)
        except OperationCancelled:
            self._repository.mark_canceled(
                job.id,
                worker_id=self._worker_id,
                now=datetime.now(UTC),
            )
        except PermanentJobError as exc:
            self._fail(
                job.id,
                code=exc.code,
                message=exc.message,
                retryable=False,
            )
        except RetryableJobError as exc:
            self._fail(
                job.id,
                code=exc.code,
                message=exc.message,
                retryable=True,
            )
        except Exception as exc:
            logger.exception(
                "job_execution_failed job_id=%s job_type=%s",
                job.id,
                job.job_type,
            )
            self._fail(
                job.id,
                code="unexpected_job_error",
                message=str(exc),
                retryable=True,
            )
        finally:
            heartbeat_stop.set()
            heartbeat_thread.join(
                timeout=max(1.0, self._settings.job_heartbeat_seconds * 2)
            )

        return True

    def _heartbeat_loop(self, job_id: str, stop_event: threading.Event) -> None:
        while not stop_event.wait(self._settings.job_heartbeat_seconds):
            now = datetime.now(UTC)
            renewed = self._repository.heartbeat(
                job_id,
                worker_id=self._worker_id,
                now=now,
                lease_expires_at=now
                + timedelta(seconds=self._settings.job_lease_seconds),
            )
            if not renewed:
                return

    def _report_progress(
        self,
        job_id: str,
        percent: float,
        stage: str | None,
        message: str | None,
    ) -> None:
        bounded = min(100.0, max(0.0, float(percent)))
        now = datetime.now(UTC)
        updated = self._repository.update_progress(
            job_id,
            worker_id=self._worker_id,
            percent=bounded,
            stage=stage,
            message=message,
            now=now,
            lease_expires_at=now + timedelta(seconds=self._settings.job_lease_seconds),
        )
        if not updated:
            raise OperationCancelled("The job lease was lost.")

    def _raise_if_cancelled(self, job_id: str) -> None:
        if self._repository.is_cancel_requested(
            job_id,
            worker_id=self._worker_id,
        ):
            raise OperationCancelled("The job was canceled.")

    def _complete(self, job_id: str, result: dict[str, Any]) -> None:
        completed = self._repository.complete(
            job_id,
            worker_id=self._worker_id,
            result=result,
            now=datetime.now(UTC),
        )
        if completed is None:
            raise OperationCancelled("The job lease was lost before completion.")

    def _fail(
        self,
        job_id: str,
        *,
        code: str,
        message: str,
        retryable: bool,
    ) -> None:
        now = datetime.now(UTC)
        current = self._repository.get(job_id)
        attempt = current.attempt_count if current is not None else 1
        delay = self._settings.job_retry_base_seconds
        for _ in range(max(0, attempt - 1)):
            if delay >= self._settings.job_retry_max_seconds:
                break
            delay = min(delay * 2, self._settings.job_retry_max_seconds)
        self._repository.fail(
            job_id,
            worker_id=self._worker_id,
            error_code=code,
            error_message=message,
            retryable=retryable,
            now=now,
            retry_at=now + timedelta(seconds=delay),
        )
