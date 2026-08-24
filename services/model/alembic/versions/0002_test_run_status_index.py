"""Index operator review queues and establish a tested prior schema revision.

Revision ID: 0002_test_run_status_index
Revises: 0001_initial
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0002_test_run_status_index"
down_revision: str | Sequence[str] | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index(
        "ix_test_runs_status_updated_at",
        "test_runs",
        ["status", "updated_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_test_runs_status_updated_at", table_name="test_runs")
