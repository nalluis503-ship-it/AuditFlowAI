from typing import Any

from pydantic import BaseModel, Field, ValidationError

from backend.app.application.tabular_service import TabularRunService
from backend.app.core.errors import AuditFlowError
from backend.app.execution.contracts import (
    JobExecutionContext,
    PermanentJobError,
    RetryableJobError,
)


class TabularRunPayload(BaseModel):
    run_id: str = Field(min_length=1, max_length=64)


class TabularRunExecutor:
    job_type = "tabular.execute"

    def __init__(self, service: TabularRunService) -> None:
        self._service = service

    def execute(
        self,
        context: JobExecutionContext,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        try:
            request = TabularRunPayload.model_validate(payload)
        except ValidationError as exc:
            raise PermanentJobError(
                "The tabular execution payload is invalid.",
                code="invalid_tabular_run_payload",
            ) from exc

        try:
            result = self._service.execute_sync(
                request.run_id,
                report_progress=context.report_progress,
                check_cancelled=context.raise_if_cancelled,
            )
        except AuditFlowError as exc:
            if exc.status_code >= 500:
                raise RetryableJobError(exc.message, code=exc.code) from exc
            raise PermanentJobError(exc.message, code=exc.code) from exc

        return result.model_dump(mode="json")
