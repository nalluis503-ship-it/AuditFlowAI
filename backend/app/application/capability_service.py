from enum import StrEnum

from pydantic import BaseModel


class CapabilityStatus(StrEnum):
    AVAILABLE = "available"


class ExecutionMode(StrEnum):
    REQUEST_BOUND = "request_bound"
    DURABLE_BACKGROUND = "durable_background"
    HYBRID = "hybrid"


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
        return [
            Capability(
                id="source.ingest",
                name="Ingest tabular source",
                description=(
                    "Streams CSV, XLSX, and Parquet files to durable storage "
                    "while calculating SHA-256, then schedules profiling."
                ),
                status=CapabilityStatus.AVAILABLE,
                inputs=["csv", "xlsx", "parquet"],
                outputs=["source_record", "job_record"],
                engines=["filesystem", "sqlite"],
                supports_large_data=True,
                execution_mode=ExecutionMode.HYBRID,
                limitations=[
                    "The HTTP upload itself is not yet chunk-resumable.",
                    "Profiling is durable after the original file is stored.",
                ],
            ),
            Capability(
                id="source.profile",
                name="Profile tabular source",
                description=(
                    "Calculates structure, nulls, duplicate rows, types, "
                    "samples, and header candidates in a durable job."
                ),
                status=CapabilityStatus.AVAILABLE,
                inputs=["source_record"],
                outputs=["source_profile", "job_events"],
                engines=["duckdb", "openpyxl"],
                supports_large_data=True,
                execution_mode=ExecutionMode.DURABLE_BACKGROUND,
                limitations=[
                    "Progress is stage-based while an engine scans a file.",
                    "XLSX cardinality per column is not calculated yet.",
                ],
            ),
            Capability(
                id="source.reprofile",
                name="Reprofile with explicit headers",
                description=(
                    "Recalculates a source profile after the auditor confirms "
                    "the header row, using a durable job."
                ),
                status=CapabilityStatus.AVAILABLE,
                inputs=["source_record", "header_rows"],
                outputs=["source_profile", "job_events"],
                engines=["duckdb", "openpyxl"],
                supports_large_data=True,
                execution_mode=ExecutionMode.DURABLE_BACKGROUND,
                limitations=["Cancellation is cooperative between engine stages."],
            ),
            Capability(
                id="source.catalog",
                name="Source catalog",
                description=(
                    "Lists and retrieves persisted source metadata and profiles "
                    "after application restarts."
                ),
                status=CapabilityStatus.AVAILABLE,
                inputs=[],
                outputs=["source_records"],
                engines=["sqlite"],
                supports_large_data=True,
                execution_mode=ExecutionMode.REQUEST_BOUND,
                limitations=[],
            ),
            Capability(
                id="job.control",
                name="Durable job control",
                description=(
                    "Persists queued work, progress, events, cancellation, retries, "
                    "leases, and recovery after process interruption."
                ),
                status=CapabilityStatus.AVAILABLE,
                inputs=["registered_job_type", "payload"],
                outputs=["job_record", "job_events"],
                engines=["sqlite", "local_worker"],
                supports_large_data=True,
                execution_mode=ExecutionMode.DURABLE_BACKGROUND,
                limitations=[
                    "This checkpoint runs one local worker thread per API process.",
                    "Distributed workers will require an external queue backend.",
                ],
            ),
        ]
