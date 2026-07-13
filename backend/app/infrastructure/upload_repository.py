from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    delete,
    func,
    select,
    update,
)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.domain.upload_models import (
    UploadPartRecord,
    UploadSessionRecord,
    UploadSessionStatus,
)
from backend.app.infrastructure.database import Base, Database


class UploadSessionRow(Base):
    __tablename__ = "upload_sessions"
    __table_args__ = (
        Index("ix_upload_sessions_status_expires", "status", "expires_at"),
        UniqueConstraint("source_id", name="uq_upload_sessions_source_id"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    source_id: Mapped[str] = mapped_column(String(64), nullable=False)
    original_name: Mapped[str] = mapped_column(String(512), nullable=False)
    extension: Mapped[str] = mapped_column(String(32), nullable=False)
    media_type: Mapped[str | None] = mapped_column(String(255))
    expected_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    part_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    expected_part_count: Mapped[int] = mapped_column(Integer, nullable=False)
    expected_sha256: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(32), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_code: Mapped[str | None] = mapped_column(String(128))
    error_message: Mapped[str | None] = mapped_column(Text)
    received_part_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    received_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class UploadPartRow(Base):
    __tablename__ = "upload_parts"
    __table_args__ = (
        UniqueConstraint(
            "session_id",
            "part_number",
            name="uq_upload_parts_session_part",
        ),
        Index("ix_upload_parts_session_part", "session_id", "part_number"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("upload_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )
    part_number: Mapped[int] = mapped_column(Integer, nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    stored_path: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


def _to_session(row: UploadSessionRow) -> UploadSessionRecord:
    return UploadSessionRecord(
        id=row.id,
        source_id=row.source_id,
        original_name=row.original_name,
        extension=row.extension,
        media_type=row.media_type,
        expected_size_bytes=row.expected_size_bytes,
        part_size_bytes=row.part_size_bytes,
        expected_part_count=row.expected_part_count,
        expected_sha256=row.expected_sha256,
        status=UploadSessionStatus(row.status),
        created_at=row.created_at,
        updated_at=row.updated_at,
        expires_at=row.expires_at,
        completed_at=row.completed_at,
        error_code=row.error_code,
        error_message=row.error_message,
        received_part_count=row.received_part_count,
        received_size_bytes=row.received_size_bytes,
    )


def _to_part(row: UploadPartRow) -> UploadPartRecord:
    return UploadPartRecord(
        session_id=row.session_id,
        part_number=row.part_number,
        size_bytes=row.size_bytes,
        sha256=row.sha256,
        stored_path=row.stored_path,
        created_at=row.created_at,
    )


class SqlAlchemyUploadRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    def create_session(
        self,
        session_record: UploadSessionRecord,
    ) -> UploadSessionRecord:
        row = UploadSessionRow(
            id=session_record.id,
            source_id=session_record.source_id,
            original_name=session_record.original_name,
            extension=session_record.extension,
            media_type=session_record.media_type,
            expected_size_bytes=session_record.expected_size_bytes,
            part_size_bytes=session_record.part_size_bytes,
            expected_part_count=session_record.expected_part_count,
            expected_sha256=session_record.expected_sha256,
            status=session_record.status.value,
            created_at=session_record.created_at,
            updated_at=session_record.updated_at,
            expires_at=session_record.expires_at,
            completed_at=session_record.completed_at,
            error_code=session_record.error_code,
            error_message=session_record.error_message,
            received_part_count=session_record.received_part_count,
            received_size_bytes=session_record.received_size_bytes,
        )
        with self._database.session() as session:
            session.add(row)
        return session_record

    def get_session(self, session_id: str) -> UploadSessionRecord | None:
        with self._database.session() as session:
            row = session.get(UploadSessionRow, session_id)
            return _to_session(row) if row is not None else None

    def list_parts(self, session_id: str) -> list[UploadPartRecord]:
        statement = (
            select(UploadPartRow)
            .where(UploadPartRow.session_id == session_id)
            .order_by(UploadPartRow.part_number)
        )
        with self._database.session() as session:
            return [_to_part(row) for row in session.scalars(statement).all()]

    def list_parts_page(
        self,
        session_id: str,
        *,
        limit: int,
        offset: int,
    ) -> list[UploadPartRecord]:
        statement = (
            select(UploadPartRow)
            .where(UploadPartRow.session_id == session_id)
            .order_by(UploadPartRow.part_number)
            .limit(limit)
            .offset(offset)
        )
        with self._database.session() as session:
            return [_to_part(row) for row in session.scalars(statement).all()]

    def get_part(
        self,
        session_id: str,
        part_number: int,
    ) -> UploadPartRecord | None:
        statement = select(UploadPartRow).where(
            UploadPartRow.session_id == session_id,
            UploadPartRow.part_number == part_number,
        )
        with self._database.session() as session:
            row = session.scalar(statement)
            return _to_part(row) if row is not None else None

    def add_part(
        self,
        part: UploadPartRecord,
        *,
        expires_at: datetime,
    ) -> UploadPartRecord:
        row = UploadPartRow(
            session_id=part.session_id,
            part_number=part.part_number,
            size_bytes=part.size_bytes,
            sha256=part.sha256,
            stored_path=part.stored_path,
            created_at=part.created_at,
        )
        try:
            with self._database.session() as session:
                session.add(row)
                session.flush()
                count, total = session.execute(
                    select(
                        func.count(UploadPartRow.id),
                        func.coalesce(func.sum(UploadPartRow.size_bytes), 0),
                    ).where(UploadPartRow.session_id == part.session_id)
                ).one()
                session.execute(
                    update(UploadSessionRow)
                    .where(UploadSessionRow.id == part.session_id)
                    .values(
                        received_part_count=int(count),
                        received_size_bytes=int(total),
                        updated_at=part.created_at,
                        expires_at=expires_at,
                        error_code=None,
                        error_message=None,
                    )
                )
            return part
        except IntegrityError:
            existing = self.get_part(part.session_id, part.part_number)
            if existing is None:
                raise
            return existing

    def begin_assembly(
        self,
        session_id: str,
        *,
        now: datetime,
    ) -> UploadSessionRecord | None:
        with self._database.session() as session:
            result = session.execute(
                update(UploadSessionRow)
                .where(
                    UploadSessionRow.id == session_id,
                    UploadSessionRow.status.in_(
                        [
                            UploadSessionStatus.OPEN.value,
                            UploadSessionStatus.FAILED.value,
                        ]
                    ),
                )
                .values(
                    status=UploadSessionStatus.ASSEMBLING.value,
                    updated_at=now,
                    error_code=None,
                    error_message=None,
                )
            )
            if result.rowcount != 1:
                row = session.get(UploadSessionRow, session_id)
                return _to_session(row) if row is not None else None
            row = session.get(UploadSessionRow, session_id)
            return _to_session(row) if row is not None else None

    def mark_completed(
        self,
        session_id: str,
        *,
        now: datetime,
    ) -> UploadSessionRecord | None:
        return self._set_status(
            session_id,
            status=UploadSessionStatus.COMPLETED,
            now=now,
            completed_at=now,
        )

    def mark_failed(
        self,
        session_id: str,
        *,
        error_code: str,
        error_message: str,
        now: datetime,
    ) -> UploadSessionRecord | None:
        return self._set_status(
            session_id,
            status=UploadSessionStatus.FAILED,
            now=now,
            error_code=error_code,
            error_message=error_message,
        )

    def mark_expired(
        self,
        session_id: str,
        *,
        now: datetime,
    ) -> UploadSessionRecord | None:
        return self._set_status(
            session_id,
            status=UploadSessionStatus.EXPIRED,
            now=now,
        )

    def abort(
        self,
        session_id: str,
        *,
        now: datetime,
    ) -> UploadSessionRecord | None:
        return self._set_status(
            session_id,
            status=UploadSessionStatus.ABORTED,
            now=now,
        )

    def delete_session(self, session_id: str) -> None:
        with self._database.session() as session:
            session.execute(
                delete(UploadSessionRow).where(UploadSessionRow.id == session_id)
            )

    def list_expired(
        self,
        *,
        now: datetime,
        limit: int,
    ) -> list[UploadSessionRecord]:
        statement = (
            select(UploadSessionRow)
            .where(
                UploadSessionRow.status.in_(
                    [
                        UploadSessionStatus.OPEN.value,
                        UploadSessionStatus.FAILED.value,
                    ]
                ),
                UploadSessionRow.expires_at <= now,
            )
            .order_by(UploadSessionRow.expires_at)
            .limit(limit)
        )
        with self._database.session() as session:
            return [_to_session(row) for row in session.scalars(statement).all()]

    def count_sessions(
        self,
        *,
        status: UploadSessionStatus | None = None,
    ) -> int:
        statement = select(func.count()).select_from(UploadSessionRow)
        if status is not None:
            statement = statement.where(UploadSessionRow.status == status.value)
        with self._database.session() as session:
            return int(session.scalar(statement) or 0)

    def _set_status(
        self,
        session_id: str,
        *,
        status: UploadSessionStatus,
        now: datetime,
        completed_at: datetime | None = None,
        error_code: str | None = None,
        error_message: str | None = None,
    ) -> UploadSessionRecord | None:
        with self._database.session() as session:
            session.execute(
                update(UploadSessionRow)
                .where(UploadSessionRow.id == session_id)
                .values(
                    status=status.value,
                    updated_at=now,
                    completed_at=completed_at,
                    error_code=error_code,
                    error_message=error_message,
                )
            )
            row = session.get(UploadSessionRow, session_id)
            return _to_session(row) if row is not None else None
