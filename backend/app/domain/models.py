from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field, computed_field, field_validator


class SourceStatus(StrEnum):
    RECEIVING = "receiving"
    STORED = "stored"
    PROFILING = "profiling"
    READY = "ready"
    FAILED = "failed"


class ProfileCompleteness(StrEnum):
    EXACT = "exact"
    PRELIMINARY = "preliminary"


class HeaderCandidate(BaseModel):
    row_number: int = Field(ge=1)
    confidence: float = Field(ge=0, le=1)
    values: list[str]


class ColumnProfile(BaseModel):
    name: str
    position: int = Field(ge=1)
    data_type: str
    null_count: int = Field(ge=0)
    non_null_count: int = Field(ge=0)
    null_percentage: float = Field(ge=0, le=100)
    distinct_count: int | None = Field(default=None, ge=0)
    sample_values: list[str] = Field(default_factory=list)


class SheetProfile(BaseModel):
    name: str
    header_row_number: int | None = Field(default=None, ge=1)
    header_confidence: float | None = Field(
        default=None,
        ge=0,
        le=1,
    )
    header_candidates: list[HeaderCandidate] = Field(
        default_factory=list,
    )
    row_count: int = Field(ge=0)
    column_count: int = Field(ge=0)
    duplicate_row_count: int = Field(ge=0)
    total_cell_count: int = Field(ge=0)
    null_cell_count: int = Field(ge=0)
    null_percentage: float = Field(ge=0, le=100)
    columns: list[ColumnProfile]


class SourceProfile(BaseModel):
    id: str
    original_name: str
    extension: str
    media_type: str | None
    size_bytes: int = Field(ge=0)
    sha256: str = Field(min_length=64, max_length=64)
    stored_at: datetime
    status: SourceStatus
    profile_version: str
    profile_engine: str
    completeness: ProfileCompleteness
    sheets: list[SheetProfile]


class SourceRecord(BaseModel):
    id: str
    original_name: str
    extension: str
    media_type: str | None
    size_bytes: int = Field(default=0, ge=0)
    sha256: str | None = None
    stored_path: str | None = None
    status: SourceStatus
    stored_at: datetime
    updated_at: datetime
    error_code: str | None = None
    error_message: str | None = None
    profile: SourceProfile | None = None


class ProfileOptions(BaseModel):
    header_rows: dict[str, int] = Field(default_factory=dict)

    @field_validator("header_rows")
    @classmethod
    def validate_header_rows(
        cls,
        value: dict[str, int],
    ) -> dict[str, int]:
        invalid = {
            name: row_number for name, row_number in value.items() if row_number < 1
        }
        if invalid:
            raise ValueError("Header row numbers must be greater than zero.")
        return value

    def header_for(self, sheet_name: str) -> int | None:
        return self.header_rows.get(
            sheet_name,
            self.header_rows.get("*"),
        )


class SourcePreview(BaseModel):
    source_id: str
    sheet_name: str
    columns: list[str]
    rows: list[list[str | None]]
    offset: int = Field(ge=0)
    limit: int = Field(ge=1)
    returned: int = Field(ge=0)
    total_rows: int = Field(ge=0)

    @computed_field
    @property
    def has_more(self) -> bool:
        return self.offset + self.returned < self.total_rows
