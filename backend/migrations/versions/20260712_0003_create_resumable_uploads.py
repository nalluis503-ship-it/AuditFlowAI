"""create resumable upload sessions and parts

Revision ID: 20260712_0003
Revises: 20260712_0002
Create Date: 2026-07-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260712_0003"
down_revision: str | None = "20260712_0002"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "upload_sessions",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("source_id", sa.String(length=64), nullable=False),
        sa.Column("original_name", sa.String(length=512), nullable=False),
        sa.Column("extension", sa.String(length=32), nullable=False),
        sa.Column("media_type", sa.String(length=255), nullable=True),
        sa.Column("expected_size_bytes", sa.Integer(), nullable=False),
        sa.Column("part_size_bytes", sa.Integer(), nullable=False),
        sa.Column("expected_part_count", sa.Integer(), nullable=False),
        sa.Column("expected_sha256", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_code", sa.String(length=128), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("received_part_count", sa.Integer(), nullable=False),
        sa.Column("received_size_bytes", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_id", name="uq_upload_sessions_source_id"),
    )
    op.create_index(
        "ix_upload_sessions_status",
        "upload_sessions",
        ["status"],
        unique=False,
    )
    op.create_index(
        "ix_upload_sessions_status_expires",
        "upload_sessions",
        ["status", "expires_at"],
        unique=False,
    )

    op.create_table(
        "upload_parts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.String(length=64), nullable=False),
        sa.Column("part_number", sa.Integer(), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("stored_path", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["session_id"],
            ["upload_sessions.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "session_id",
            "part_number",
            name="uq_upload_parts_session_part",
        ),
    )
    op.create_index(
        "ix_upload_parts_session_part",
        "upload_parts",
        ["session_id", "part_number"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_upload_parts_session_part", table_name="upload_parts")
    op.drop_table("upload_parts")
    op.drop_index(
        "ix_upload_sessions_status_expires",
        table_name="upload_sessions",
    )
    op.drop_index("ix_upload_sessions_status", table_name="upload_sessions")
    op.drop_table("upload_sessions")
