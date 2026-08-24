"""Canonical, persistence-ready HydroCycle data contracts.

The scientific core uses SI internally.  Unit strings remain explicit at the
API boundary so that a value can never silently change meaning during import,
storage, or export.
"""

from __future__ import annotations

from enum import StrEnum
from itertools import pairwise
from math import isfinite
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

SCHEMA_VERSION = "1.0.0"


class HydroCycleModel(BaseModel):
    """Shared strict-enough configuration for public contracts."""

    model_config = ConfigDict(
        extra="forbid",
        validate_assignment=True,
        str_strip_whitespace=True,
    )


class Distribution(StrEnum):
    FIXED = "fixed"
    NORMAL = "normal"
    LOGNORMAL = "lognormal"
    UNIFORM = "uniform"
    TRIANGULAR = "triangular"


class EvidenceBasis(StrEnum):
    MEASURED = "measured"
    LITERATURE = "literature"
    USER_ASSUMPTION = "user_assumption"
    DERIVED = "derived"
    SYNTHETIC = "synthetic"


class EvidenceRecordBasis(StrEnum):
    """Allowed provenance classes for a complete evidence ledger record."""

    MEASURED = "measured"
    LITERATURE = "literature"
    USER_ASSUMPTION = "user_assumption"


class Scenario(StrEnum):
    UPSTREAM_VAPORIZED_CARRIER = "upstream_vaporized_carrier"
    HYDROGEN_WITH_WATER_INJECTION = "hydrogen_with_water_injection"


class FailureCode(StrEnum):
    INVALID_DATA = "invalid_data"
    MASS_BALANCE_FAILED = "mass_balance_failed"
    INSUFFICIENT_H2 = "insufficient_h2"
    PREHEAT_DEFICIT = "preheat_deficit"
    OUTSIDE_MODEL_DOMAIN = "outside_model_domain"
    PASS = "pass"


