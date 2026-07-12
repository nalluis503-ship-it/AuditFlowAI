from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, Protocol

from backend.app.application.cancellation import OperationCancelled


class JobExecutor(Protocol):
    job_type: str

    def execute(
        self,
        context: "JobExecutionContext",
        payload: dict[str, Any],
    ) -> dict[str, Any]: ...


ProgressCallback = Callable[[float, str | None, str | None], None]
CancellationCheck = Callable[[], None]


@dataclass(slots=True)
class JobExecutionContext:
    job_id: str
    report_progress_callback: ProgressCallback
    cancellation_check: CancellationCheck

    def report_progress(
        self,
        percent: float,
        stage: str | None = None,
        message: str | None = None,
    ) -> None:
        self.report_progress_callback(percent, stage, message)

    def raise_if_cancelled(self) -> None:
        self.cancellation_check()


class PermanentJobError(Exception):
    def __init__(self, message: str, *, code: str = "permanent_job_error") -> None:
        super().__init__(message)
        self.code = code
        self.message = message


class RetryableJobError(Exception):
    def __init__(self, message: str, *, code: str = "retryable_job_error") -> None:
        super().__init__(message)
        self.code = code
        self.message = message


__all__ = [
    "JobExecutionContext",
    "JobExecutor",
    "OperationCancelled",
    "PermanentJobError",
    "RetryableJobError",
]
