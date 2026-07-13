from typing import Any

from pydantic import BaseModel, Field, ValidationError

from backend.app.application.upload_service import UploadSessionService
from backend.app.core.errors import AuditFlowError
from backend.app.execution.contracts import (
    JobExecutionContext,
    PermanentJobError,
    RetryableJobError,
)


class SourceCompleteUploadPayload(BaseModel):
    upload_session_id: str = Field(min_length=1, max_length=64)


class SourceCompleteUploadExecutor:
    job_type = "source.complete_upload"

    def __init__(self, upload_service: UploadSessionService) -> None:
        self._upload_service = upload_service

    def execute(
        self,
        context: JobExecutionContext,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        try:
            request = SourceCompleteUploadPayload.model_validate(payload)
        except ValidationError as exc:
            raise PermanentJobError(
                "The resumable upload job payload is invalid.",
                code="invalid_source_complete_upload_payload",
            ) from exc

        try:
            return self._upload_service.complete_sync(
                request.upload_session_id,
                report_progress=context.report_progress,
                check_cancelled=context.raise_if_cancelled,
            )
        except AuditFlowError as exc:
            if exc.status_code >= 500:
                raise RetryableJobError(exc.message, code=exc.code) from exc
            raise PermanentJobError(exc.message, code=exc.code) from exc
