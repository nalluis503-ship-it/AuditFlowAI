"""create traceable tabular runs and input lineage

Revision ID: 20260712_0004
Revises: 20260712_0003
Create Date: 2026-07-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260712_0004"
down_revision: str | None = "20260712_0003"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "tabular_runs",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=512), nullable=False),
        sa.Column("output_name", sa.String(length=512), nullable=False),
        sa.Column("plan_json", sa.Text(), nullable=False),
        sa.Column("plan_hash", sa.String(length=64), nullable=False),
        sa.Column("output_source_id", sa.String(length=64), nullable=False),
        sa.Column("job_id", sa.String(length=64), nullable=True),
        sa.Column("engine", sa.String(length=128), nullable=True),
        sa.Column("idempotency_key", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "idempotency_key",
            name="uq_tabular_runs_idempotency_key",
        ),
        sa.UniqueConstraint(
            "output_source_id",
            name="uq_tabular_runs_output_source_id",
        ),
    )
    op.create_index(
        "ix_tabular_runs_created_at",
        "tabular_runs",
        ["created_at"],
        unique=False,
    )
    op.create_index(
        "ix_tabular_runs_job_id",
        "tabular_runs",
        ["job_id"],
        unique=False,
    )
    op.create_index(
        "ix_tabular_runs_output_source_id",
        "tabular_runs",
        ["output_source_id"],
        unique=False,
    )

    op.create_table(
        "tabular_run_inputs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("run_id", sa.String(length=64), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("alias", sa.String(length=64), nullable=False),
        sa.Column("source_id", sa.String(length=64), nullable=False),
        sa.Column("sheet_name", sa.String(length=512), nullable=False),
        sa.Column("source_name", sa.String(length=512), nullable=False),
        sa.Column("source_sha256", sa.String(length=64), nullable=False),
        sa.Column("source_size_bytes", sa.Integer(), nullable=False),
        sa.Column("profile_version", sa.String(length=64), nullable=False),
        sa.Column("profile_engine", sa.String(length=128), nullable=False),
        sa.Column("header_row_number", sa.Integer(), nullable=True),
        sa.Column("columns_json", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(
            ["run_id"],
            ["tabular_runs.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "run_id",
            "position",
            name="uq_tabular_run_inputs_position",
        ),
        sa.UniqueConstraint(
            "run_id",
            "alias",
            name="uq_tabular_run_inputs_alias",
        ),
    )
    op.create_index(
        "ix_tabular_run_inputs_run_id",
        "tabular_run_inputs",
        ["run_id"],
        unique=False,
    )
    op.create_index(
        "ix_tabular_run_inputs_source_id",
        "tabular_run_inputs",
        ["source_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_tabular_run_inputs_source_id",
        table_name="tabular_run_inputs",
    )
    op.drop_index(
        "ix_tabular_run_inputs_run_id",
        table_name="tabular_run_inputs",
    )
    op.drop_table("tabular_run_inputs")
    op.drop_index(
        "ix_tabular_runs_output_source_id",
        table_name="tabular_runs",
    )
    op.drop_index("ix_tabular_runs_job_id", table_name="tabular_runs")
    op.drop_index("ix_tabular_runs_created_at", table_name="tabular_runs")
    op.drop_table("tabular_runs")
