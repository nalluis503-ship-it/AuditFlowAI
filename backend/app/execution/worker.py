import logging
import threading
import time
from datetime import UTC, datetime
from uuid import uuid4

from backend.app.core.config import Settings
from backend.app.domain.job_repositories import JobRepository
from backend.app.execution.runner import JobRunner

logger = logging.getLogger(__name__)


class LocalJobWorker:
    def __init__(
        self,
        *,
        repository: JobRepository,
        runner: JobRunner,
        settings: Settings,
        worker_id: str | None = None,
    ) -> None:
        self._repository = repository
        self._runner = runner
        self._settings = settings
        self.worker_id = worker_id or f"local-{uuid4().hex}"
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    @property
    def is_running(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    def start(self) -> None:
        if not self._settings.job_worker_enabled or self.is_running:
            return

        recovered = self._repository.recover_expired(now=datetime.now(UTC))
        if recovered:
            logger.warning("recovered_expired_jobs count=%s", recovered)

        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._run_loop,
            name="auditflow-local-job-worker",
            daemon=True,
        )
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        thread = self._thread
        if thread is None:
            return

        thread.join(timeout=self._settings.job_shutdown_timeout_seconds)
        if thread.is_alive():
            logger.warning(
                "job_worker_shutdown_timeout worker_id=%s",
                self.worker_id,
            )
            return
        self._thread = None

    def run_once(self) -> bool:
        return self._runner.run_once()

    def _run_loop(self) -> None:
        logger.info("job_worker_started worker_id=%s", self.worker_id)
        next_recovery = time.monotonic()
        while not self._stop_event.is_set():
            try:
                now_monotonic = time.monotonic()
                if now_monotonic >= next_recovery:
                    recovered = self._repository.recover_expired(now=datetime.now(UTC))
                    if recovered:
                        logger.warning(
                            "recovered_expired_jobs count=%s",
                            recovered,
                        )
                    next_recovery = (
                        now_monotonic + self._settings.job_recovery_interval_seconds
                    )

                executed = self._runner.run_once()
                if not executed:
                    self._stop_event.wait(self._settings.job_poll_interval_seconds)
            except Exception:
                logger.exception(
                    "job_worker_loop_error worker_id=%s",
                    self.worker_id,
                )
                self._stop_event.wait(self._settings.job_poll_interval_seconds)
        logger.info("job_worker_stopped worker_id=%s", self.worker_id)
