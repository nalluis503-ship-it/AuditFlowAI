from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func, select
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.domain.models import (
    SourceProfile,
    SourceRecord,
    SourceStatus,
)
from backend.app.infrastructure.database import Base, Database


class SourceRow(Base):
    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    original_name: Mapped[str] = mapped_column(String(512))
    extension: Mapped[str] = mapped_column(String(32))
    media_type: Mapped[str | None] = mapped_column(String(255))
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    sha256: Mapped[str | None] = mapped_column(String(64))
    stored_path: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), index=True)
    stored_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    error_code: Mapped[str | None] = mapped_column(String(128))
    error_message: Mapped[str | None] = mapped_column(Text)
    profile_json: Mapped[str | None] = mapped_column(Text)


def _to_record(row: SourceRow) -> SourceRecord:
    profile = (
        SourceProfile.model_validate_json(row.profile_json)
        if row.profile_json
        else None
    )
    return SourceRecord(
        id=row.id,
        original_name=row.original_name,
        extension=row.extension,
        media_type=row.media_type,
        size_bytes=row.size_bytes,
        sha256=row.sha256,
        stored_path=row.stored_path,
        status=SourceStatus(row.status),
        stored_at=row.stored_at,
        updated_at=row.updated_at,
        error_code=row.error_code,
        error_message=row.error_message,
        profile=profile,
    )


def _apply(row: SourceRow, source: SourceRecord) -> None:
    row.original_name = source.original_name
    row.extension = source.extension
    row.media_type = source.media_type
    row.size_bytes = source.size_bytes
    row.sha256 = source.sha256
    row.stored_path = source.stored_path
    row.status = source.status.value
    row.stored_at = source.stored_at
    row.updated_at = source.updated_at
    row.error_code = source.error_code
    row.error_message = source.error_message
    row.profile_json = (
        source.profile.model_dump_json() if source.profile is not None else None
    )


class SqlAlchemySourceRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    def create(self, source: SourceRecord) -> None:
        row = SourceRow(id=source.id)
        _apply(row, source)
        with self._database.session() as session:
            session.add(row)

    def update(self, source: SourceRecord) -> None:
        with self._database.session() as session:
            row = session.get(SourceRow, source.id)
            if row is None:
                raise KeyError(source.id)
            _apply(row, source)

    def get(self, source_id: str) -> SourceRecord | None:
        with self._database.session() as session:
            row = session.get(SourceRow, source_id)
            return _to_record(row) if row is not None else None

    def list(self, *, limit: int, offset: int) -> list[SourceRecord]:
        statement = (
            select(SourceRow)
            .order_by(SourceRow.stored_at.desc())
            .limit(limit)
            .offset(offset)
        )
        with self._database.session() as session:
            rows = session.scalars(statement).all()
            return [_to_record(row) for row in rows]

    def count(self) -> int:
        with self._database.session() as session:
            return int(session.scalar(select(func.count()).select_from(SourceRow)) or 0)

    def delete(self, source_id: str) -> None:
        with self._database.session() as session:
            row = session.get(SourceRow, source_id)
            if row is not None:
                session.delete(row)
