from collections.abc import Mapping
from typing import Any


class AuditFlowError(Exception):
    """Base application error safe to expose through the API."""

    def __init__(
        self,
        message: str,
        *,
        code: str,
        status_code: int = 400,
        details: Mapping[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = dict(details or {})


class ResourceNotFoundError(AuditFlowError):
    def __init__(self, resource: str, resource_id: str) -> None:
        super().__init__(
            f"{resource} was not found.",
            code="resource_not_found",
            status_code=404,
            details={
                "resource": resource,
                "resource_id": resource_id,
            },
        )


class InvalidSourceError(AuditFlowError):
    def __init__(
        self,
        message: str,
        *,
        code: str = "invalid_source",
        status_code: int = 422,
        details: Mapping[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message,
            code=code,
            status_code=status_code,
            details=details,
        )