class Severity(StrEnum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


class ValueWithUncertainty(HydroCycleModel):
    """A scalar with canonical unit, one-sigma uncertainty, and provenance."""

    value: float | None
    unit: str = Field(min_length=1, max_length=64)
    standard_uncertainty: float = Field(default=0.0, ge=0.0)
    distribution: Distribution = Distribution.FIXED
    source_id: str | None = Field(default=None, max_length=256)
    basis: EvidenceBasis = EvidenceBasis.USER_ASSUMPTION

    @field_validator("value")
    @classmethod
    def value_must_be_finite(cls, value: float | None) -> float | None:
        if value is not None and not isfinite(value):
            raise ValueError("value must be finite when measured or specified")
        return value

    @field_validator("standard_uncertainty")
    @classmethod
    def uncertainty_must_be_finite(cls, value: float) -> float:
        if not isfinite(value):
            raise ValueError("standard_uncertainty must be finite")
        return value

    @model_validator(mode="after")
    def missing_value_has_no_numeric_uncertainty(self) -> ValueWithUncertainty:
        if self.value is None and self.standard_uncertainty != 0.0:
            raise ValueError("a missing value must not carry numeric uncertainty")
        if self.value is None and self.distribution is not Distribution.FIXED:
            raise ValueError("a missing value must use the fixed distribution")
        if self.standard_uncertainty > 0.0 and not self.source_id:
            raise ValueError("a quantity with nonzero uncertainty must identify its source basis")
        if self.standard_uncertainty > 0.0 and self.distribution is Distribution.FIXED:
            raise ValueError(
                "a quantity with nonzero uncertainty must declare a sampling distribution"
            )
        if (
            self.value is not None
            and self.distribution is Distribution.LOGNORMAL
            and self.value <= 0.0
        ):
            raise ValueError("a lognormal quantity must have a positive value")
        return self

    @classmethod
    def exact(
        cls,
        value: float | None,
        unit: str,
        *,
        source_id: str | None = None,
        basis: EvidenceBasis = EvidenceBasis.DERIVED,
    ) -> ValueWithUncertainty:
        return cls(
            value=value,
            unit=unit,
            standard_uncertainty=0.0,
            distribution=Distribution.FIXED,
            source_id=source_id,
            basis=basis,
        )


def _require_unit(quantity: ValueWithUncertainty, expected: str, field: str) -> None:
    if quantity.unit != expected:
        raise ValueError(f"{field} must use canonical unit {expected!r}")


def _require_nonnegative(quantity: ValueWithUncertainty, field: str) -> None:
    if quantity.value is not None and quantity.value < 0.0:
        raise ValueError(f"{field} must be nonnegative")


def _require_fraction(quantity: ValueWithUncertainty, field: str) -> None:
    _require_unit(quantity, "1", field)
    if quantity.value is not None and not 0.0 <= quantity.value <= 1.0:
        raise ValueError(f"{field} must be within [0, 1]")


class SampleInput(HydroCycleModel):
    water_volume_l: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=1.0,
            unit="L",
            standard_uncertainty=0.01,
            distribution=Distribution.NORMAL,
            source_id="sample-volume",
        )
    )
    carrier_volume_ml_per_cycle: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=1.0,
            unit="mL/cycle",
            standard_uncertainty=0.05,
            distribution=Distribution.NORMAL,
            source_id="carrier-delivery",
        )
    )
    measured_total_h2_mg_l: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty.exact(None, "mg/L")
    )
    separate_h2_mg_per_cycle: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=20.0,
            unit="mg/cycle",
            standard_uncertainty=0.5,
            distribution=Distribution.NORMAL,
            source_id="synthetic-separate-h2",
            basis=EvidenceBasis.SYNTHETIC,
        )
    )
    water_injection_mg_per_cycle: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=20.0,
            unit="mg/cycle",
            standard_uncertainty=1.0,
            distribution=Distribution.NORMAL,
            source_id="synthetic-water-injection",
            basis=EvidenceBasis.SYNTHETIC,
        )
    )

    @model_validator(mode="after")
    def validate_quantities(self) -> SampleInput:
        expected = {
            "water_volume_l": "L",
            "carrier_volume_ml_per_cycle": "mL/cycle",
            "measured_total_h2_mg_l": "mg/L",
            "separate_h2_mg_per_cycle": "mg/cycle",
            "water_injection_mg_per_cycle": "mg/cycle",
        }
        for field, unit in expected.items():
            quantity = getattr(self, field)
            _require_unit(quantity, unit, field)
            _require_nonnegative(quantity, field)
        if self.water_volume_l.value == 0.0:
            raise ValueError("water_volume_l must be greater than zero")
        return self


class EnvironmentInput(HydroCycleModel):
    water_temperature_k: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=298.15,
            unit="K",
            standard_uncertainty=0.25,
            distribution=Distribution.NORMAL,
            source_id="sample-temperature",
        )
    )
    water_pressure_bar: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=1.0,
            unit="bar",
            standard_uncertainty=0.01,
            distribution=Distribution.NORMAL,
            source_id="sample-pressure",
        )
    )
    hydrogen_headspace_mole_fraction: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=1.0,
            unit="1",
            standard_uncertainty=0.0,
            distribution=Distribution.FIXED,
            source_id="pure-h2-headspace-assumption",
            basis=EvidenceBasis.USER_ASSUMPTION,
        )
    )
    henry_loading_scale: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=1.0,
            unit="1",
            standard_uncertainty=0.15,
            distribution=Distribution.NORMAL,
            source_id="henry-reference-and-temperature-model-uncertainty",
            basis=EvidenceBasis.USER_ASSUMPTION,
        )
    )
    intake_temperature_k: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=300.0,
            unit="K",
            standard_uncertainty=1.0,
            distribution=Distribution.NORMAL,
            source_id="intake-temperature",
        )
    )
    intake_pressure_bar: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=1.0,
            unit="bar",
            standard_uncertainty=0.01,
            distribution=Distribution.NORMAL,
            source_id="intake-pressure",
        )
    )

    @model_validator(mode="after")
    def validate_quantities(self) -> EnvironmentInput:
        expected = {
            "water_temperature_k": "K",
            "water_pressure_bar": "bar",
            "hydrogen_headspace_mole_fraction": "1",
            "henry_loading_scale": "1",
            "intake_temperature_k": "K",
            "intake_pressure_bar": "bar",
        }
        for field, unit in expected.items():
            quantity = getattr(self, field)
            _require_unit(quantity, unit, field)
            if quantity.value is None:
                continue
            if field == "hydrogen_headspace_mole_fraction":
                if not 0.0 <= quantity.value <= 1.0:
                    raise ValueError(f"{field} must be within [0, 1]")
            elif quantity.value <= 0.0:
                raise ValueError(f"{field} must be greater than zero")
        return self


