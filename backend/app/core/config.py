from functools import lru_cache
from pathlib import Path

from pydantic import Field
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
    app_version: str = "0.10.0"
    environment: str = "development"

    storage_root: Path = BACKEND_ROOT / "storage"
    max_upload_bytes: int = Field(
        default=5 * 1024 * 1024 * 1024,
        ge=1,
    )
    upload_chunk_bytes: int = Field(
        default=8 * 1024 * 1024,
        ge=64 * 1024,
    )
    header_scan_rows: int = Field(default=50, ge=5, le=500)
    profile_sample_values: int = Field(default=5, ge=0, le=25)
    duckdb_memory_limit: str = "1GB"
    duckdb_threads: int = Field(default=4, ge=1, le=64)
    xlsx_max_uncompressed_bytes: int = Field(
        default=20 * 1024 * 1024 * 1024,
        ge=1,
    )
    xlsx_max_compression_ratio: float = Field(default=1000.0, ge=1.0)

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
