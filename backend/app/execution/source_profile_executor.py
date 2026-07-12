from typing import Any

from pydantic import BaseModel, Field, ValidationError

from backend.app.application.source_service import SourceService
from backend.app.core.errors import AuditFlowError
from backend.app.domain.models import ProfileOptions
from backend.app.execution.contracts import (
    JobExecutionContext,
    PermanentJobError,
)


class SourceProfilePayload(BaseModel):
    source_id: str = Field(min_length=1, max_length=64)
    header_rows: dict[str, int] = Field(default_factory=dict)


class SourceProfileExecutor:
    job_type = "source.profile"

    def __init__(self, source_service: SourceService) -> None:
        self._source_service = source_service

    def execute(
        self,
        context: JobExecutionContext,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        try:
            request = SourceProfilePayload.model_validate(payload)
        except ValidationError as exc:
            raise PermanentJobError(
                "The source profiling job payload is invalid.",
                code="invalid_source_profile_payload",
            ) from exc

        try:
            profile = self._source_service.profile_sync(
                request.source_id,
                options=ProfileOptions(header_rows=request.header_rows),
                report_progress=context.report_progress,
                check_cancelled=context.raise_if_cancelled,
            )
        except AuditFlowError as exc:
            raise PermanentJobError(exc.message, code=exc.code) from exc

        return {
            "source_id": profile.id,
            "status": profile.status.value,
            "profile_version": profile.profile_version,
            "profile_engine": profile.profile_engine,
            "sheet_count": len(profile.sheets),
        }
