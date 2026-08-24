"""SQLAlchemy persistence models for HydroCycle's local evidence store.

The database deliberately stores the scientific request and result documents as
JSON.  The Pydantic contract remains the schema authority for those documents,
while these tables provide stable identities, provenance, and relationships.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utc_now() -> datetime:
    """Return a timezone-aware timestamp suitable for persisted audit data."""

    return datetime.now(UTC)


class Base(DeclarativeBase):
    """Declarative base shared by runtime initialization and Alembic."""


test_run_simulations = Table(
    "test_run_simulations",
    Base.metadata,
    Column(
        "test_run_id",
        String(36),
        ForeignKey("test_runs.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "simulation_id",
        String(64),
        ForeignKey("simulations.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column("linked_at", DateTime(timezone=True), nullable=False, default=utc_now),
    Index("ix_test_run_simulations_simulation_id", "simulation_id"),
)


class TestRunRecord(Base):
    """Operator-facing measurement run and its review state."""

    __tablename__ = "test_runs"
    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'needs_review', 'valid', 'invalid')",
            name="ck_test_runs_status",
        ),
        Index("ix_test_runs_status_updated_at", "status", "updated_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="draft")
    operator: Mapped[str | None] = mapped_column(String(200), nullable=True)
    sample_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    provenance_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    measurements_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    calibrations_json: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, nullable=False, default=list
    )
    comparisons_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    simulations: Mapped[list[SimulationRecord]] = relationship(
        secondary=test_run_simulations,
        back_populates="test_runs",
        passive_deletes=True,
    )
    attachments: Mapped[list[AttachmentRecord]] = relationship(
        back_populates="test_run", cascade="all, delete-orphan", passive_deletes=True
    )
    evidence_records: Mapped[list[EvidenceRecord]] = relationship(
        back_populates="test_run", cascade="all, delete-orphan", passive_deletes=True
    )


class SimulationRecord(Base):
    """A reproducible scientific evaluation, optionally linked to a test run."""

    __tablename__ = "simulations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    input_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    result_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    diagnostics_json: Mapped[list[Any] | dict[str, Any]] = mapped_column(
        JSON, nullable=False, default=list
    )
    reproducibility_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )

    test_runs: Mapped[list[TestRunRecord]] = relationship(
        secondary=test_run_simulations,
        back_populates="simulations",
        passive_deletes=True,
    )
    evidence_records: Mapped[list[EvidenceRecord]] = relationship(
        back_populates="simulation", cascade="all, delete-orphan", passive_deletes=True
    )


class AttachmentRecord(Base):
    """Metadata for a bounded import saved within HydroCycle-owned storage."""

    __tablename__ = "attachments"
    __table_args__ = (
        CheckConstraint("size_bytes >= 0", name="ck_attachments_size_nonnegative"),
        Index("ix_attachments_test_run_sha256", "test_run_id", "sha256"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    test_run_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("test_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    canonical_name: Mapped[str] = mapped_column(String(128), nullable=False)
    storage_name: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    mime_type: Mapped[str] = mapped_column(String(128), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    locally_owned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    import_warnings_json: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )

    test_run: Mapped[TestRunRecord] = relationship(back_populates="attachments")


class EvidenceRecord(Base):
    """Measured, literature, or user-assumption evidence retained verbatim."""

    __tablename__ = "evidence_records"
    __table_args__ = (
        CheckConstraint(
            "kind IN ('measured', 'literature', 'user_assumption')",
            name="ck_evidence_records_kind",
        ),
        CheckConstraint(
            "test_run_id IS NOT NULL OR simulation_id IS NOT NULL",
            name="ck_evidence_records_owner",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    test_run_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("test_runs.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    simulation_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("simulations.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    kind: Mapped[str] = mapped_column(String(24), nullable=False)
    payload_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )

    test_run: Mapped[TestRunRecord | None] = relationship(back_populates="evidence_records")
    simulation: Mapped[SimulationRecord | None] = relationship(back_populates="evidence_records")


__all__ = [
    "AttachmentRecord",
    "Base",
    "EvidenceRecord",
    "SimulationRecord",
    "TestRunRecord",
    "test_run_simulations",
    "utc_now",
]
