from enum import StrEnum

from pydantic import BaseModel


class CapabilityStatus(StrEnum):
    AVAILABLE = "available"


class ExecutionMode(StrEnum):
    REQUEST_BOUND = "request_bound"


class Capability(BaseModel):
    id: str
    name: str
    description: str
    status: CapabilityStatus
    inputs: list[str]
    outputs: list[str]
    engines: list[str]
    supports_large_data: bool
    execution_mode: ExecutionMode
    limitations: list[str]


class CapabilityService:
    """Registry containing only capabilities with real executors."""

    def list_available(self) -> list[Capability]:
        request_bound_limit = (
            "Execution currently remains attached to the HTTP request; durable "
            "background jobs and resumable uploads are a later capability."
        )
        return [
            Capability(
                id="source.ingest",
                name="Ingest tabular source",
                description=(
                    "Streams CSV, XLSX, and Parquet files to durable "
                    "storage while calculating SHA-256."
                ),
                status=CapabilityStatus.AVAILABLE,
                inputs=["csv", "xlsx", "parquet"],
                outputs=["source_record"],
                engines=["filesystem"],
                supports_large_data=True,
                execution_mode=ExecutionMode.REQUEST_BOUND,
                limitations=[request_bound_limit],
            ),
            Capability(
                id="source.profile",
                name="Profile tabular source",
                description=(
                    "Calculates structure, nulls, duplicate rows, types, "
                    "samples, and header candidates."
                ),
                status=CapabilityStatus.AVAILABLE,
                inputs=["source_record"],
                outputs=["source_profile"],
                engines=["duckdb", "openpyxl"],
                supports_large_data=True,
                execution_mode=ExecutionMode.REQUEST_BOUND,
                limitations=[
                    request_bound_limit,
                    "XLSX cardinality per column is not calculated in this checkpoint.",
                ],
            ),
            Capability(
                id="source.reprofile",
                name="Reprofile with explicit headers",
                description=(
                    "Recalculates a source profile after the auditor "
                    "confirms the header row."
                ),
                status=CapabilityStatus.AVAILABLE,
                inputs=["source_record", "header_rows"],
                outputs=["source_profile"],
                engines=["duckdb", "openpyxl"],
                supports_large_data=True,
                execution_mode=ExecutionMode.REQUEST_BOUND,
                limitations=[request_bound_limit],
            ),
            Capability(
                id="source.catalog",
                name="Source catalog",
                description=(
                    "Lists and retrieves persisted source metadata and "
                    "profiles after application restarts."
                ),
                status=CapabilityStatus.AVAILABLE,
                inputs=[],
                outputs=["source_records"],
                engines=["sqlite"],
                supports_large_data=True,
                execution_mode=ExecutionMode.REQUEST_BOUND,
                limitations=[],
            ),
        ]
