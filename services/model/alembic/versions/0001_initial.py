"""Create the initial HydroCycle evidence and simulation schema.

Revision ID: 0001_initial
Revises: None
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "test_runs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("operator", sa.String(length=200), nullable=True),
        sa.Column("sample_id", sa.String(length=200), nullable=True),
        sa.Column("provenance_json", sa.JSON(), nullable=False),
        sa.Column("measurements_json", sa.JSON(), nullable=False),
        sa.Column("calibrations_json", sa.JSON(), nullable=False),
        sa.Column("comparisons_json", sa.JSON(), nullable=False),
        sa.Column("review_notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.CheckConstraint(
            "status IN ('draft', 'needs_review', 'valid', 'invalid')",
            name="ck_test_runs_status",
        ),
    )

    op.create_table(
        "simulations",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("input_json", sa.JSON(), nullable=False),
        sa.Column("result_json", sa.JSON(), nullable=False),
        sa.Column("diagnostics_json", sa.JSON(), nullable=False),
        sa.Column("reproducibility_json", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )

    op.create_table(
        "test_run_simulations",
        sa.Column(
            "test_run_id",
            sa.String(length=36),
            sa.ForeignKey("test_runs.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "simulation_id",
            sa.String(length=64),
            sa.ForeignKey("simulations.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "linked_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_index(
        "ix_test_run_simulations_simulation_id",
        "test_run_simulations",
        ["simulation_id"],
    )

    op.create_table(
        "attachments",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "test_run_id",
            sa.String(length=36),
            sa.ForeignKey("test_runs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("canonical_name", sa.String(length=128), nullable=False),
        sa.Column("storage_name", sa.String(length=128), nullable=False, unique=True),
        sa.Column("mime_type", sa.String(length=128), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("locally_owned", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("import_warnings_json", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.CheckConstraint("size_bytes >= 0", name="ck_attachments_size_nonnegative"),
    )
    op.create_index(
        "ix_attachments_test_run_sha256",
        "attachments",
        ["test_run_id", "sha256"],
    )
    op.create_index("ix_attachments_test_run_id", "attachments", ["test_run_id"])

    op.create_table(
        "evidence_records",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "test_run_id",
            sa.String(length=36),
            sa.ForeignKey("test_runs.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "simulation_id",
            sa.String(length=64),
            sa.ForeignKey("simulations.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("kind", sa.String(length=24), nullable=False),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.CheckConstraint(
            "kind IN ('measured', 'literature', 'user_assumption')",
            name="ck_evidence_records_kind",
        ),
        sa.CheckConstraint(
            "test_run_id IS NOT NULL OR simulation_id IS NOT NULL",
            name="ck_evidence_records_owner",
        ),
    )
    op.create_index("ix_evidence_records_test_run_id", "evidence_records", ["test_run_id"])
    op.create_index("ix_evidence_records_simulation_id", "evidence_records", ["simulation_id"])


def downgrade() -> None:
    op.drop_index("ix_evidence_records_simulation_id", table_name="evidence_records")
    op.drop_index("ix_evidence_records_test_run_id", table_name="evidence_records")
    op.drop_table("evidence_records")
    op.drop_index("ix_attachments_test_run_id", table_name="attachments")
    op.drop_index("ix_attachments_test_run_sha256", table_name="attachments")
    op.drop_table("attachments")
    op.drop_index(
        "ix_test_run_simulations_simulation_id",
        table_name="test_run_simulations",
    )
    op.drop_table("test_run_simulations")
    op.drop_table("simulations")
    op.drop_table("test_runs")
