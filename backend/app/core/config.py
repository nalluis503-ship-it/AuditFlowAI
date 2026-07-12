from functools import lru_cache
from pathlib import Path

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_prefix="AUDITFLOW_",
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "AuditFlow AI API"
    app_version: str = "0.11.0"
    environment: str = "development"

    storage_root: Path = BACKEND_ROOT / "storage"
    max_upload_bytes: int = Field(default=5 * 1024 * 1024 * 1024, ge=1)
    upload_chunk_bytes: int = Field(default=8 * 1024 * 1024, ge=64 * 1024)
    header_scan_rows: int = Field(default=50, ge=5, le=500)
    profile_sample_values: int = Field(default=5, ge=0, le=25)
    duckdb_memory_limit: str = "1GB"
    duckdb_threads: int = Field(default=4, ge=1, le=64)
    xlsx_max_uncompressed_bytes: int = Field(
        default=20 * 1024 * 1024 * 1024,
        ge=1,
    )
    xlsx_max_compression_ratio: float = Field(default=1000.0, ge=1.0)

    sqlite_busy_timeout_seconds: int = Field(default=30, ge=1, le=300)
    job_worker_enabled: bool = True
    job_poll_interval_seconds: float = Field(default=0.5, ge=0.05, le=60)
    job_lease_seconds: int = Field(default=300, ge=10, le=86400)
    job_heartbeat_seconds: float = Field(default=30.0, ge=1.0, le=3600)
    job_shutdown_timeout_seconds: float = Field(default=30.0, ge=1.0, le=3600)
    job_default_max_attempts: int = Field(default=3, ge=1, le=100)
    job_max_attempts: int = Field(default=10, ge=1, le=1000)
    job_retry_base_seconds: int = Field(default=5, ge=1, le=86400)
    job_retry_max_seconds: int = Field(default=3600, ge=1, le=604800)
    job_recovery_interval_seconds: float = Field(default=60.0, ge=1.0, le=3600)

    @model_validator(mode="after")
    def validate_job_timing(self) -> "Settings":
        if self.job_heartbeat_seconds >= self.job_lease_seconds:
            raise ValueError(
                "job_heartbeat_seconds must be lower than job_lease_seconds."
            )
        if self.job_default_max_attempts > self.job_max_attempts:
            raise ValueError("job_default_max_attempts cannot exceed job_max_attempts.")
        if self.job_retry_base_seconds > self.job_retry_max_seconds:
            raise ValueError(
                "job_retry_base_seconds cannot exceed job_retry_max_seconds."
            )
        return self

    @property
    def source_storage(self) -> Path:
        return self.storage_root / "sources"

    @property
    def profile_storage(self) -> Path:
        return self.storage_root / "profiles"

    @property
    def work_storage(self) -> Path:
        return self.storage_root / "work"

    @property
    def database_path(self) -> Path:
        return self.storage_root / "auditflow.db"

    @property
    def database_url(self) -> str:
        return f"sqlite:///{self.database_path.as_posix()}"

    def prepare_directories(self) -> None:
        for directory in (
            self.storage_root,
            self.source_storage,
            self.profile_storage,
            self.work_storage,
        ):
            directory.mkdir(parents=True, exist_ok=True)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