class BubbleBin(HydroCycleModel):
    diameter_nm: ValueWithUncertainty
    number_per_ml: ValueWithUncertainty

    @model_validator(mode="after")
    def validate_quantities(self) -> BubbleBin:
        _require_unit(self.diameter_nm, "nm", "diameter_nm")
        _require_unit(self.number_per_ml, "1/mL", "number_per_ml")
        if self.diameter_nm.value is None or self.diameter_nm.value <= 0.0:
            raise ValueError("diameter_nm must be measured and greater than zero")
        _require_nonnegative(self.number_per_ml, "number_per_ml")
        return self


class BubblePopulationInput(HydroCycleModel):
    bins: list[BubbleBin] = Field(default_factory=list, max_length=256)
    surface_tension_n_m: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=0.07197,
            unit="N/m",
            standard_uncertainty=0.002,
            distribution=Distribution.NORMAL,
            source_id="water-surface-tension-298K",
            basis=EvidenceBasis.LITERATURE,
        )
    )
    hydrogen_content_scale: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=1.0,
            unit="1",
            standard_uncertainty=0.75,
            distribution=Distribution.LOGNORMAL,
            source_id="bubble-gas-identity-and-content-uncertainty",
            basis=EvidenceBasis.USER_ASSUMPTION,
        )
    )
    method: str = Field(
        default="particle-sizing diagnostic; gas identity requires orthogonal confirmation",
        min_length=1,
        max_length=512,
    )

    @model_validator(mode="after")
    def validate_surface_tension(self) -> BubblePopulationInput:
        _require_unit(self.surface_tension_n_m, "N/m", "surface_tension_n_m")
        _require_nonnegative(self.surface_tension_n_m, "surface_tension_n_m")
        _require_unit(self.hydrogen_content_scale, "1", "hydrogen_content_scale")
        _require_nonnegative(self.hydrogen_content_scale, "hydrogen_content_scale")
        return self


class RetentionMeasurement(HydroCycleModel):
    time_s: float = Field(ge=0.0)
    total_h2_mg_l: ValueWithUncertainty

    @field_validator("time_s")
    @classmethod
    def finite_values(cls, value: float) -> float:
        if not isfinite(value):
            raise ValueError("retention series values must be finite")
        return value

    @model_validator(mode="after")
    def validate_concentration(self) -> RetentionMeasurement:
        _require_unit(self.total_h2_mg_l, "mg/L", "total_h2_mg_l")
        _require_nonnegative(self.total_h2_mg_l, "total_h2_mg_l")
        if self.total_h2_mg_l.value is None:
            raise ValueError("retention series concentration must be measured")
        if self.total_h2_mg_l.basis not in {
            EvidenceBasis.MEASURED,
            EvidenceBasis.SYNTHETIC,
        }:
            raise ValueError("retention series concentration basis must be measured or synthetic")
        return self


