from datetime import datetime

from pydantic import BaseModel, Field


class ColumnProfile(BaseModel):
    name: str
    position: int = Field(ge=1)
    null_count: int = Field(ge=0)
    non_null_count: int = Field(ge=0)


class SheetProfile(BaseModel):
    name: str
    header_row_number: int | None = Field(default=None, ge=1)
    row_count: int = Field(ge=0)
    column_count: int = Field(ge=0)
    duplicate_row_count: int = Field(ge=0)
    columns: list[ColumnProfile]


class SourceProfile(BaseModel):
    id: str
    original_name: str
    extension: str
    media_type: str | None
    size_bytes: int = Field(ge=0)
    sha256: str = Field(min_length=64, max_length=64)
    stored_at: datetime
    sheets: list[SheetProfile]
