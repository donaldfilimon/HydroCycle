"""Typed, validation-first contracts for local test-run evidence.

The ORM intentionally stores JSON documents, but arbitrary JSON is never an API
contract.  These models are the authority for every test-run create, patch,
import, response, and reviewed export operation.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from itertools import pairwise
from math import isfinite
from typing import Literal

from pydantic import (
    AnyHttpUrl,
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

from .schemas import Distribution, EvidenceBasis, ValueWithUncertainty


class TestRunContract(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        populate_by_name=True,
        validate_assignment=True,
        allow_inf_nan=False,
    )


class TestRunStatus(StrEnum):
    DRAFT = "draft"
    NEEDS_REVIEW = "needs_review"
    VALID = "valid"
    INVALID = "invalid"


class EvidenceKind(StrEnum):
    MEASURED = "measured"
    LITERATURE = "literature"
    USER_ASSUMPTION = "user_assumption"


CanonicalSeriesName = Literal[
    "hydrogen_decay.csv",
    "bubble_distribution.csv",
    "pressure_trace.csv",
]


class HydrogenDecayPoint(TestRunContract):
    time_s: float = Field(ge=0.0, le=31_536_000.0)
    total_h2_mg_l: float = Field(alias="total_h2_mg_L", ge=0.0, le=2_000_000.0)
    uncertainty_mg_l: float = Field(alias="uncertainty_mg_L", ge=0.0, le=2_000_000.0)


class BubbleDistributionPoint(TestRunContract):
    diameter_nm: float = Field(gt=0.0, le=1_000_000.0)
    number_per_ml: float = Field(alias="number_per_mL", ge=0.0, le=1.0e16)


class PressureTracePoint(TestRunContract):
    crank_angle_deg: float = Field(ge=-720.0, le=720.0)
    pressure_bar: float = Field(gt=0.0, le=500.0)
    uncertainty_bar: float = Field(ge=0.0, le=500.0)


class MeasuredValue(ValueWithUncertainty):
    """A populated scalar measurement; unlike simulation defaults, provenance is required."""

    value: float
    standard_uncertainty: float = Field(gt=0.0)
    distribution: Literal[
        Distribution.NORMAL,
        Distribution.UNIFORM,
        Distribution.TRIANGULAR,
    ]
    source_id: str = Field(min_length=1, max_length=256)
    basis: Literal[EvidenceBasis.MEASURED]


class MeasurementRecord(TestRunContract):
    """A canonical scalar measurement with units, uncertainty, and method linkage."""

    name: str = Field(min_length=1, max_length=200)
    value: MeasuredValue
    method: str = Field(min_length=1, max_length=2_048)
    calibration_reference_id: str = Field(min_length=1, max_length=200)


def _strictly_increasing(values: list[float], field: str) -> None:
    if any(current <= previous for previous, current in pairwise(values)):
        raise ValueError(f"{field} must be strictly increasing without duplicates")


class TestRunMeasurements(TestRunContract):
    """Typed measurement ledger; missing scalar values remain explicit ``null``."""

    headspace_gc_mg_l: MeasuredValue | None = None
    total_h2_mg_l: MeasuredValue | None = None
    retained_h2_mg_l: MeasuredValue | None = None
    retention_fraction: MeasuredValue | None = None
    released_h2_mg_l: MeasuredValue | None = None
    unaccounted_h2_mg_l: MeasuredValue | None = None
    temperature_k: MeasuredValue | None = None
    pressure_pa_abs: MeasuredValue | None = None
    elapsed_s: MeasuredValue | None = None
    bubble_diameter_nm: MeasuredValue | None = None
    number_per_ml: MeasuredValue | None = None
    scalar_measurements: list[MeasurementRecord] = Field(default_factory=list)
    hydrogen_decay_csv: list[HydrogenDecayPoint] | None = Field(
        default=None,
        alias="hydrogen_decay.csv",
    )
    bubble_distribution_csv: list[BubbleDistributionPoint] | None = Field(
        default=None,
        alias="bubble_distribution.csv",
    )
    pressure_trace_csv: list[PressureTracePoint] | None = Field(
        default=None,
        alias="pressure_trace.csv",
    )

    @field_validator("scalar_measurements")
    @classmethod
    def scalar_measurement_names_are_unique(
        cls, values: list[MeasurementRecord]
    ) -> list[MeasurementRecord]:
        names = [item.name.casefold() for item in values]
        if len(names) != len(set(names)):
            raise ValueError("scalar measurement names must be unique")
        return values

    @model_validator(mode="after")
    def validate_series_and_mass_accounting(self) -> TestRunMeasurements:
        expected_units = {
            "headspace_gc_mg_l": "mg/L",
            "total_h2_mg_l": "mg/L",
            "retained_h2_mg_l": "mg/L",
            "retention_fraction": "1",
            "released_h2_mg_l": "mg/L",
            "unaccounted_h2_mg_l": "mg/L",
            "temperature_k": "K",
            "pressure_pa_abs": "Pa",
            "elapsed_s": "s",
            "bubble_diameter_nm": "nm",
            "number_per_ml": "1/mL",
        }
        for field_name, expected_unit in expected_units.items():
            quantity = getattr(self, field_name)
            if quantity is not None and quantity.unit != expected_unit:
                raise ValueError(f"{field_name} must use canonical unit {expected_unit!r}")

        bounded_values = {
            "headspace_gc_mg_l": (0.0, 2_000_000.0, True),
            "total_h2_mg_l": (0.0, 2_000_000.0, True),
            "retained_h2_mg_l": (0.0, 2_000_000.0, True),
            "retention_fraction": (0.0, 1.0, True),
            "released_h2_mg_l": (0.0, 2_000_000.0, True),
            "unaccounted_h2_mg_l": (0.0, 2_000_000.0, True),
            "temperature_k": (0.0, 1_773.15, False),
            "pressure_pa_abs": (0.0, 50_000_000.0, False),
            "elapsed_s": (0.0, 31_536_000.0, True),
            "bubble_diameter_nm": (0.0, 1_000_000.0, False),
            "number_per_ml": (0.0, 1.0e16, True),
        }
        for field_name, (lower, upper, lower_inclusive) in bounded_values.items():
            quantity = getattr(self, field_name)
            if quantity is None:
                continue
            below = quantity.value < lower if lower_inclusive else quantity.value <= lower
            if below or quantity.value > upper:
                comparator = "at least" if lower_inclusive else "greater than"
                raise ValueError(f"{field_name} must be {comparator} {lower} and at most {upper}")

        if self.hydrogen_decay_csv:
            _strictly_increasing(
                [point.time_s for point in self.hydrogen_decay_csv],
                "hydrogen_decay.csv time_s",
            )
        if self.bubble_distribution_csv:
            _strictly_increasing(
                [point.diameter_nm for point in self.bubble_distribution_csv],
                "bubble_distribution.csv diameter_nm",
            )
        if self.pressure_trace_csv:
            _strictly_increasing(
                [point.crank_angle_deg for point in self.pressure_trace_csv],
                "pressure_trace.csv crank_angle_deg",
            )

        total = self.total_h2_mg_l.value if self.total_h2_mg_l is not None else None
        accounted = (
            self.retained_h2_mg_l.value if self.retained_h2_mg_l is not None else None,
            self.released_h2_mg_l.value if self.released_h2_mg_l is not None else None,
            self.unaccounted_h2_mg_l.value if self.unaccounted_h2_mg_l is not None else None,
        )
        if total is not None and any(
            value is not None and value > total + 1.0e-12 for value in accounted
        ):
            raise ValueError("an H2 mass-accounting term cannot exceed total_h2_mg_l")
        return self

    def populated_series_names(self) -> set[str]:
        names: set[str] = set()
        if self.hydrogen_decay_csv:
            names.add("hydrogen_decay.csv")
        if self.bubble_distribution_csv:
            names.add("bubble_distribution.csv")
        if self.pressure_trace_csv:
            names.add("pressure_trace.csv")
        return names

    def has_measurements(self) -> bool:
        scalar_fields = (
            self.headspace_gc_mg_l,
            self.total_h2_mg_l,
            self.retained_h2_mg_l,
            self.retention_fraction,
            self.released_h2_mg_l,
            self.unaccounted_h2_mg_l,
            self.temperature_k,
            self.pressure_pa_abs,
            self.elapsed_s,
            self.bubble_diameter_nm,
            self.number_per_ml,
        )
        return (
            any(value is not None for value in scalar_fields)
            or bool(self.scalar_measurements)
            or bool(self.populated_series_names())
        )


class CalibrationReference(TestRunContract):
    id: str = Field(min_length=1, max_length=200)
    instrument: str = Field(default="unspecified instrument", min_length=1, max_length=500)
    method: str = Field(min_length=1, max_length=2_048)
    applies_to: list[CanonicalSeriesName] = Field(default_factory=list)
    calibrated_at: datetime | None = None
    expires_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=2_048)

    @model_validator(mode="after")
    def dates_are_ordered(self) -> CalibrationReference:
        if (
            self.calibrated_at is not None
            and self.expires_at is not None
            and self.expires_at < self.calibrated_at
        ):
            raise ValueError("calibration expiry cannot precede its calibration date")
        if len(self.applies_to) != len(set(self.applies_to)):
            raise ValueError("calibration applies_to entries must be unique")
        return self


class ComparisonRecord(TestRunContract):
    id: str = Field(min_length=1, max_length=200)
    kind: Literal["retention", "pressure_trace", "simulation"]
    label: str = Field(min_length=1, max_length=500)
    simulation_id: str | None = Field(default=None, max_length=64)
    measured_value: float | None = None
    modeled_value: float | None = None
    unit: str | None = Field(default=None, max_length=64)
    notes: str | None = Field(default=None, max_length=2_048)

    @field_validator("measured_value", "modeled_value")
    @classmethod
    def comparison_values_are_finite(cls, value: float | None) -> float | None:
        if value is not None and not isfinite(value):
            raise ValueError("comparison values must be finite")
        return value


class ComparisonCollection(TestRunContract):
    items: list[ComparisonRecord] = Field(default_factory=list)

    @field_validator("items")
    @classmethod
    def comparison_ids_are_unique(cls, values: list[ComparisonRecord]) -> list[ComparisonRecord]:
        ids = [item.id for item in values]
        if len(ids) != len(set(ids)):
            raise ValueError("comparison ids must be unique")
        return values


class TestRunProvenance(TestRunContract):
    source: str | None = Field(default=None, max_length=2_048)
    method: str | None = Field(default=None, max_length=2_048)
    ui_origin: str | None = Field(default=None, max_length=500)
    import_sha256: str | None = Field(default=None, pattern=r"^[0-9a-f]{64}$")
    source_test_run_id: str | None = Field(default=None, max_length=200)
    is_demo_synthetic: bool = False


class EvidenceInput(TestRunContract):
    kind: EvidenceKind
    title: str = Field(min_length=1, max_length=500)
    author_or_publisher: str = Field(min_length=1, max_length=500)
    publication_date: str = Field(min_length=1, max_length=64)
    url: AnyHttpUrl | None = None
    local_attachment: str | None = Field(default=None, min_length=1, max_length=256)
    method: str = Field(min_length=1, max_length=2_048)
    value_or_range: str = Field(min_length=1, max_length=500)
    unit: str = Field(min_length=1, max_length=64)
    uncertainty: str = Field(min_length=1, max_length=500)
    applicability_note: str = Field(min_length=1, max_length=2_048)

    @field_validator("local_attachment")
    @classmethod
    def local_attachment_is_an_identifier(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if value in {".", ".."} or "/" in value or "\\" in value or "\x00" in value:
            raise ValueError(
                "local_attachment must be an attachment identifier, not a filesystem path"
            )
        if not all(character.isalnum() or character in "._:-" for character in value):
            raise ValueError("local_attachment contains unsupported identifier characters")
        return value

    @model_validator(mode="after")
    def exactly_one_source_reference(self) -> EvidenceInput:
        if (self.url is None) == (self.local_attachment is None):
            raise ValueError("evidence requires exactly one URL or local attachment reference")
        return self


class EvidenceDocument(EvidenceInput):
    id: str
    created_at: datetime


class AttachmentDocument(TestRunContract):
    id: str
    canonical_name: str = Field(min_length=1, max_length=128)
    mime_type: str = Field(min_length=1, max_length=128)
    size_bytes: int = Field(ge=0)
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    locally_owned: bool
    metadata: dict[str, object]
    import_warnings: list[str]
    created_at: datetime

    @field_validator("canonical_name")
    @classmethod
    def canonical_name_is_not_a_path(cls, value: str) -> str:
        if value in {".", ".."} or "/" in value or "\\" in value or "\x00" in value:
            raise ValueError("canonical attachment name must not contain a path")
        return value


def validate_review_state(
    status: TestRunStatus | str,
    measurements: TestRunMeasurements,
    calibrations: list[CalibrationReference],
    *,
    require_series: bool = False,
) -> None:
    if TestRunStatus(status) is not TestRunStatus.VALID and not require_series:
        return
    if not measurements.has_measurements():
        raise ValueError("valid status requires at least one measured value or series")
    series = measurements.populated_series_names()
    if require_series and not series:
        raise ValueError("reviewed CSV export requires a canonical measurement series")
    if measurements.hydrogen_decay_csv and any(
        point.uncertainty_mg_l <= 0.0 for point in measurements.hydrogen_decay_csv
    ):
        raise ValueError(
            "valid hydrogen_decay.csv rows require positive stated standard uncertainty"
        )
    if measurements.pressure_trace_csv and any(
        point.uncertainty_bar <= 0.0 for point in measurements.pressure_trace_csv
    ):
        raise ValueError(
            "valid pressure_trace.csv rows require positive stated standard uncertainty"
        )
    total = measurements.total_h2_mg_l.value if measurements.total_h2_mg_l is not None else None
    accounting_terms = (
        measurements.retained_h2_mg_l,
        measurements.released_h2_mg_l,
        measurements.unaccounted_h2_mg_l,
    )
    if total is not None and all(item is not None for item in accounting_terms):
        accounted = sum(item.value for item in accounting_terms if item is not None)
        residual_fraction = abs(total - accounted) / max(total, 1.0e-12)
        if residual_fraction > 0.005:
            raise ValueError("valid H2 mass accounting requires a residual no greater than 0.5%")
    if (
        total is not None
        and total > 0.0
        and measurements.retained_h2_mg_l is not None
        and measurements.retention_fraction is not None
    ):
        calculated = measurements.retained_h2_mg_l.value / total
        if abs(calculated - measurements.retention_fraction.value) > 0.02:
            raise ValueError("valid retention_fraction is inconsistent with retained and total H2")
    calibration_ids = {reference.id for reference in calibrations}
    core_scalars = {
        name: quantity
        for name, quantity in (
            ("headspace_gc_mg_l", measurements.headspace_gc_mg_l),
            ("total_h2_mg_l", measurements.total_h2_mg_l),
            ("retained_h2_mg_l", measurements.retained_h2_mg_l),
            ("retention_fraction", measurements.retention_fraction),
            ("released_h2_mg_l", measurements.released_h2_mg_l),
            ("unaccounted_h2_mg_l", measurements.unaccounted_h2_mg_l),
            ("temperature_k", measurements.temperature_k),
            ("pressure_pa_abs", measurements.pressure_pa_abs),
            ("elapsed_s", measurements.elapsed_s),
            ("bubble_diameter_nm", measurements.bubble_diameter_nm),
            ("number_per_ml", measurements.number_per_ml),
        )
        if quantity is not None
    }
    for name, quantity in core_scalars.items():
        if quantity.source_id not in calibration_ids:
            raise ValueError(f"scalar measurement {name!r} references an unknown calibration")
    for measurement in measurements.scalar_measurements:
        if measurement.calibration_reference_id not in calibration_ids:
            raise ValueError(
                f"scalar measurement {measurement.name!r} references an unknown calibration"
            )
    for name in series:
        if not any(
            not reference.applies_to or name in reference.applies_to for reference in calibrations
        ):
            raise ValueError(f"{name} requires an applicable calibration or method reference")
    if not calibrations:
        raise ValueError("valid measurements require a calibration or method reference")


class TestRunCreate(TestRunContract):
    name: str = Field(min_length=1, max_length=200)
    status: TestRunStatus = TestRunStatus.DRAFT
    operator: str | None = Field(default=None, max_length=200)
    sample_id: str | None = Field(default=None, max_length=200)
    notes: str | None = Field(default=None, max_length=20_000)
    is_demo_synthetic: bool = False
    provenance: TestRunProvenance = Field(default_factory=TestRunProvenance)
    measurements: TestRunMeasurements = Field(default_factory=TestRunMeasurements)
    calibration_references: list[CalibrationReference] = Field(default_factory=list)
    comparisons: ComparisonCollection = Field(default_factory=ComparisonCollection)
    evidence: list[EvidenceInput] = Field(default_factory=list)

    @model_validator(mode="after")
    def valid_state_is_evidence_gated(self) -> TestRunCreate:
        validate_review_state(self.status, self.measurements, self.calibration_references)
        return self


class TestRunPatch(TestRunContract):
    expected_updated_at: datetime | None = None
    name: str | None = Field(default=None, min_length=1, max_length=200)
    status: TestRunStatus | None = None
    operator: str | None = Field(default=None, max_length=200)
    sample_id: str | None = Field(default=None, max_length=200)
    notes: str | None = Field(default=None, max_length=20_000)
    is_demo_synthetic: bool | None = None
    provenance: TestRunProvenance | None = None
    measurements: TestRunMeasurements | None = None
    calibration_references: list[CalibrationReference] | None = None
    comparisons: ComparisonCollection | None = None
    evidence: list[EvidenceInput] | None = None


class TestRunDocument(TestRunContract):
    id: str
    name: str
    status: TestRunStatus
    operator: str | None
    sample_id: str | None
    notes: str | None
    is_demo_synthetic: bool
    provenance: TestRunProvenance
    measurements: TestRunMeasurements
    calibration_references: list[CalibrationReference]
    comparisons: ComparisonCollection
    attachments: list[AttachmentDocument]
    simulation_ids: list[str]
    evidence: list[EvidenceDocument]
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="after")
    def owned_document_ids_are_unique_and_linked(self) -> TestRunDocument:
        attachment_ids = [item.id for item in self.attachments]
        if len(attachment_ids) != len(set(attachment_ids)):
            raise ValueError("attachment ids must be unique")
        evidence_ids = [item.id for item in self.evidence]
        if len(evidence_ids) != len(set(evidence_ids)):
            raise ValueError("evidence ids must be unique")
        known_attachments = set(attachment_ids)
        for item in self.evidence:
            if item.local_attachment is not None and item.local_attachment not in known_attachments:
                raise ValueError(
                    "evidence local_attachment must identify an attachment in the test run"
                )
        return self


class TestRun(TestRunDocument):
    """Canonical persisted test-run document exposed by import/export contracts."""


class ImportedAttachmentDocument(TestRunContract):
    id: str
    canonical_name: str
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    size_bytes: int = Field(ge=0)
    import_warnings: list[str]


class ImportedSimulationLink(TestRunContract):
    source_id: str | None
    persisted_id: str


class TestRunImportResponse(TestRunContract):
    test_run: TestRun
    attachment: ImportedAttachmentDocument
    imported_simulations: list[ImportedSimulationLink]


__all__ = [
    "AttachmentDocument",
    "BubbleDistributionPoint",
    "CalibrationReference",
    "CanonicalSeriesName",
    "ComparisonCollection",
    "ComparisonRecord",
    "EvidenceDocument",
    "EvidenceInput",
    "EvidenceKind",
    "HydrogenDecayPoint",
    "ImportedAttachmentDocument",
    "ImportedSimulationLink",
    "MeasurementRecord",
    "PressureTracePoint",
    "TestRun",
    "TestRunCreate",
    "TestRunDocument",
    "TestRunImportResponse",
    "TestRunMeasurements",
    "TestRunPatch",
    "TestRunProvenance",
    "TestRunStatus",
    "validate_review_state",
]