class RetentionInput(HydroCycleModel):
    measured_time_series: list[RetentionMeasurement] = Field(
        default_factory=list, max_length=10_000
    )
    elapsed_time_s: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=3_600.0,
            unit="s",
            standard_uncertainty=5.0,
            distribution=Distribution.NORMAL,
            source_id="elapsed-time",
        )
    )
    first_order_rate_constant_per_s: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=1.0e-5,
            unit="1/s",
            standard_uncertainty=5.0e-6,
            distribution=Distribution.NORMAL,
            source_id="retention-wide-assumption",
            basis=EvidenceBasis.USER_ASSUMPTION,
        )
    )
    handling_loss_fraction: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=0.10,
            unit="1",
            standard_uncertainty=0.05,
            distribution=Distribution.NORMAL,
            source_id="handling-loss-wide-assumption",
        )
    )
    intake_delivery_fraction: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=1.0,
            unit="1",
            standard_uncertainty=0.0,
            distribution=Distribution.FIXED,
            source_id="complete-release-assumption",
        )
    )
    reported_released_fraction: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty.exact(None, "1")
    )
    release_method: str = Field(
        default="passive transfer to intake; user assumption",
        min_length=1,
        max_length=512,
    )

    @model_validator(mode="after")
    def validate_retention(self) -> RetentionInput:
        _require_unit(self.elapsed_time_s, "s", "elapsed_time_s")
        _require_nonnegative(self.elapsed_time_s, "elapsed_time_s")
        _require_unit(
            self.first_order_rate_constant_per_s,
            "1/s",
            "first_order_rate_constant_per_s",
        )
        _require_nonnegative(
            self.first_order_rate_constant_per_s,
            "first_order_rate_constant_per_s",
        )
        _require_fraction(self.handling_loss_fraction, "handling_loss_fraction")
        _require_fraction(self.intake_delivery_fraction, "intake_delivery_fraction")
        _require_fraction(self.reported_released_fraction, "reported_released_fraction")
        times = [point.time_s for point in self.measured_time_series]
        if any(right <= left for left, right in pairwise(times)):
            raise ValueError("measured_time_series time_s must be strictly increasing")
        return self


class EngineInput(HydroCycleModel):
    displacement_l: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=0.5,
            unit="L",
            standard_uncertainty=0.001,
            distribution=Distribution.NORMAL,
            source_id="synthetic-engine-displacement",
            basis=EvidenceBasis.SYNTHETIC,
        )
    )
    bore_mm: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=86.0,
            unit="mm",
            standard_uncertainty=0.05,
            distribution=Distribution.NORMAL,
            source_id="synthetic-engine-bore",
            basis=EvidenceBasis.SYNTHETIC,
        )
    )
    stroke_mm: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=86.0,
            unit="mm",
            standard_uncertainty=0.05,
            distribution=Distribution.NORMAL,
            source_id="synthetic-engine-stroke",
            basis=EvidenceBasis.SYNTHETIC,
        )
    )
    connecting_rod_mm: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=143.0,
            unit="mm",
            standard_uncertainty=0.1,
            distribution=Distribution.NORMAL,
            source_id="synthetic-engine-rod",
            basis=EvidenceBasis.SYNTHETIC,
        )
    )
    compression_ratio: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=10.5,
            unit="1",
            standard_uncertainty=0.05,
            distribution=Distribution.NORMAL,
            source_id="synthetic-engine-compression-ratio",
            basis=EvidenceBasis.SYNTHETIC,
        )
    )
    volumetric_efficiency: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=0.90,
            unit="1",
            standard_uncertainty=0.03,
            distribution=Distribution.NORMAL,
            source_id="synthetic-engine-ve",
            basis=EvidenceBasis.SYNTHETIC,
        )
    )
    speed_rpm: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=2_000.0,
            unit="rpm",
            standard_uncertainty=10.0,
            distribution=Distribution.NORMAL,
            source_id="synthetic-engine-speed",
            basis=EvidenceBasis.SYNTHETIC,
        )
    )
    target_imep_bar: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=6.0,
            unit="bar",
            standard_uncertainty=0.2,
            distribution=Distribution.NORMAL,
            source_id="synthetic-target-imep",
            basis=EvidenceBasis.SYNTHETIC,
        )
    )

    @model_validator(mode="after")
    def validate_engine(self) -> EngineInput:
        expected = {
            "displacement_l": "L",
            "bore_mm": "mm",
            "stroke_mm": "mm",
            "connecting_rod_mm": "mm",
            "compression_ratio": "1",
            "volumetric_efficiency": "1",
            "speed_rpm": "rpm",
            "target_imep_bar": "bar",
        }
        for field, unit in expected.items():
            quantity = getattr(self, field)
            _require_unit(quantity, unit, field)
            if quantity.value is None or quantity.value <= 0.0:
                raise ValueError(f"{field} must be specified and greater than zero")
        connecting_rod_mm = self.connecting_rod_mm.value
        stroke_mm = self.stroke_mm.value
        compression_ratio = self.compression_ratio.value
        volumetric_efficiency = self.volumetric_efficiency.value
        assert connecting_rod_mm is not None
        assert stroke_mm is not None
        assert compression_ratio is not None
        assert volumetric_efficiency is not None
        if connecting_rod_mm <= stroke_mm / 2.0:
            raise ValueError("connecting rod must be longer than crank radius")
        if compression_ratio <= 1.0:
            raise ValueError("compression_ratio must be greater than one")
        if volumetric_efficiency > 1.5:
            raise ValueError("volumetric_efficiency must not exceed 1.5")
        return self


