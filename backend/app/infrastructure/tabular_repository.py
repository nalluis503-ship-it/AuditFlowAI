from __future__ import annotations

import json
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    select,
)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.domain.tabular_models import (
    TabularColumnSnapshot,
    TabularPlan,
    TabularRunInputRecord,
    TabularRunRecord,
)
from backend.app.infrastructure.database import Base, Database


class TabularRunRow(Base):
    __tablename__ = "tabular_runs"
    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_tabular_runs_idempotency_key"),
        UniqueConstraint("output_source_id", name="uq_tabular_runs_output_source_id"),
        Index("ix_tabular_runs_created_at", "created_at"),
        Index("ix_tabular_runs_job_id", "job_id"),
        Index("ix_tabular_runs_output_source_id", "output_source_id"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    output_name: Mapped[str] = mapped_column(String(512), nullable=False)
    plan_json: Mapped[str] = mapped_column(Text, nullable=False)
    plan_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    output_source_id: Mapped[str] = mapped_column(String(64), nullable=False)
    job_id: Mapped[str | None] = mapped_column(String(64))
    engine: Mapped[str | None] = mapped_column(String(128))
    idempotency_key: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


class TabularRunInputRow(Base):
    __tablename__ = "tabular_run_inputs"
    __table_args__ = (
        UniqueConstraint(
            "run_id",
            "position",
            name="uq_tabular_run_inputs_position",
        ),
        UniqueConstraint(
            "run_id",
            "alias",
            name="uq_tabular_run_inputs_alias",
        ),
        Index("ix_tabular_run_inputs_source_id", "source_id"),
        Index("ix_tabular_run_inputs_run_id", "run_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("tabular_runs.id", ondelete="CASCADE"),
        nullable=False,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    alias: Mapped[str] = mapped_column(String(64), nullable=False)
    source_id: Mapped[str] = mapped_column(String(64), nullable=False)
    sheet_name: Mapped[str] = mapped_column(String(512), nullable=False)
    source_name: Mapped[str] = mapped_column(String(512), nullable=False)
    source_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    source_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    profile_version: Mapped[str] = mapped_column(String(64), nullable=False)
    profile_engine: Mapped[str] = mapped_column(String(128), nullable=False)
    header_row_number: Mapped[int | None] = mapped_column(Integer)
    columns_json: Mapped[str] = mapped_column(Text, nullable=False)


def _input_to_record(row: TabularRunInputRow) -> TabularRunInputRecord:
    return TabularRunInputRecord(
        position=row.position,
        alias=row.alias,
        source_id=row.source_id,
        sheet_name=row.sheet_name,
        source_name=row.source_name,
        source_sha256=row.source_sha256,
        source_size_bytes=row.source_size_bytes,
        profile_version=row.profile_version,
        profile_engine=row.profile_engine,
        header_row_number=row.header_row_number,
        columns=[
            TabularColumnSnapshot.model_validate(item)
            for item in json.loads(row.columns_json)
        ],
    )


def _to_record(
    row: TabularRunRow,
    inputs: list[TabularRunInputRow],
) -> TabularRunRecord:
    return TabularRunRecord(
        id=row.id,
        name=row.name,
        output_name=row.output_name,
        plan=TabularPlan.model_validate_json(row.plan_json),
        plan_hash=row.plan_hash,
        inputs=[_input_to_record(item) for item in inputs],
        output_source_id=row.output_source_id,
        job_id=row.job_id,
        engine=row.engine,
        idempotency_key=row.idempotency_key,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _apply(row: TabularRunRow, run: TabularRunRecord) -> None:
    row.name = run.name
    row.output_name = run.output_name
    row.plan_json = run.plan.model_dump_json()
    row.plan_hash = run.plan_hash
    row.output_source_id = run.output_source_id
    row.job_id = run.job_id
    row.engine = run.engine
    row.idempotency_key = run.idempotency_key
    row.created_at = run.created_at
    row.updated_at = run.updated_at


class SqlAlchemyTabularRunRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    def create(self, run: TabularRunRecord) -> TabularRunRecord:
        row = TabularRunRow(id=run.id)
        _apply(row, run)
        input_rows = [
            TabularRunInputRow(
                run_id=run.id,
                position=item.position,
                alias=item.alias,
                source_id=item.source_id,
                sheet_name=item.sheet_name,
                source_name=item.source_name,
                source_sha256=item.source_sha256,
                source_size_bytes=item.source_size_bytes,
                profile_version=item.profile_version,
                profile_engine=item.profile_engine,
                header_row_number=item.header_row_number,
                columns_json=json.dumps(
                    [column.model_dump(mode="json") for column in item.columns],
                    ensure_ascii=False,
                    separators=(",", ":"),
                ),
            )
            for item in run.inputs
        ]
        try:
            with self._database.session() as session:
                session.add(row)
                session.flush()
                session.add_all(input_rows)
        except IntegrityError:
            if run.idempotency_key:
                existing = self.get_by_idempotency_key(run.idempotency_key)
                if existing is not None:
                    return existing
            raise
        return run

    def update(self, run: TabularRunRecord) -> TabularRunRecord:
        with self._database.session() as session:
            row = session.get(TabularRunRow, run.id)
            if row is None:
                raise KeyError(run.id)
            _apply(row, run)
        return run

    def get(self, run_id: str) -> TabularRunRecord | None:
        with self._database.session() as session:
            row = session.get(TabularRunRow, run_id)
            if row is None:
                return None
            inputs = session.scalars(
                select(TabularRunInputRow)
                .where(TabularRunInputRow.run_id == run_id)
                .order_by(TabularRunInputRow.position)
            ).all()
            return _to_record(row, list(inputs))

    def get_by_idempotency_key(self, key: str) -> TabularRunRecord | None:
        with self._database.session() as session:
            row = session.scalar(
                select(TabularRunRow).where(TabularRunRow.idempotency_key == key)
            )
            if row is None:
                return None
            inputs = session.scalars(
                select(TabularRunInputRow)
                .where(TabularRunInputRow.run_id == row.id)
                .order_by(TabularRunInputRow.position)
            ).all()
            return _to_record(row, list(inputs))

    def list(self, *, limit: int, offset: int) -> list[TabularRunRecord]:
        with self._database.session() as session:
            rows = session.scalars(
                select(TabularRunRow)
                .order_by(TabularRunRow.created_at.desc())
                .limit(limit)
                .offset(offset)
            ).all()
            if not rows:
                return []
            run_ids = [row.id for row in rows]
            input_rows = session.scalars(
                select(TabularRunInputRow)
                .where(TabularRunInputRow.run_id.in_(run_ids))
                .order_by(
                    TabularRunInputRow.run_id,
                    TabularRunInputRow.position,
                )
            ).all()
            grouped: dict[str, list[TabularRunInputRow]] = {
                run_id: [] for run_id in run_ids
            }
            for item in input_rows:
                grouped[item.run_id].append(item)
            return [_to_record(row, grouped[row.id]) for row in rows]

    def count(self) -> int:
        with self._database.session() as session:
            return int(
                session.scalar(select(func.count()).select_from(TabularRunRow)) or 0
            )

    def list_job_ids_for_source(self, source_id: str) -> list[str]:
        statement = (
            select(TabularRunRow.job_id)
            .join(
                TabularRunInputRow,
                TabularRunInputRow.run_id == TabularRunRow.id,
            )
            .where(
                TabularRunInputRow.source_id == source_id,
                TabularRunRow.job_id.is_not(None),
            )
            .union(
                select(TabularRunRow.job_id).where(
                    TabularRunRow.output_source_id == source_id,
                    TabularRunRow.job_id.is_not(None),
                )
            )
        )
        with self._database.session() as session:
            return [str(value) for value in session.scalars(statement).all()]