class CombustionInput(HydroCycleModel):
    target_equivalence_ratio: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=0.80,
            unit="1",
            standard_uncertainty=0.03,
            distribution=Distribution.NORMAL,
            source_id="synthetic-equivalence-ratio",
            basis=EvidenceBasis.SYNTHETIC,
        )
    )
    combustion_efficiency: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=0.95,
            unit="1",
            standard_uncertainty=0.02,
            distribution=Distribution.NORMAL,
            source_id="combustion-efficiency-assumption",
        )
    )
    combustion_start_deg_atdc: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=-10.0,
            unit="deg",
            standard_uncertainty=2.0,
            distribution=Distribution.NORMAL,
            source_id="wiebe-start-assumption",
        )
    )
    combustion_duration_deg: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=60.0,
            unit="deg",
            standard_uncertainty=5.0,
            distribution=Distribution.NORMAL,
            source_id="wiebe-duration-assumption",
        )
    )
    wiebe_a: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty.exact(
            5.0, "1", source_id="wiebe-shape-assumption", basis=EvidenceBasis.USER_ASSUMPTION
        )
    )
    wiebe_m: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty.exact(
            2.0, "1", source_id="wiebe-shape-assumption", basis=EvidenceBasis.USER_ASSUMPTION
        )
    )
    motored_gamma: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=1.35,
            unit="1",
            standard_uncertainty=0.02,
            distribution=Distribution.NORMAL,
            source_id="polytropic-gamma-assumption",
        )
    )
    wall_temperature_k: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=450.0,
            unit="K",
            standard_uncertainty=20.0,
            distribution=Distribution.NORMAL,
            source_id="wall-temperature-assumption",
        )
    )
    gate_wall_loss_fraction: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty(
            value=0.20,
            unit="1",
            standard_uncertainty=0.05,
            distribution=Distribution.NORMAL,
            source_id="wall-loss-wide-assumption",
        )
    )

    @model_validator(mode="after")
    def validate_combustion(self) -> CombustionInput:
        expected = {
            "target_equivalence_ratio": "1",
            "combustion_efficiency": "1",
            "combustion_start_deg_atdc": "deg",
            "combustion_duration_deg": "deg",
            "wiebe_a": "1",
            "wiebe_m": "1",
            "motored_gamma": "1",
            "wall_temperature_k": "K",
            "gate_wall_loss_fraction": "1",
        }
        for field, unit in expected.items():
            _require_unit(getattr(self, field), unit, field)
        _require_fraction(self.combustion_efficiency, "combustion_efficiency")
        _require_fraction(self.gate_wall_loss_fraction, "gate_wall_loss_fraction")
        positive_fields = (
            "target_equivalence_ratio",
            "combustion_duration_deg",
            "wiebe_a",
            "motored_gamma",
            "wall_temperature_k",
        )
        for field in positive_fields:
            quantity = getattr(self, field)
            if quantity.value is None or quantity.value <= 0.0:
                raise ValueError(f"{field} must be specified and greater than zero")
        if self.wiebe_m.value is None or self.wiebe_m.value < 0.0:
            raise ValueError("wiebe_m must be specified and nonnegative")
        return self


class HeatRecoveryInput(HydroCycleModel):
    recovered_heat_j_per_cycle: ValueWithUncertainty = Field(
        default_factory=lambda: ValueWithUncertainty.exact(
            0.0, "J/cycle", source_id="no-measured-recovery"
        )
    )

    @model_validator(mode="after")
    def validate_recovery(self) -> HeatRecoveryInput:
        _require_unit(
            self.recovered_heat_j_per_cycle,
            "J/cycle",
            "recovered_heat_j_per_cycle",
        )
        _require_nonnegative(self.recovered_heat_j_per_cycle, "recovered_heat_j_per_cycle")
        return self


class UncertaintySettings(HydroCycleModel):
    enabled: bool = True
    seed: int = Field(default=20_260_824, ge=0, le=2**63 - 1)
    analytical_samples: int = Field(default=200, ge=16, le=10_000)
    cycle_samples: int = Field(default=64, ge=32, le=256)


class SimulationInput(HydroCycleModel):
    schema_version: Literal["1.0.0"] = "1.0.0"
    scenario: Scenario = Scenario.UPSTREAM_VAPORIZED_CARRIER
    sample: SampleInput = Field(default_factory=SampleInput)
    environment: EnvironmentInput = Field(default_factory=EnvironmentInput)
    bubble_population: BubblePopulationInput | None = Field(
        default_factory=lambda: BubblePopulationInput(
            bins=[
                BubbleBin(
                    diameter_nm=ValueWithUncertainty(
                        value=200.0,
                        unit="nm",
                        standard_uncertainty=40.0,
                        distribution=Distribution.LOGNORMAL,
                        source_id="literature-comparison-bubble-size",
                        basis=EvidenceBasis.LITERATURE,
                    ),
                    number_per_ml=ValueWithUncertainty(
                        value=1.0e8,
                        unit="1/mL",
                        standard_uncertainty=5.0e7,
                        distribution=Distribution.LOGNORMAL,
                        source_id="literature-comparison-number-density",
                        basis=EvidenceBasis.LITERATURE,
                    ),
                )
            ]
        )
    )
    retention: RetentionInput = Field(default_factory=RetentionInput)
    engine: EngineInput = Field(default_factory=EngineInput)
    combustion: CombustionInput = Field(default_factory=CombustionInput)
    heat_recovery: HeatRecoveryInput = Field(default_factory=HeatRecoveryInput)
    uncertainty: UncertaintySettings = Field(default_factory=UncertaintySettings)


class Diagnostic(HydroCycleModel):
    code: str = Field(min_length=1, max_length=128)
    severity: Severity
    message: str = Field(min_length=1, max_length=2_048)
    details: dict[str, Any] = Field(default_factory=dict)


class HydrogenLoadingResult(HydroCycleModel):
    mode: Literal["measured_total", "derived"]
    total_h2_mg_l: ValueWithUncertainty
    dissolved_h2_mg_l: ValueWithUncertainty
    bubble_contained_h2_mg_l: ValueWithUncertainty
    bubble_contribution_counted: bool
    chemical_energy_density_kj_l: ValueWithUncertainty
    bubble_method_limitation: str


class RetentionResult(HydroCycleModel):
    method: Literal["measured_time_series", "first_order_assumption"]
    initial_total_h2_mg_l: ValueWithUncertainty
    pre_handling_retention_fraction: ValueWithUncertainty
    handling_loss_fraction: ValueWithUncertainty
    intake_delivery_fraction: ValueWithUncertainty
    retained_fraction: ValueWithUncertainty
    released_h2_mg_l: ValueWithUncertainty
    retained_at_intake_mg_l: ValueWithUncertainty
    unaccounted_h2_mg_l: ValueWithUncertainty
    release_method: str
    elapsed_time_s: float
    temperature_k: float
    pressure_bar: float


class EnergyTerms(HydroCycleModel):
    hydrogen_chemical_energy_j: float
    water_sensible_heating_j: float
    water_phase_change_j: float
    heat_recovery_j: float
    net_external_preheat_j: float
    estimated_wall_loss_j: float
    target_indicated_work_j: float
    usable_energy_margin_j: float


class MassBalance(HydroCycleModel):
    initial_h2_mg_per_cycle: float
    retained_h2_mg_per_cycle: float
    released_h2_mg_per_cycle: float
    unaccounted_h2_mg_per_cycle: float
    residual_h2_mg_per_cycle: float
    relative_residual: float


class GateResult(HydroCycleModel):
    passed: bool
    failures: list[FailureCode]
    hydrogen_required: ValueWithUncertainty
    hydrogen_available: ValueWithUncertainty
    hydrogen_mass_margin_mg_per_cycle: float
    trapped_air_mg_per_cycle: float
    oxygen_available_mg_per_cycle: float
    energy_terms: EnergyTerms
    mass_balance: MassBalance
    domain_warnings: list[str] = Field(default_factory=list)
    ambient_h2_lfl_volume_percent_safety_reference: float = 4.0

    @model_validator(mode="after")
    def pass_code_matches_boolean(self) -> GateResult:
        if self.passed and self.failures != [FailureCode.PASS]:
            raise ValueError("a passed gate must contain only the pass code")
        if not self.passed and FailureCode.PASS in self.failures:
            raise ValueError("a failed gate must not contain the pass code")
        return self


class TraceUncertaintyBands(HydroCycleModel):
    pressure_lower_95_pa: list[float]
    pressure_upper_95_pa: list[float]
    temperature_lower_95_k: list[float]
    temperature_upper_95_k: list[float]
    accepted_cycle_samples: int


class CycleTrace(HydroCycleModel):
    model_label: Literal["Single-zone state — schematic, not CFD."] = (
        "Single-zone state — schematic, not CFD."
    )
    crank_angle_deg: list[float]
    volume_m3: list[float]
    pressure_pa: list[float]
    temperature_k: list[float]
    h2_mg: list[float]
    o2_mg: list[float]
    n2_mg: list[float]
    h2o_vapor_mg: list[float]
    water_liquid_mg: list[float]
    water_vapor_mg: list[float]
    cumulative_heat_release_j: list[float]
    cumulative_wall_heat_loss_j: list[float]
    cumulative_vaporization_heat_j: list[float]
    pv_work_j: float
    imep_bar: float
    upper_bound_indicated_efficiency: float | None
    adiabatic_flame_temperature_k: float | None
    relative_thermal_nox_risk: Literal["low", "moderate", "high", "not_applicable"]
    energy_conservation_residual_fraction: float
    uncertainty: TraceUncertaintyBands | None = None

    @model_validator(mode="after")
    def arrays_have_one_length(self) -> CycleTrace:
        reference = len(self.crank_angle_deg)
        names = (
            "volume_m3",
            "pressure_pa",
            "temperature_k",
            "h2_mg",
            "o2_mg",
            "n2_mg",
            "h2o_vapor_mg",
            "water_liquid_mg",
            "water_vapor_mg",
            "cumulative_heat_release_j",
            "cumulative_wall_heat_loss_j",
            "cumulative_vaporization_heat_j",
        )
        if reference < 2 or any(len(getattr(self, name)) != reference for name in names):
            raise ValueError("all cycle-trace arrays must have one common nontrivial length")
        return self


class Interval95(HydroCycleModel):
    lower: float
    median: float
    upper: float
    unit: str


class SensitivityEntry(HydroCycleModel):
    parameter: str
    output_metric: str
    normalized_effect: float = Field(ge=-1.0, le=1.0)
    direction: Literal["increases", "decreases", "neutral"]


class UncertaintyResult(HydroCycleModel):
    enabled: bool
    method: Literal["seeded_latin_hypercube"] = "seeded_latin_hypercube"
    seed: int
    analytical_samples: int
    cycle_samples_requested: int
    energy_margin_95: Interval95
    hydrogen_available_95: Interval95
    gate_pass_probability: float = Field(ge=0.0, le=1.0)
    sensitivities: list[SensitivityEntry]


class EvidenceRecord(HydroCycleModel):
    id: str = Field(min_length=1, max_length=256)
    basis: EvidenceRecordBasis
    title: str
    author_or_publisher: str
    publication_date: str | None = None
    url: str | None = None
    local_attachment: str | None = None
    method: str
    value_or_range: str
    unit: str
    uncertainty: str
    applicability_note: str


class ReproducibilityMetadata(HydroCycleModel):
    schema_version: str
    model_version: str
    solver_version: str
    python_version: str
    numpy_version: str
    scipy_version: str
    cantera_version: str | None
    cantera_available: bool
    mechanism: str
    mechanism_sha256: str | None
    random_seed: int
    analytical_samples: int
    cycle_samples: int


class SimulationResult(HydroCycleModel):
    result_id: str
    input: SimulationInput
    loading: HydrogenLoadingResult
    retention: RetentionResult
    gate: GateResult
    motored_baseline: CycleTrace
    proposed_cycle: CycleTrace | None
    uncertainty: UncertaintyResult
    sensitivity: list[SensitivityEntry] = Field(default_factory=list)
    evidence: list[EvidenceRecord]
    diagnostics: list[Diagnostic]
    reproducibility: ReproducibilityMetadata

    @model_validator(mode="after")
    def failed_gate_has_no_reactive_trace(self) -> SimulationResult:
        if not self.gate.passed and self.proposed_cycle is not None:
            raise ValueError("a failed feasibility gate cannot expose a reactive trace")
        if self.sensitivity and self.sensitivity != self.uncertainty.sensitivities:
            raise ValueError("top-level sensitivity must match uncertainty.sensitivities")
        if not self.sensitivity:
            object.__setattr__(self, "sensitivity", list(self.uncertainty.sensitivities))
        return self


class ModelMetadata(HydroCycleModel):
    schema_version: str
    model_version: str
    equations: dict[str, str]
    parameter_definitions: dict[str, str]
    valid_domains: dict[str, str]
    mechanism: str
    mechanism_sha256: str | None
    cantera_version: str | None
    source_ledger: list[EvidenceRecord]
    limitations: list[str]


class HomogeneousBoundaryState(HydroCycleModel):
    crank_angle_deg: float
    volume_m3: float
    pressure_pa: float
    temperature_k: float
    mole_fractions: dict[str, float]


class CfdBoundaryExport(HydroCycleModel):
    """Neutral homogeneous boundary data, explicitly not a spatial CFD field."""

    schema_version: str = SCHEMA_VERSION
    export_kind: Literal["homogeneous_0d_boundary_only"] = "homogeneous_0d_boundary_only"
    engine_geometry: dict[str, float]
    states: list[HomogeneousBoundaryState]
    water_loading_mg_per_cycle: float
    mechanism: str
    mechanism_sha256: str | None
    missing_fields: list[str] = Field(
        default_factory=lambda: [
            "spatial_mesh",
            "velocity_field",
            "turbulence_field",
            "spray_droplet_field",
            "flame_front",
        ]
    )
