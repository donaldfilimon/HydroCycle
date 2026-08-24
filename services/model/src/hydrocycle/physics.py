"""Evidence-gated loading, retention, feasibility, and bounded 0D cycle model."""

from __future__ import annotations

import hashlib
import json
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from math import exp, isfinite, pi, sqrt
from typing import Any, Literal

import numpy as np
from pydantic import BaseModel

from .metadata import (
    MECHANISM_NAME,
    MODEL_VERSION,
    get_runtime_metadata,
    source_ledger,
)
from .schemas import (
    BubblePopulationInput,
    CycleTrace,
    Diagnostic,
    Distribution,
    EnergyTerms,
    EngineInput,
    EvidenceBasis,
    FailureCode,
    GateResult,
    HydrogenLoadingResult,
    Interval95,
    MassBalance,
    RetentionResult,
    Scenario,
    SensitivityEntry,
    Severity,
    SimulationInput,
    SimulationResult,
    TraceUncertaintyBands,
    UncertaintyResult,
    ValueWithUncertainty,
)
from .uncertainty import interval_95, latin_hypercube, sample_quantity

# Reference constants. H2 LHV is derived from 241.826 kJ/mol H2O(g).
HENRY_H2_298_MOL_PER_KG_BAR = 0.00078
H2_MOLAR_MASS_KG_PER_MOL = 0.00201588
H2_LHV_J_PER_KG = 241_826.0 / H2_MOLAR_MASS_KG_PER_MOL
WATER_MOLAR_MASS_KG_PER_MOL = 0.01801528
WATER_VAPORIZATION_J_PER_KG = 44_004.0 / WATER_MOLAR_MASS_KG_PER_MOL
WATER_SPECIFIC_HEAT_J_PER_KG_K = 4_180.0
WATER_BOILING_POINT_K_AT_1_BAR = 373.15
UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K = 8.314462618
AIR_GAS_CONSTANT_J_PER_KG_K = 287.05
OXYGEN_MASS_FRACTION_DRY_AIR = 0.232
H2_STOICH_OXYGEN_MASS_RATIO = 31.9988 / (2.0 * 2.01588)
H2_STOICH_AIR_MASS_RATIO = H2_STOICH_OXYGEN_MASS_RATIO / OXYGEN_MASS_FRACTION_DRY_AIR
MASS_BALANCE_RELATIVE_TOLERANCE = 0.01


def _q(quantity: ValueWithUncertainty) -> float:
    if quantity.value is None:
        raise ValueError(f"required quantity with unit {quantity.unit!r} is missing")
    return quantity.value


def water_density_kg_l(temperature_k: float) -> float:
    """Liquid-water density approximation valid over the v1 temperature domain."""

    temperature_c = temperature_k - 273.15
    numerator = (temperature_c + 288.9414) * (temperature_c - 3.9863) ** 2
    denominator = 508_929.2 * (temperature_c + 68.12963)
    return 1.0 - numerator / denominator


def henry_dissolved_h2_mg_l(
    temperature_k: float = 298.15,
    pressure_bar: float = 1.0,
) -> float:
    """Compute dissolved H2 using the NIST 298.15 K reference.

    The away-from-reference correction is deliberately visible and conservative:
    a 1.5%/K exponential solubility decay assumption. It is not attributed to
    NIST and its uncertainty is propagated separately in the derived loading.
    """

    if temperature_k <= 0.0 or pressure_bar < 0.0:
        raise ValueError("temperature must be positive and pressure nonnegative")
    temperature_factor = exp(-0.015 * (temperature_k - 298.15))
    mol_per_kg = HENRY_H2_298_MOL_PER_KG_BAR * pressure_bar * temperature_factor
    kg_h2_per_l = mol_per_kg * water_density_kg_l(temperature_k) * H2_MOLAR_MASS_KG_PER_MOL
    return kg_h2_per_l * 1.0e6


def hydrogen_energy_density_kj_l(h2_mg_l: float) -> float:
    if h2_mg_l < 0.0:
        raise ValueError("hydrogen concentration must be nonnegative")
    return h2_mg_l * 1.0e-6 * H2_LHV_J_PER_KG / 1_000.0


def water_heating_burden_j(mass_kg: float, initial_temperature_k: float) -> tuple[float, float]:
    """Return sensible heating and 298 K-reference phase-change burdens."""

    if mass_kg < 0.0 or initial_temperature_k <= 0.0:
        raise ValueError("water mass must be nonnegative and temperature positive")
    sensible = (
        mass_kg
        * WATER_SPECIFIC_HEAT_J_PER_KG_K
        * max(WATER_BOILING_POINT_K_AT_1_BAR - initial_temperature_k, 0.0)
    )
    phase_change = mass_kg * WATER_VAPORIZATION_J_PER_KG
    return sensible, phase_change


def _bubble_h2_mg_l(
    population: BubblePopulationInput | None,
    *,
    temperature_k: float,
    ambient_pressure_bar: float,
) -> float:
    if population is None:
        return 0.0
    surface_tension = _q(population.surface_tension_n_m)
    ambient_pressure_pa = ambient_pressure_bar * 1.0e5
    total_kg_per_l = 0.0
    for bubble_bin in population.bins:
        diameter_m = _q(bubble_bin.diameter_nm) * 1.0e-9
        number_per_l = _q(bubble_bin.number_per_ml) * 1_000.0
        bubble_volume_m3 = pi * diameter_m**3 / 6.0
        internal_pressure_pa = ambient_pressure_pa + 4.0 * surface_tension / diameter_m
        moles_per_l = (
            number_per_l
            * bubble_volume_m3
            * internal_pressure_pa
            / (UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K * temperature_k)
        )
        total_kg_per_l += moles_per_l * H2_MOLAR_MASS_KG_PER_MOL
    return total_kg_per_l * 1.0e6 * _q(population.hydrogen_content_scale)


def _derived_loading_values(input_data: SimulationInput) -> tuple[float, float]:
    """Return dissolved and bubble-contained loading from inspectable inputs."""

    temperature_k = _q(input_data.environment.water_temperature_k)
    system_pressure_bar = _q(input_data.environment.water_pressure_bar)
    headspace_h2_fraction = _q(input_data.environment.hydrogen_headspace_mole_fraction)
    hydrogen_partial_pressure_bar = system_pressure_bar * headspace_h2_fraction
    dissolved = henry_dissolved_h2_mg_l(temperature_k, hydrogen_partial_pressure_bar) * _q(
        input_data.environment.henry_loading_scale
    )
    bubble = _bubble_h2_mg_l(
        input_data.bubble_population,
        temperature_k=temperature_k,
        ambient_pressure_bar=system_pressure_bar,
    )
    return dissolved, bubble


def _sample_quantity_array(
    quantity: ValueWithUncertainty,
    probabilities: np.ndarray,
    *,
    lower: float,
    upper: float = float("inf"),
) -> np.ndarray:
    values = np.fromiter(
        (sample_quantity(quantity, float(probability)) for probability in probabilities),
        dtype=float,
        count=len(probabilities),
    )
    clipped = np.empty_like(values)
    np.clip(values, lower, upper, out=clipped)
    return clipped


def _derived_loading_standard_uncertainties(
    input_data: SimulationInput,
    *,
    sample_count: int = 32_768,
) -> tuple[float, float, float]:
    """Sample the complete derived-loading dependency graph deterministically."""

    quantities: list[tuple[ValueWithUncertainty, float, float]] = [
        (input_data.environment.water_temperature_k, 1.0, 5_000.0),
        (input_data.environment.water_pressure_bar, 0.0, float("inf")),
        (input_data.environment.hydrogen_headspace_mole_fraction, 0.0, 1.0),
        (input_data.environment.henry_loading_scale, 0.0, float("inf")),
    ]
    population = input_data.bubble_population
    if population is not None:
        quantities.extend(
            [
                (population.surface_tension_n_m, 0.0, float("inf")),
                (population.hydrogen_content_scale, 0.0, float("inf")),
            ]
        )
        for bubble_bin in population.bins:
            quantities.extend(
                [
                    (bubble_bin.diameter_nm, 1.0, 1.0e6),
                    (bubble_bin.number_per_ml, 0.0, float("inf")),
                ]
            )

    lhs = latin_hypercube(sample_count, len(quantities), input_data.uncertainty.seed + 17)
    sampled = [
        _sample_quantity_array(quantity, lhs[:, column], lower=lower, upper=upper)
        for column, (quantity, lower, upper) in enumerate(quantities)
    ]
    temperature_k, pressure_bar, headspace_fraction, henry_scale = sampled[:4]
    temperature_c = temperature_k - 273.15
    water_density = 1.0 - (
        (temperature_c + 288.9414)
        * (temperature_c - 3.9863) ** 2
        / (508_929.2 * (temperature_c + 68.12963))
    )
    dissolved = (
        HENRY_H2_298_MOL_PER_KG_BAR
        * pressure_bar
        * headspace_fraction
        * np.exp(-0.015 * (temperature_k - 298.15))
        * water_density
        * H2_MOLAR_MASS_KG_PER_MOL
        * 1.0e6
        * henry_scale
    )

    bubble = np.zeros(sample_count, dtype=float)
    if population is not None:
        surface_tension = sampled[4]
        content_scale = sampled[5]
        cursor = 6
        total_kg_per_l = np.zeros(sample_count, dtype=float)
        for _bubble_bin in population.bins:
            diameter_m = sampled[cursor] * 1.0e-9
            number_per_l = sampled[cursor + 1] * 1_000.0
            cursor += 2
            bubble_volume_m3 = pi * diameter_m**3 / 6.0
            internal_pressure_pa = pressure_bar * 1.0e5 + 4.0 * surface_tension / diameter_m
            moles_per_l = (
                number_per_l
                * bubble_volume_m3
                * internal_pressure_pa
                / (UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K * temperature_k)
            )
            total_kg_per_l += moles_per_l * H2_MOLAR_MASS_KG_PER_MOL
        bubble = total_kg_per_l * 1.0e6 * content_scale

    return (
        float(np.std(dissolved)),
        float(np.std(bubble)),
        float(np.std(dissolved + bubble)),
    )


def _compute_loading(
    input_data: SimulationInput,
    *,
    include_scalar_uncertainty: bool,
) -> tuple[HydrogenLoadingResult, list[Diagnostic]]:
    ambient_pressure_bar = _q(input_data.environment.water_pressure_bar)
    headspace_h2_fraction = _q(input_data.environment.hydrogen_headspace_mole_fraction)
    hydrogen_partial_pressure_bar = ambient_pressure_bar * headspace_h2_fraction
    dissolved, bubble = _derived_loading_values(input_data)
    if include_scalar_uncertainty:
        dissolved_uncertainty, bubble_uncertainty, total_derived_uncertainty = (
            _derived_loading_standard_uncertainties(input_data)
        )
    else:
        dissolved_uncertainty = 0.0
        bubble_uncertainty = 0.0
        total_derived_uncertainty = 0.0
    measured = input_data.sample.measured_total_h2_mg_l
    diagnostics: list[Diagnostic] = []
    if measured.value is not None:
        total = measured.model_copy(deep=True)
        mode: Literal["measured_total", "derived"] = "measured_total"
        counted = False
        diagnostics.append(
            Diagnostic(
                code="measured_total_replaces_derived_loading",
                severity=Severity.INFO,
                message=(
                    "Authoritative total H2 replaces the theoretical dissolved and bubble-bin "
                    "estimates; those estimates are diagnostics only."
                ),
                details={"measured_basis": measured.basis.value},
            )
        )
    else:
        total_value = dissolved + bubble
        # Each displayed scalar uses the same temperature, pressure, model-scale,
        # bubble-size/count, and gas-content dependencies sampled by the LHS.
        total_uncertainty = total_derived_uncertainty
        total = ValueWithUncertainty(
            value=total_value,
            unit="mg/L",
            standard_uncertainty=total_uncertainty,
            distribution=Distribution.NORMAL,
            source_id="nist-henry-plus-bubble-diagnostic",
            basis=EvidenceBasis.DERIVED,
        )
        mode = "derived"
        counted = True
        diagnostics.append(
            Diagnostic(
                code="henry_h2_partial_pressure_assumption",
                severity=Severity.INFO,
                message=(
                    "Dissolved H2 uses H2 partial pressure derived from system pressure times "
                    "the explicit headspace H2 mole fraction. The default mole fraction of 1 "
                    "is an exact pure-H2 equilibration assumption."
                ),
                details={
                    "hydrogen_partial_pressure_bar": hydrogen_partial_pressure_bar,
                    "ambient_system_pressure_bar": ambient_pressure_bar,
                    "hydrogen_headspace_mole_fraction": headspace_h2_fraction,
                },
            )
        )
    energy_uncertainty = total.standard_uncertainty * H2_LHV_J_PER_KG * 1.0e-9
    return (
        HydrogenLoadingResult(
            mode=mode,
            total_h2_mg_l=total,
            dissolved_h2_mg_l=ValueWithUncertainty(
                value=dissolved,
                unit="mg/L",
                standard_uncertainty=dissolved_uncertainty,
                distribution=Distribution.NORMAL,
                source_id="nist-h2-henry-298",
                basis=EvidenceBasis.DERIVED,
            ),
            bubble_contained_h2_mg_l=ValueWithUncertainty(
                value=bubble,
                unit="mg/L",
                standard_uncertainty=bubble_uncertainty,
                distribution=Distribution.NORMAL if bubble else Distribution.FIXED,
                source_id="bubble-size-count-diagnostic",
                basis=EvidenceBasis.DERIVED,
            ),
            bubble_contribution_counted=counted,
            chemical_energy_density_kj_l=ValueWithUncertainty(
                value=hydrogen_energy_density_kj_l(_q(total)),
                unit="kJ/L",
                standard_uncertainty=energy_uncertainty,
                distribution=total.distribution,
                source_id=total.source_id,
                basis=EvidenceBasis.DERIVED,
            ),
            bubble_method_limitation=(
                "Bubble size/count cannot establish gas identity or authoritative total H2; "
                "use an orthogonal mass method such as calibrated headspace GC."
            ),
        ),
        diagnostics,
    )


def _measured_retention_fraction(input_data: SimulationInput) -> tuple[float, float]:
    points = input_data.retention.measured_time_series
    if not points:
        raise ValueError("measured retention requested without a series")
    initial = _q(points[0].total_h2_mg_l)
    if initial <= 0.0:
        raise ValueError("the first measured retention concentration must be positive")
    target_time = _q(input_data.retention.elapsed_time_s)
    times = np.asarray([point.time_s for point in points], dtype=float)
    values = np.asarray([_q(point.total_h2_mg_l) for point in points], dtype=float)
    if len(points) == 1 or target_time <= times[-1]:
        target = float(np.interp(target_time, times, values))
    else:
        positive = values > 0.0
        if int(np.count_nonzero(positive)) >= 2:
            slope, intercept = np.polyfit(times[positive], np.log(values[positive]), 1)
            target = float(exp(intercept + min(slope, 0.0) * target_time))
        else:
            target = float(values[-1])
    raw_fraction = target / initial
    first_uncertainty = points[0].total_h2_mg_l.standard_uncertainty
    nearest = int(np.argmin(np.abs(times - min(target_time, times[-1]))))
    target_uncertainty = points[nearest].total_h2_mg_l.standard_uncertainty
    relative_uncertainty = sqrt(
        (target_uncertainty / max(target, 1.0e-12)) ** 2 + (first_uncertainty / initial) ** 2
    )
    return raw_fraction, abs(raw_fraction) * relative_uncertainty


def _compute_retention(
    input_data: SimulationInput,
    loading: HydrogenLoadingResult,
) -> tuple[RetentionResult, list[Diagnostic], bool]:
    diagnostics: list[Diagnostic] = []
    invalid = False
    initial = _q(loading.total_h2_mg_l)
    if input_data.retention.measured_time_series:
        method: Literal["measured_time_series", "first_order_assumption"] = "measured_time_series"
        raw_fraction, fraction_uncertainty = _measured_retention_fraction(input_data)
        basis = EvidenceBasis.MEASURED
        source_id = "measured-hydrogen-decay-series"
    else:
        method = "first_order_assumption"
        elapsed = _q(input_data.retention.elapsed_time_s)
        rate = _q(input_data.retention.first_order_rate_constant_per_s)
        raw_fraction = exp(-rate * elapsed)
        rate_u = input_data.retention.first_order_rate_constant_per_s.standard_uncertainty
        time_u = input_data.retention.elapsed_time_s.standard_uncertainty
        fraction_uncertainty = raw_fraction * sqrt((elapsed * rate_u) ** 2 + (rate * time_u) ** 2)
        basis = EvidenceBasis.USER_ASSUMPTION
        source_id = "first-order-retention-wide-assumption"
    if not 0.0 <= raw_fraction <= 1.0:
        invalid = True
        diagnostics.append(
            Diagnostic(
                code="invalid_retention_fraction",
                severity=Severity.ERROR,
                message="The measured or modeled retention fraction lies outside [0, 1].",
                details={"raw_retention_fraction": raw_fraction},
            )
        )
    storage_fraction = min(max(raw_fraction, 0.0), 1.0)
    handling_loss = _q(input_data.retention.handling_loss_fraction)
    delivery = _q(input_data.retention.intake_delivery_fraction)
    retained_fraction = storage_fraction * (1.0 - handling_loss) * delivery
    retained = initial * retained_fraction
    reported_release = input_data.retention.reported_released_fraction.value
    if reported_release is None:
        released = initial - retained
        unaccounted = 0.0
    else:
        released = initial * reported_release
        unaccounted = initial - retained - released
    retained_fraction_uncertainty = sqrt(
        (fraction_uncertainty * (1.0 - handling_loss) * delivery) ** 2
        + (
            storage_fraction
            * input_data.retention.handling_loss_fraction.standard_uncertainty
            * delivery
        )
        ** 2
        + (
            storage_fraction
            * (1.0 - handling_loss)
            * input_data.retention.intake_delivery_fraction.standard_uncertainty
        )
        ** 2
    )
    retained_uncertainty = sqrt(
        (loading.total_h2_mg_l.standard_uncertainty * retained_fraction) ** 2
        + (initial * retained_fraction_uncertainty) ** 2
    )
    return (
        RetentionResult(
            method=method,
            initial_total_h2_mg_l=loading.total_h2_mg_l,
            pre_handling_retention_fraction=ValueWithUncertainty(
                value=storage_fraction,
                unit="1",
                standard_uncertainty=min(fraction_uncertainty, 1.0),
                distribution=Distribution.NORMAL,
                source_id=source_id,
                basis=basis,
            ),
            handling_loss_fraction=input_data.retention.handling_loss_fraction.model_copy(
                deep=True
            ),
            intake_delivery_fraction=input_data.retention.intake_delivery_fraction.model_copy(
                deep=True
            ),
            retained_fraction=ValueWithUncertainty(
                value=retained_fraction,
                unit="1",
                standard_uncertainty=min(retained_fraction_uncertainty, 1.0),
                distribution=Distribution.NORMAL,
                source_id=source_id,
                basis=basis,
            ),
            released_h2_mg_l=ValueWithUncertainty(
                value=released,
                unit="mg/L",
                standard_uncertainty=retained_uncertainty,
                distribution=Distribution.NORMAL,
                source_id=source_id,
                basis=EvidenceBasis.DERIVED,
            ),
            retained_at_intake_mg_l=ValueWithUncertainty(
                value=retained,
                unit="mg/L",
                standard_uncertainty=retained_uncertainty,
                distribution=Distribution.NORMAL,
                source_id=source_id,
                basis=EvidenceBasis.DERIVED,
            ),
            unaccounted_h2_mg_l=ValueWithUncertainty(
                value=unaccounted,
                unit="mg/L",
                standard_uncertainty=retained_uncertainty,
                distribution=Distribution.NORMAL,
                source_id="hydrogen-mass-balance",
                basis=EvidenceBasis.DERIVED,
            ),
            release_method=input_data.retention.release_method,
            elapsed_time_s=_q(input_data.retention.elapsed_time_s),
            temperature_k=_q(input_data.environment.water_temperature_k),
            pressure_bar=_q(input_data.environment.water_pressure_bar),
        ),
        diagnostics,
        invalid,
    )


def _trapped_air_kg(input_data: SimulationInput) -> float:
    displacement_m3 = _q(input_data.engine.displacement_l) * 1.0e-3
    pressure_pa = _q(input_data.environment.intake_pressure_bar) * 1.0e5
    temperature_k = _q(input_data.environment.intake_temperature_k)
    volumetric_efficiency = _q(input_data.engine.volumetric_efficiency)
    return (
        pressure_pa
        * displacement_m3
        * volumetric_efficiency
        / (AIR_GAS_CONSTANT_J_PER_KG_K * temperature_k)
    )


def _required_h2_standard_uncertainty(
    input_data: SimulationInput,
    *,
    sample_count: int = 32_768,
) -> float:
    quantities = [
        (input_data.engine.displacement_l, 0.0, float("inf")),
        (input_data.environment.intake_pressure_bar, 0.0, float("inf")),
        (input_data.environment.intake_temperature_k, 1.0, 5_000.0),
        (input_data.engine.volumetric_efficiency, 0.0, 1.5),
        (input_data.combustion.target_equivalence_ratio, 0.0, float("inf")),
    ]
    lhs = latin_hypercube(sample_count, len(quantities), input_data.uncertainty.seed + 23)
    displacement_l, intake_pressure_bar, intake_temperature_k, efficiency, phi = [
        _sample_quantity_array(quantity, lhs[:, column], lower=lower, upper=upper)
        for column, (quantity, lower, upper) in enumerate(quantities)
    ]
    air_mg = (
        intake_pressure_bar
        * 1.0e5
        * displacement_l
        * 1.0e-3
        * efficiency
        / (AIR_GAS_CONSTANT_J_PER_KG_K * intake_temperature_k)
        * 1.0e6
    )
    required_mg = air_mg / H2_STOICH_AIR_MASS_RATIO * phi
    return float(np.std(required_mg))


def _domain_warnings(input_data: SimulationInput) -> list[str]:
    warnings: list[str] = []
    checks = (
        ("water temperature", _q(input_data.environment.water_temperature_k), 273.15, 373.15, "K"),
        ("water pressure", _q(input_data.environment.water_pressure_bar), 0.2, 100.0, "bar"),
        (
            "hydrogen partial pressure",
            _q(input_data.environment.water_pressure_bar)
            * _q(input_data.environment.hydrogen_headspace_mole_fraction),
            0.0,
            100.0,
            "bar",
        ),
        ("intake temperature", _q(input_data.environment.intake_temperature_k), 250.0, 500.0, "K"),
        ("intake pressure", _q(input_data.environment.intake_pressure_bar), 0.2, 5.0, "bar"),
        ("compression ratio", _q(input_data.engine.compression_ratio), 4.0, 25.0, "1"),
        (
            "equivalence ratio",
            _q(input_data.combustion.target_equivalence_ratio),
            0.1,
            2.0,
            "1",
        ),
    )
    for name, value, lower, upper, unit in checks:
        if not lower <= value <= upper:
            warnings.append(
                f"{name}={value:g} {unit} is outside the v1 domain [{lower:g}, {upper:g}]"
            )
    bore_displacement_l = (
        pi
        * (_q(input_data.engine.bore_mm) * 1.0e-3) ** 2
        / 4.0
        * (_q(input_data.engine.stroke_mm) * 1.0e-3)
        * 1.0e3
    )
    declared = _q(input_data.engine.displacement_l)
    mismatch = abs(bore_displacement_l - declared) / declared
    if mismatch > 0.02:
        warnings.append(
            f"bore/stroke displacement differs from declared displacement by {mismatch:.1%}"
        )
    return warnings


def _compute_gate(
    input_data: SimulationInput,
    loading: HydrogenLoadingResult,
    retention: RetentionResult,
    *,
    retention_invalid: bool,
    include_scalar_uncertainty: bool,
) -> GateResult:
    air_kg = _trapped_air_kg(input_data)
    air_mg = air_kg * 1.0e6
    oxygen_mg = air_mg * OXYGEN_MASS_FRACTION_DRY_AIR
    phi = _q(input_data.combustion.target_equivalence_ratio)
    hydrogen_required_mg = air_mg / H2_STOICH_AIR_MASS_RATIO * phi
    if input_data.scenario is Scenario.UPSTREAM_VAPORIZED_CARRIER:
        volume_l = _q(input_data.sample.carrier_volume_ml_per_cycle) / 1_000.0
        hydrogen_available_mg = _q(retention.retained_at_intake_mg_l) * volume_l
        available_uncertainty = sqrt(
            (retention.retained_at_intake_mg_l.standard_uncertainty * volume_l) ** 2
            + (
                _q(retention.retained_at_intake_mg_l)
                * input_data.sample.carrier_volume_ml_per_cycle.standard_uncertainty
                / 1_000.0
            )
            ** 2
        )
        initial_mg = _q(retention.initial_total_h2_mg_l) * volume_l
        retained_mg = hydrogen_available_mg
        released_mg = _q(retention.released_h2_mg_l) * volume_l
        unaccounted_mg = _q(retention.unaccounted_h2_mg_l) * volume_l
        water_mass_kg = volume_l * water_density_kg_l(
            _q(input_data.environment.water_temperature_k)
        )
    else:
        hydrogen_available_mg = _q(input_data.sample.separate_h2_mg_per_cycle)
        available_uncertainty = input_data.sample.separate_h2_mg_per_cycle.standard_uncertainty
        initial_mg = hydrogen_available_mg
        retained_mg = hydrogen_available_mg
        released_mg = 0.0
        unaccounted_mg = 0.0
        water_mass_kg = _q(input_data.sample.water_injection_mg_per_cycle) * 1.0e-6
    residual_mg = initial_mg - retained_mg - released_mg - unaccounted_mg
    relative_residual = abs(residual_mg) / max(abs(initial_mg), 1.0e-12)
    sensible_j, phase_j = water_heating_burden_j(
        water_mass_kg, _q(input_data.environment.water_temperature_k)
    )
    recovered_j = _q(input_data.heat_recovery.recovered_heat_j_per_cycle)
    total_water_burden_j = sensible_j + phase_j
    net_water_burden_j = max(total_water_burden_j - recovered_j, 0.0)
    net_external_preheat_j = (
        net_water_burden_j if input_data.scenario is Scenario.UPSTREAM_VAPORIZED_CARRIER else 0.0
    )
    # Energy is capped by H2 inventory, the selected target mixture, and the
    # oxygen that can actually react. Rich excess fuel is not free work.
    oxygen_limited_hydrogen_mg = oxygen_mg / H2_STOICH_OXYGEN_MASS_RATIO
    hydrogen_credited_mg = min(
        hydrogen_available_mg,
        hydrogen_required_mg,
        oxygen_limited_hydrogen_mg,
    )
    chemical_j = hydrogen_credited_mg * 1.0e-6 * H2_LHV_J_PER_KG
    wall_loss_j = chemical_j * _q(input_data.combustion.gate_wall_loss_fraction)
    target_work_j = (
        _q(input_data.engine.target_imep_bar) * _q(input_data.engine.displacement_l) * 100.0
    )
    if input_data.scenario is Scenario.UPSTREAM_VAPORIZED_CARRIER:
        energy_margin_j = chemical_j - wall_loss_j - target_work_j - net_external_preheat_j
    else:
        energy_margin_j = chemical_j - wall_loss_j - target_work_j - net_water_burden_j
    domain_warnings = _domain_warnings(input_data)
    failures: list[FailureCode] = []
    numeric_values = (
        hydrogen_available_mg,
        hydrogen_required_mg,
        chemical_j,
        energy_margin_j,
        relative_residual,
    )
    if retention_invalid or not all(isfinite(value) for value in numeric_values):
        failures.append(FailureCode.INVALID_DATA)
    tolerance_mg = max(abs(initial_mg) * MASS_BALANCE_RELATIVE_TOLERANCE, 1.0e-9)
    if relative_residual > MASS_BALANCE_RELATIVE_TOLERANCE or unaccounted_mg < -tolerance_mg:
        failures.append(FailureCode.MASS_BALANCE_FAILED)
    if hydrogen_available_mg + 1.0e-12 < hydrogen_required_mg or (
        input_data.scenario is Scenario.HYDROGEN_WITH_WATER_INJECTION and energy_margin_j < 0.0
    ):
        failures.append(FailureCode.INSUFFICIENT_H2)
    if input_data.scenario is Scenario.UPSTREAM_VAPORIZED_CARRIER and energy_margin_j < 0.0:
        failures.append(FailureCode.PREHEAT_DEFICIT)
    if domain_warnings:
        failures.append(FailureCode.OUTSIDE_MODEL_DOMAIN)
    # Preserve stable order and remove any duplicate code.
    ordered = [
        FailureCode.INVALID_DATA,
        FailureCode.MASS_BALANCE_FAILED,
        FailureCode.INSUFFICIENT_H2,
        FailureCode.PREHEAT_DEFICIT,
        FailureCode.OUTSIDE_MODEL_DOMAIN,
    ]
    failures = [code for code in ordered if code in failures]
    passed = not failures
    if passed:
        failures = [FailureCode.PASS]
    required_uncertainty = (
        _required_h2_standard_uncertainty(input_data) if include_scalar_uncertainty else 0.0
    )
    return GateResult(
        passed=passed,
        failures=failures,
        hydrogen_required=ValueWithUncertainty(
            value=hydrogen_required_mg,
            unit="mg/cycle",
            standard_uncertainty=required_uncertainty,
            distribution=Distribution.NORMAL,
            source_id="stoichiometric-intake-mass-balance",
            basis=EvidenceBasis.DERIVED,
        ),
        hydrogen_available=ValueWithUncertainty(
            value=hydrogen_available_mg,
            unit="mg/cycle",
            standard_uncertainty=available_uncertainty,
            distribution=Distribution.NORMAL,
            source_id="retained-h2-at-intake",
            basis=EvidenceBasis.DERIVED,
        ),
        hydrogen_mass_margin_mg_per_cycle=hydrogen_available_mg - hydrogen_required_mg,
        trapped_air_mg_per_cycle=air_mg,
        oxygen_available_mg_per_cycle=oxygen_mg,
        energy_terms=EnergyTerms(
            hydrogen_chemical_energy_j=chemical_j,
            water_sensible_heating_j=sensible_j,
            water_phase_change_j=phase_j,
            heat_recovery_j=recovered_j,
            net_external_preheat_j=net_external_preheat_j,
            estimated_wall_loss_j=wall_loss_j,
            target_indicated_work_j=target_work_j,
            usable_energy_margin_j=energy_margin_j,
        ),
        mass_balance=MassBalance(
            initial_h2_mg_per_cycle=initial_mg,
            retained_h2_mg_per_cycle=retained_mg,
            released_h2_mg_per_cycle=released_mg,
            unaccounted_h2_mg_per_cycle=unaccounted_mg,
            residual_h2_mg_per_cycle=residual_mg,
            relative_residual=relative_residual,
        ),
        domain_warnings=domain_warnings,
    )


def slider_crank_volume_m3(
    crank_angle_deg: float | np.ndarray,
    engine: EngineInput,
) -> float | np.ndarray:
    """Cylinder volume with TDC at zero degrees and BDC at +/-180 degrees."""

    theta = np.deg2rad(crank_angle_deg)
    stroke_m = _q(engine.stroke_mm) * 1.0e-3
    crank_radius_m = stroke_m / 2.0
    rod_m = _q(engine.connecting_rod_mm) * 1.0e-3
    displacement_m3 = _q(engine.displacement_l) * 1.0e-3
    piston_area_m2 = displacement_m3 / stroke_m
    clearance_m3 = displacement_m3 / (_q(engine.compression_ratio) - 1.0)
    radicand = np.maximum(rod_m**2 - (crank_radius_m * np.sin(theta)) ** 2, 0.0)
    piston_travel_m = crank_radius_m * (1.0 - np.cos(theta)) + rod_m - np.sqrt(radicand)
    volume = clearance_m3 + piston_area_m2 * piston_travel_m
    if np.isscalar(crank_angle_deg):
        return float(volume)
    return np.asarray(volume, dtype=float)


def wiebe_burn_fraction(
    crank_angle_deg: float | np.ndarray,
    *,
    start_deg: float,
    duration_deg: float,
    a: float,
    m: float,
) -> float | np.ndarray:
    theta = np.asarray(crank_angle_deg, dtype=float)
    normalized = np.clip((theta - start_deg) / duration_deg, 0.0, 1.0)
    burned = 1.0 - np.exp(-a * normalized ** (m + 1.0))
    burned = np.where(theta >= start_deg + duration_deg, 1.0, burned)
    if np.isscalar(crank_angle_deg):
        return float(burned)
    return burned


def _motored_trace(input_data: SimulationInput) -> CycleTrace:
    crank = np.linspace(-180.0, 180.0, 361)
    volume = np.asarray(slider_crank_volume_m3(crank, input_data.engine), dtype=float)
    bdc_volume = float(volume[0])
    gamma = _q(input_data.combustion.motored_gamma)
    intake_pressure_pa = _q(input_data.environment.intake_pressure_bar) * 1.0e5
    intake_temperature_k = _q(input_data.environment.intake_temperature_k)
    pressure = intake_pressure_pa * (bdc_volume / volume) ** gamma
    temperature = intake_temperature_k * (bdc_volume / volume) ** (gamma - 1.0)
    air_mg = _trapped_air_kg(input_data) * 1.0e6
    o2_mg = air_mg * OXYGEN_MASS_FRACTION_DRY_AIR
    n2_mg = air_mg - o2_mg
    zeros = np.zeros_like(crank)
    work_j = float(np.trapezoid(pressure, volume))
    displacement_m3 = _q(input_data.engine.displacement_l) * 1.0e-3
    return CycleTrace(
        crank_angle_deg=crank.tolist(),
        volume_m3=volume.tolist(),
        pressure_pa=pressure.tolist(),
        temperature_k=temperature.tolist(),
        h2_mg=zeros.tolist(),
        o2_mg=np.full_like(crank, o2_mg).tolist(),
        n2_mg=np.full_like(crank, n2_mg).tolist(),
        h2o_vapor_mg=zeros.tolist(),
        water_liquid_mg=zeros.tolist(),
        water_vapor_mg=zeros.tolist(),
        cumulative_heat_release_j=zeros.tolist(),
        cumulative_wall_heat_loss_j=zeros.tolist(),
        cumulative_vaporization_heat_j=zeros.tolist(),
        pv_work_j=work_j,
        imep_bar=work_j / displacement_m3 / 1.0e5,
        upper_bound_indicated_efficiency=None,
        adiabatic_flame_temperature_k=None,
        relative_thermal_nox_risk="not_applicable",
        energy_conservation_residual_fraction=0.0,
    )


@dataclass(frozen=True)
class _CanteraSensibleState:
    internal_energy_j_per_kg: float
    enthalpy_j_per_kg: float
    cv_j_per_kg_k: float
    gas_constant_j_per_kg_k: float


@dataclass
class _CanteraCycleThermo:
    """Temperature-dependent ideal-gas properties with chemical energy removed.

    Combustion energy enters the first law through the explicit LHV/Wiebe heat
    release. Subtracting each composition's 298.15 K reference state prevents
    Cantera formation energies from being counted a second time while retaining
    temperature- and composition-dependent sensible internal energy/enthalpy.
    """

    phase: Any
    reference_pressure_pa: float
    reference_temperature_k: float = 298.15

    def sensible_state(
        self,
        temperature_k: float,
        composition: dict[str, float],
    ) -> _CanteraSensibleState:
        self.phase.TPX = temperature_k, self.reference_pressure_pa, composition
        internal_energy = float(self.phase.int_energy_mass)
        enthalpy = float(self.phase.enthalpy_mass)
        cv_mass = float(self.phase.cv_mass)
        gas_constant = float(
            UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K * 1_000.0 / self.phase.mean_molecular_weight
        )
        self.phase.TPX = (
            self.reference_temperature_k,
            self.reference_pressure_pa,
            composition,
        )
        return _CanteraSensibleState(
            internal_energy_j_per_kg=internal_energy - float(self.phase.int_energy_mass),
            enthalpy_j_per_kg=enthalpy - float(self.phase.enthalpy_mass),
            cv_j_per_kg_k=cv_mass,
            gas_constant_j_per_kg_k=gas_constant,
        )


def _cycle_molar_composition(
    *,
    h2_mg: float,
    oxygen_mg: float,
    nitrogen_mg: float,
    water_mg: float,
) -> dict[str, float]:
    return {
        "H2": max(h2_mg, 0.0) * 1.0e-6 / H2_MOLAR_MASS_KG_PER_MOL,
        "O2": max(oxygen_mg, 0.0) * 1.0e-6 / 0.0319988,
        "N2": max(nitrogen_mg, 0.0) * 1.0e-6 / 0.0280134,
        "H2O": max(water_mg, 0.0) * 1.0e-6 / WATER_MOLAR_MASS_KG_PER_MOL,
    }


def _cantera_properties(
    input_data: SimulationInput,
    *,
    h2_mg: float,
    oxygen_mg: float,
    nitrogen_mg: float,
    water_mg: float,
    cycle_water_mg: float,
) -> tuple[
    float,
    float,
    float | None,
    _CanteraCycleThermo | None,
    list[Diagnostic],
]:
    diagnostics: list[Diagnostic] = []
    temperature = _q(input_data.environment.intake_temperature_k)
    pressure = _q(input_data.environment.intake_pressure_bar) * 1.0e5
    try:
        import cantera as ct

        gas = ct.Solution(MECHANISM_NAME)
        composition = _cycle_molar_composition(
            h2_mg=h2_mg,
            oxygen_mg=oxygen_mg,
            nitrogen_mg=nitrogen_mg,
            water_mg=cycle_water_mg,
        )
        gas.TPX = temperature, pressure, composition
        cv_mass = float(gas.cv_mass)
        gas_constant = float(ct.gas_constant / gas.mean_molecular_weight)
        cycle_thermo = _CanteraCycleThermo(gas, pressure)
        gas.TPX = (
            temperature,
            pressure,
            _cycle_molar_composition(
                h2_mg=h2_mg,
                oxygen_mg=oxygen_mg,
                nitrogen_mg=nitrogen_mg,
                water_mg=water_mg,
            ),
        )
        gas.equilibrate("HP")
        adiabatic_temperature = float(gas.T)
        return cv_mass, gas_constant, adiabatic_temperature, cycle_thermo, diagnostics
    except Exception as error:
        total_mass_kg = (h2_mg + oxygen_mg + nitrogen_mg + water_mg) * 1.0e-6
        credited_h2_kg = min(h2_mg, oxygen_mg / H2_STOICH_OXYGEN_MASS_RATIO) * 1.0e-6
        fallback_tad = min(
            4_000.0,
            temperature + credited_h2_kg * H2_LHV_J_PER_KG / max(total_mass_kg * 1_050.0, 1.0e-12),
        )
        diagnostics.append(
            Diagnostic(
                code="cantera_thermodynamics_fallback",
                severity=Severity.WARNING,
                message=(
                    "Cantera thermodynamic properties were unavailable; the 0D trace uses an "
                    "explicit constant-property ideal-gas fallback and is further limited."
                ),
                details={"error_type": type(error).__name__, "mechanism": MECHANISM_NAME},
            )
        )
        return 760.0, AIR_GAS_CONSTANT_J_PER_KG_K, fallback_tad, None, diagnostics


def _hohenberg_style_heat_transfer_w_m2_k(
    *, volume_m3: float, pressure_pa: float, temperature_k: float, mean_piston_speed_m_s: float
) -> float:
    pressure_bar = max(pressure_pa / 1.0e5, 0.05)
    coefficient = (
        130.0
        * max(volume_m3, 1.0e-8) ** -0.06
        * pressure_bar**0.8
        * max(temperature_k, 200.0) ** -0.4
        * (mean_piston_speed_m_s + 1.4) ** 0.8
    )
    return float(min(max(coefficient, 0.0), 10_000.0))


def _solve_cantera_temperature_step(
    *,
    thermo: _CanteraCycleThermo,
    composition: dict[str, float],
    next_total_mass_kg: float,
    previous_internal_energy_j: float,
    net_heat_j: float,
    previous_pressure_pa: float,
    delta_volume_m3: float,
    next_volume_m3: float,
    intake_pressure_state_coefficient_j_k: float,
    intake_gas_constant_j_per_kg_k: float,
    intake_total_mass_kg: float,
    initial_guess_k: float,
) -> tuple[float, float, _CanteraSensibleState, bool]:
    """Solve one implicit first-law step using Cantera's nonlinear U(T, Y).

    Boundary work is trapezoidal. The intake pressure coefficient preserves the
    declared intake state while the Cantera gas-constant ratio carries the
    composition change through subsequent states.
    """

    right_hand_side_j = (
        previous_internal_energy_j + net_heat_j - 0.5 * previous_pressure_pa * delta_volume_m3
    )
    temperature_k = min(max(initial_guess_k, 150.0), 6_000.0)
    converged = False
    state = thermo.sensible_state(temperature_k, composition)
    pressure_state_coefficient = intake_pressure_state_coefficient_j_k * (
        next_total_mass_kg
        * state.gas_constant_j_per_kg_k
        / (intake_total_mass_kg * intake_gas_constant_j_per_kg_k)
    )
    for _ in range(20):
        state = thermo.sensible_state(temperature_k, composition)
        pressure_state_coefficient = intake_pressure_state_coefficient_j_k * (
            next_total_mass_kg
            * state.gas_constant_j_per_kg_k
            / (intake_total_mass_kg * intake_gas_constant_j_per_kg_k)
        )
        residual_j = (
            next_total_mass_kg * state.internal_energy_j_per_kg
            + 0.5 * pressure_state_coefficient * temperature_k / next_volume_m3 * delta_volume_m3
            - right_hand_side_j
        )
        tolerance_j = max(1.0e-7, 1.0e-10 * max(abs(right_hand_side_j), 1.0))
        if abs(residual_j) <= tolerance_j:
            converged = True
            break
        derivative_j_per_k = (
            next_total_mass_kg * state.cv_j_per_kg_k
            + 0.5 * pressure_state_coefficient / next_volume_m3 * delta_volume_m3
        )
        if not isfinite(derivative_j_per_k) or derivative_j_per_k <= 1.0e-12:
            break
        next_temperature = temperature_k - residual_j / derivative_j_per_k
        temperature_k = min(max(next_temperature, 150.0), 6_000.0)
    state = thermo.sensible_state(temperature_k, composition)
    pressure_state_coefficient = intake_pressure_state_coefficient_j_k * (
        next_total_mass_kg
        * state.gas_constant_j_per_kg_k
        / (intake_total_mass_kg * intake_gas_constant_j_per_kg_k)
    )
    pressure_pa = pressure_state_coefficient * temperature_k / next_volume_m3
    return temperature_k, pressure_pa, state, converged


def _reactive_trace(
    input_data: SimulationInput,
    gate: GateResult,
) -> tuple[CycleTrace, list[Diagnostic]]:
    crank = np.linspace(-180.0, 180.0, 361)
    volume = np.asarray(slider_crank_volume_m3(crank, input_data.engine), dtype=float)
    pressure = np.empty_like(crank)
    temperature = np.empty_like(crank)
    pressure[0] = _q(input_data.environment.intake_pressure_bar) * 1.0e5
    temperature[0] = _q(input_data.environment.intake_temperature_k)
    air_mg = gate.trapped_air_mg_per_cycle
    oxygen_initial_mg = gate.oxygen_available_mg_per_cycle
    nitrogen_mg = air_mg - oxygen_initial_mg
    available_h2_mg = _q(gate.hydrogen_available)
    target_h2_mg = _q(gate.hydrogen_required)
    cycle_h2_charge_mg = min(available_h2_mg, target_h2_mg)
    burnable_h2_mg = min(
        cycle_h2_charge_mg,
        oxygen_initial_mg / H2_STOICH_OXYGEN_MASS_RATIO,
    )
    if input_data.scenario is Scenario.UPSTREAM_VAPORIZED_CARRIER:
        water_mg = (
            _q(input_data.sample.carrier_volume_ml_per_cycle)
            * water_density_kg_l(_q(input_data.environment.water_temperature_k))
            * 1_000.0
        )
        internal_vaporization_j = 0.0
        vapor_fraction = np.ones_like(crank)
    else:
        water_mg = _q(input_data.sample.water_injection_mg_per_cycle)
        sensible, phase = water_heating_burden_j(
            water_mg * 1.0e-6, _q(input_data.environment.water_temperature_k)
        )
        recovered = _q(input_data.heat_recovery.recovered_heat_j_per_cycle)
        internal_vaporization_j = max(sensible + phase - recovered, 0.0)
        vapor_fraction = np.asarray(
            wiebe_burn_fraction(
                crank,
                start_deg=-80.0,
                duration_deg=120.0,
                a=4.0,
                m=1.0,
            ),
            dtype=float,
        )
    cv_mass, intake_gas_constant, adiabatic_temperature, cycle_thermo, diagnostics = (
        _cantera_properties(
            input_data,
            h2_mg=cycle_h2_charge_mg,
            oxygen_mg=oxygen_initial_mg,
            nitrogen_mg=nitrogen_mg,
            water_mg=water_mg,
            cycle_water_mg=float(water_mg * vapor_fraction[0]),
        )
    )
    burn_fraction = np.asarray(
        wiebe_burn_fraction(
            crank,
            start_deg=_q(input_data.combustion.combustion_start_deg_atdc),
            duration_deg=_q(input_data.combustion.combustion_duration_deg),
            a=_q(input_data.combustion.wiebe_a),
            m=_q(input_data.combustion.wiebe_m),
        ),
        dtype=float,
    )
    chemical_release_j = (
        burnable_h2_mg * 1.0e-6 * H2_LHV_J_PER_KG * _q(input_data.combustion.combustion_efficiency)
    )
    cumulative_combustion = chemical_release_j * burn_fraction
    cumulative_vaporization = internal_vaporization_j * vapor_fraction
    cumulative_wall = np.zeros_like(crank)
    burned_h2 = burnable_h2_mg * burn_fraction
    h2_remaining = cycle_h2_charge_mg - burned_h2
    oxygen_remaining = np.maximum(
        oxygen_initial_mg - burned_h2 * H2_STOICH_OXYGEN_MASS_RATIO,
        0.0,
    )
    produced_water_mg = burned_h2 * (1.0 + H2_STOICH_OXYGEN_MASS_RATIO)
    injected_vapor_mg = water_mg * vapor_fraction
    liquid_water_mg = water_mg * (1.0 - vapor_fraction)
    stroke_m = _q(input_data.engine.stroke_mm) * 1.0e-3
    displacement_m3 = _q(input_data.engine.displacement_l) * 1.0e-3
    piston_area_m2 = displacement_m3 / stroke_m
    equivalent_bore_m = sqrt(4.0 * piston_area_m2 / pi)
    clearance_m3 = displacement_m3 / (_q(input_data.engine.compression_ratio) - 1.0)
    mean_piston_speed = 2.0 * stroke_m * _q(input_data.engine.speed_rpm) / 60.0
    seconds_per_degree = 1.0 / (6.0 * _q(input_data.engine.speed_rpm))
    thermodynamic_mass_kg = (
        h2_remaining + oxygen_remaining + nitrogen_mg + produced_water_mg + injected_vapor_mg
    ) * 1.0e-6
    intake_thermodynamic_mass_kg = max(float(thermodynamic_mass_kg[0]), 1.0e-12)
    heat_capacity_j_k = max(intake_thermodynamic_mass_kg * cv_mass, 1.0e-9)
    # Preserve the specified intake state exactly. The homogeneous carrier
    # displaces part of the charge in reality; a 0D model must not introduce an
    # artificial pressure jump by independently summing every phase as ideal gas.
    pressure_state_coefficient_j_k = pressure[0] * volume[0] / temperature[0]
    sensible_internal_energy_j = np.zeros_like(crank)
    sensible_enthalpy_j = np.zeros_like(crank)
    cv_history_j_per_kg_k = np.full_like(crank, cv_mass)
    cantera_solve_failed = False
    if cycle_thermo is not None:
        initial_composition = _cycle_molar_composition(
            h2_mg=float(h2_remaining[0]),
            oxygen_mg=float(oxygen_remaining[0]),
            nitrogen_mg=nitrogen_mg,
            water_mg=float(produced_water_mg[0] + injected_vapor_mg[0]),
        )
        initial_state = cycle_thermo.sensible_state(temperature[0], initial_composition)
        sensible_internal_energy_j[0] = (
            intake_thermodynamic_mass_kg * initial_state.internal_energy_j_per_kg
        )
        sensible_enthalpy_j[0] = intake_thermodynamic_mass_kg * initial_state.enthalpy_j_per_kg
        cv_history_j_per_kg_k[0] = initial_state.cv_j_per_kg_k
        intake_gas_constant = initial_state.gas_constant_j_per_kg_k
    else:
        sensible_internal_energy_j[0] = heat_capacity_j_k * temperature[0]
        sensible_enthalpy_j[0] = heat_capacity_j_k * temperature[0]
    for index in range(1, len(crank)):
        delta_volume = volume[index] - volume[index - 1]
        delta_combustion = cumulative_combustion[index] - cumulative_combustion[index - 1]
        delta_vaporization = cumulative_vaporization[index] - cumulative_vaporization[index - 1]
        gas_height_m = max((volume[index - 1] - clearance_m3) / piston_area_m2, 0.0)
        surface_area_m2 = 2.0 * piston_area_m2 + pi * equivalent_bore_m * gas_height_m
        htc = _hohenberg_style_heat_transfer_w_m2_k(
            volume_m3=float(volume[index - 1]),
            pressure_pa=float(pressure[index - 1]),
            temperature_k=float(temperature[index - 1]),
            mean_piston_speed_m_s=mean_piston_speed,
        )
        delta_time_s = abs(crank[index] - crank[index - 1]) * seconds_per_degree
        delta_wall = (
            htc
            * surface_area_m2
            * max(temperature[index - 1] - _q(input_data.combustion.wall_temperature_k), 0.0)
            * delta_time_s
        )
        cumulative_wall[index] = cumulative_wall[index - 1] + delta_wall
        net_heat_j = delta_combustion - delta_wall - delta_vaporization
        if cycle_thermo is not None:
            composition = _cycle_molar_composition(
                h2_mg=float(h2_remaining[index]),
                oxygen_mg=float(oxygen_remaining[index]),
                nitrogen_mg=nitrogen_mg,
                water_mg=float(produced_water_mg[index] + injected_vapor_mg[index]),
            )
            next_thermodynamic_mass_kg = max(
                float(thermodynamic_mass_kg[index]),
                1.0e-12,
            )
            (
                temperature[index],
                pressure[index],
                thermo_state,
                converged,
            ) = _solve_cantera_temperature_step(
                thermo=cycle_thermo,
                composition=composition,
                next_total_mass_kg=next_thermodynamic_mass_kg,
                previous_internal_energy_j=float(sensible_internal_energy_j[index - 1]),
                net_heat_j=net_heat_j,
                previous_pressure_pa=float(pressure[index - 1]),
                delta_volume_m3=float(delta_volume),
                next_volume_m3=float(volume[index]),
                intake_pressure_state_coefficient_j_k=float(pressure_state_coefficient_j_k),
                intake_gas_constant_j_per_kg_k=float(intake_gas_constant),
                intake_total_mass_kg=intake_thermodynamic_mass_kg,
                initial_guess_k=float(temperature[index - 1]),
            )
            sensible_internal_energy_j[index] = (
                next_thermodynamic_mass_kg * thermo_state.internal_energy_j_per_kg
            )
            sensible_enthalpy_j[index] = next_thermodynamic_mass_kg * thermo_state.enthalpy_j_per_kg
            cv_history_j_per_kg_k[index] = thermo_state.cv_j_per_kg_k
            cantera_solve_failed = cantera_solve_failed or not converged
        else:
            # Explicit constant-property fallback used only when Cantera cannot
            # supply a state. It remains diagnostic and further limited.
            next_heat_capacity_j_k = max(
                float(thermodynamic_mass_kg[index]) * cv_mass,
                1.0e-9,
            )
            next_pressure_state_coefficient_j_k = (
                pressure_state_coefficient_j_k
                * float(thermodynamic_mass_kg[index])
                / intake_thermodynamic_mass_kg
            )
            numerator = (
                sensible_internal_energy_j[index - 1]
                + net_heat_j
                - 0.5 * pressure[index - 1] * delta_volume
            )
            denominator = next_heat_capacity_j_k + (
                0.5 * next_pressure_state_coefficient_j_k / volume[index] * delta_volume
            )
            temperature[index] = max(numerator / max(denominator, 1.0e-12), 200.0)
            pressure[index] = (
                next_pressure_state_coefficient_j_k * temperature[index] / volume[index]
            )
            sensible_internal_energy_j[index] = next_heat_capacity_j_k * temperature[index]
            sensible_enthalpy_j[index] = next_heat_capacity_j_k * temperature[index]
    pv_work_j = float(np.trapezoid(pressure, volume))
    imep_bar = pv_work_j / displacement_m3 / 1.0e5
    efficiency = pv_work_j / chemical_release_j if chemical_release_j > 0.0 else None
    internal_energy_change = sensible_internal_energy_j[-1] - sensible_internal_energy_j[0]
    expected_internal_change = (
        cumulative_combustion[-1] - cumulative_wall[-1] - cumulative_vaporization[-1] - pv_work_j
    )
    residual_fraction = abs(internal_energy_change - expected_internal_change) / max(
        abs(cumulative_combustion[-1]), 1.0
    )
    peak_temperature = float(np.max(temperature))
    if peak_temperature < 1_800.0:
        nox_risk: Literal["low", "moderate", "high", "not_applicable"] = "low"
    elif peak_temperature < 2_200.0:
        nox_risk = "moderate"
    else:
        nox_risk = "high"
    if residual_fraction > 0.005:
        diagnostics.append(
            Diagnostic(
                code="energy_conservation_residual",
                severity=Severity.WARNING,
                message="The 0D integration energy residual exceeds the 0.5% nominal tolerance.",
                details={"relative_residual": residual_fraction},
            )
        )
    if cycle_thermo is not None:
        diagnostics.append(
            Diagnostic(
                code="cantera_temperature_dependent_cycle_properties",
                severity=Severity.INFO,
                message=(
                    "Each crank-angle step solved composition-dependent sensible internal "
                    "energy and enthalpy with Cantera; 298.15 K formation-energy references "
                    "were removed to avoid double-counting explicit LHV heat release."
                ),
                details={
                    "cv_min_j_per_kg_k": float(np.min(cv_history_j_per_kg_k)),
                    "cv_max_j_per_kg_k": float(np.max(cv_history_j_per_kg_k)),
                    "sensible_enthalpy_change_j": float(
                        sensible_enthalpy_j[-1] - sensible_enthalpy_j[0]
                    ),
                    "composition_updated_each_step": True,
                },
            )
        )
    if cantera_solve_failed:
        diagnostics.append(
            Diagnostic(
                code="cantera_temperature_solve_not_converged",
                severity=Severity.WARNING,
                message=(
                    "At least one crank-angle temperature solve reached its iteration or "
                    "temperature bound; treat the proposed trace as outside nominal solver "
                    "acceptance."
                ),
                details={"temperature_bounds_k": [150.0, 6_000.0]},
            )
        )
    return (
        CycleTrace(
            crank_angle_deg=crank.tolist(),
            volume_m3=volume.tolist(),
            pressure_pa=pressure.tolist(),
            temperature_k=temperature.tolist(),
            h2_mg=h2_remaining.tolist(),
            o2_mg=oxygen_remaining.tolist(),
            n2_mg=np.full_like(crank, nitrogen_mg).tolist(),
            h2o_vapor_mg=(produced_water_mg + injected_vapor_mg).tolist(),
            water_liquid_mg=liquid_water_mg.tolist(),
            water_vapor_mg=injected_vapor_mg.tolist(),
            cumulative_heat_release_j=cumulative_combustion.tolist(),
            cumulative_wall_heat_loss_j=cumulative_wall.tolist(),
            cumulative_vaporization_heat_j=cumulative_vaporization.tolist(),
            pv_work_j=pv_work_j,
            imep_bar=imep_bar,
            upper_bound_indicated_efficiency=efficiency,
            adiabatic_flame_temperature_k=adiabatic_temperature,
            relative_thermal_nox_risk=nox_risk,
            energy_conservation_residual_fraction=residual_fraction,
        ),
        diagnostics,
    )


@dataclass(frozen=True)
class _Evaluation:
    loading: HydrogenLoadingResult
    retention: RetentionResult
    gate: GateResult
    motored: CycleTrace
    proposed: CycleTrace | None
    diagnostics: list[Diagnostic]


def _evaluate_deterministic(
    input_data: SimulationInput,
    *,
    include_cycle: bool,
    include_scalar_uncertainty: bool = False,
) -> _Evaluation:
    loading, loading_diagnostics = _compute_loading(
        input_data,
        include_scalar_uncertainty=include_scalar_uncertainty,
    )
    retention, retention_diagnostics, retention_invalid = _compute_retention(input_data, loading)
    gate = _compute_gate(
        input_data,
        loading,
        retention,
        retention_invalid=retention_invalid,
        include_scalar_uncertainty=include_scalar_uncertainty,
    )
    motored = _motored_trace(input_data)
    proposed: CycleTrace | None = None
    cycle_diagnostics: list[Diagnostic] = []
    if gate.passed and include_cycle:
        proposed, cycle_diagnostics = _reactive_trace(input_data, gate)
    return _Evaluation(
        loading=loading,
        retention=retention,
        gate=gate,
        motored=motored,
        proposed=proposed,
        diagnostics=loading_diagnostics + retention_diagnostics + cycle_diagnostics,
    )


PathPart = str | int
ParameterPath = tuple[PathPart, ...]


def _walk_uncertain_values(
    value: Any, path: ParameterPath = ()
) -> Iterable[tuple[ParameterPath, ValueWithUncertainty]]:
    if isinstance(value, ValueWithUncertainty):
        if value.value is not None and value.standard_uncertainty > 0.0:
            yield path, value
        return
    if isinstance(value, BaseModel):
        for name in value.__class__.model_fields:
            if name == "uncertainty":
                continue
            yield from _walk_uncertain_values(getattr(value, name), (*path, name))
        return
    if isinstance(value, list):
        for index, item in enumerate(value):
            yield from _walk_uncertain_values(item, (*path, index))


def _get_path(root: Any, path: Sequence[PathPart]) -> Any:
    current = root
    for part in path:
        current = current[part] if isinstance(part, int) else getattr(current, part)
    return current


def _set_quantity_value(root: Any, path: Sequence[PathPart], value: float) -> None:
    quantity = _get_path(root, path)
    quantity.value = value


def _parameter_bounds(path: ParameterPath) -> tuple[float, float]:
    name = str(path[-1])
    path_text = ".".join(str(part) for part in path)
    if "fraction" in name or name in {"volumetric_efficiency", "combustion_efficiency"}:
        return 0.0, 1.0 if name != "volumetric_efficiency" else 1.5
    if name == "compression_ratio":
        return 1.001, 30.0
    if name == "motored_gamma":
        return 1.01, 1.67
    if name == "combustion_start_deg_atdc":
        return -90.0, 90.0
    if "temperature" in name:
        return 1.0, 5_000.0
    if "diameter_nm" in path_text:
        return 1.0, 1.0e6
    if name == "connecting_rod_mm":
        return 1.0, 10_000.0
    return 0.0, float("inf")


def _sampled_inputs(
    input_data: SimulationInput, count: int, seed: int
) -> Iterable[SimulationInput]:
    parameters = list(_walk_uncertain_values(input_data))
    correlation_keys: list[tuple[object, ...]] = []
    key_to_column: dict[tuple[object, ...], int] = {}
    parameter_columns: list[int] = []
    for path, quantity in parameters:
        # An identical physical quantity may appear in two contract locations
        # (for example authoritative total H2 and the first decay point). Keep
        # those aliases on one LHS coordinate while leaving distinct points
        # from the same calibration independently sampled.
        key: tuple[object, ...]
        if quantity.source_id:
            key = (
                "quantity",
                quantity.source_id,
                quantity.unit,
                quantity.value,
                quantity.standard_uncertainty,
                quantity.distribution.value,
            )
        else:
            key = ("path", *path)
        column = key_to_column.get(key)
        if column is None:
            column = len(correlation_keys)
            correlation_keys.append(key)
            key_to_column[key] = column
        parameter_columns.append(column)
    lhs = latin_hypercube(count, len(correlation_keys), seed)
    for row in lhs:
        sampled = input_data.model_copy(deep=True)
        for (path, quantity), column in zip(parameters, parameter_columns, strict=True):
            raw_value = sample_quantity(quantity, float(row[column]))
            lower, upper = _parameter_bounds(path)
            bounded = min(max(raw_value, lower), upper)
            _set_quantity_value(sampled, path, bounded)
        yield sampled


def _interval(values: Sequence[float], unit: str) -> Interval95:
    return interval_95(list(values), unit)


def _one_at_a_time_sensitivities(
    input_data: SimulationInput,
    base_margin_j: float,
) -> list[SensitivityEntry]:
    raw_effects: list[tuple[str, float]] = []
    for path, quantity in _walk_uncertain_values(input_data):
        lower, upper = _parameter_bounds(path)
        delta = quantity.standard_uncertainty
        low_value = max(_q(quantity) - delta, lower)
        high_value = min(_q(quantity) + delta, upper)
        if high_value <= low_value:
            continue
        low_input = input_data.model_copy(deep=True)
        high_input = input_data.model_copy(deep=True)
        _set_quantity_value(low_input, path, low_value)
        _set_quantity_value(high_input, path, high_value)
        low_margin = _evaluate_deterministic(
            low_input, include_cycle=False
        ).gate.energy_terms.usable_energy_margin_j
        high_margin = _evaluate_deterministic(
            high_input, include_cycle=False
        ).gate.energy_terms.usable_energy_margin_j
        effect = (high_margin - low_margin) / 2.0
        raw_effects.append((".".join(str(part) for part in path), effect))
    scale = max((abs(effect) for _, effect in raw_effects), default=max(abs(base_margin_j), 1.0))
    if scale == 0.0:
        scale = 1.0
    sensitivities: list[SensitivityEntry] = []
    for parameter, effect in sorted(raw_effects, key=lambda item: abs(item[1]), reverse=True):
        normalized = max(min(effect / scale, 1.0), -1.0)
        direction: Literal["increases", "decreases", "neutral"]
        if abs(normalized) < 1.0e-9:
            direction = "neutral"
        elif normalized > 0.0:
            direction = "increases"
        else:
            direction = "decreases"
        sensitivities.append(
            SensitivityEntry(
                parameter=parameter,
                output_metric="usable_energy_margin_j",
                normalized_effect=normalized,
                direction=direction,
            )
        )
    return sensitivities


def _propagate_uncertainty(
    input_data: SimulationInput,
    base: _Evaluation,
) -> tuple[UncertaintyResult, TraceUncertaintyBands | None, list[Diagnostic]]:
    settings = input_data.uncertainty
    sensitivities = _one_at_a_time_sensitivities(
        input_data, base.gate.energy_terms.usable_energy_margin_j
    )
    if not settings.enabled:
        margin = base.gate.energy_terms.usable_energy_margin_j
        available = _q(base.gate.hydrogen_available)
        return (
            UncertaintyResult(
                enabled=False,
                seed=settings.seed,
                analytical_samples=1,
                cycle_samples_requested=0,
                energy_margin_95=_interval([margin], "J/cycle"),
                hydrogen_available_95=_interval([available], "mg/cycle"),
                gate_pass_probability=1.0 if base.gate.passed else 0.0,
                sensitivities=sensitivities,
            ),
            None,
            [],
        )
    margins: list[float] = []
    available_values: list[float] = []
    passes = 0
    for sampled in _sampled_inputs(input_data, settings.analytical_samples, settings.seed):
        evaluated = _evaluate_deterministic(sampled, include_cycle=False)
        margins.append(evaluated.gate.energy_terms.usable_energy_margin_j)
        available_values.append(_q(evaluated.gate.hydrogen_available))
        passes += int(evaluated.gate.passed)
    bands: TraceUncertaintyBands | None = None
    diagnostics: list[Diagnostic] = []
    if base.proposed is not None:
        pressures: list[list[float]] = []
        temperatures: list[list[float]] = []
        for sampled in _sampled_inputs(input_data, settings.cycle_samples, settings.seed + 1):
            evaluated = _evaluate_deterministic(sampled, include_cycle=True)
            if evaluated.proposed is not None:
                pressures.append(evaluated.proposed.pressure_pa)
                temperatures.append(evaluated.proposed.temperature_k)
        if pressures:
            pressure_array = np.asarray(pressures, dtype=float)
            temperature_array = np.asarray(temperatures, dtype=float)
            bands = TraceUncertaintyBands(
                pressure_lower_95_pa=np.quantile(pressure_array, 0.025, axis=0).tolist(),
                pressure_upper_95_pa=np.quantile(pressure_array, 0.975, axis=0).tolist(),
                temperature_lower_95_k=np.quantile(temperature_array, 0.025, axis=0).tolist(),
                temperature_upper_95_k=np.quantile(temperature_array, 0.975, axis=0).tolist(),
                accepted_cycle_samples=len(pressures),
            )
        if len(pressures) < settings.cycle_samples:
            diagnostics.append(
                Diagnostic(
                    code="uncertainty_cycle_samples_gated",
                    severity=Severity.WARNING,
                    message=(
                        "Some uncertain cycle samples failed the feasibility gate and were "
                        "excluded from reactive trace bands."
                    ),
                    details={
                        "accepted": len(pressures),
                        "requested": settings.cycle_samples,
                    },
                )
            )
    return (
        UncertaintyResult(
            enabled=True,
            seed=settings.seed,
            analytical_samples=settings.analytical_samples,
            cycle_samples_requested=settings.cycle_samples,
            energy_margin_95=_interval(margins, "J/cycle"),
            hydrogen_available_95=_interval(available_values, "mg/cycle"),
            gate_pass_probability=passes / settings.analytical_samples,
            sensitivities=sensitivities,
        ),
        bands,
        diagnostics,
    )


def literature_preset_input() -> SimulationInput:
    """Ambient literature comparison, explicitly not an operator measurement."""

    input_data = SimulationInput()
    input_data.sample.measured_total_h2_mg_l = ValueWithUncertainty(
        value=1.9,
        unit="mg/L",
        # For a uniform distribution, sigma=(upper-lower)/sqrt(12). This
        # makes the sampled support exactly the literature range 1.6-2.2.
        standard_uncertainty=0.3 / sqrt(3.0),
        distribution=Distribution.UNIFORM,
        source_id="ambient-h2-water-comparison-range",
        basis=EvidenceBasis.LITERATURE,
    )
    return input_data


def artificial_pass_input() -> SimulationInput:
    """Deliberately high synthetic fixture proving the reactive path is reachable."""

    input_data = SimulationInput()
    input_data.sample.measured_total_h2_mg_l = ValueWithUncertainty(
        value=25_000.0,
        unit="mg/L",
        standard_uncertainty=100.0,
        distribution=Distribution.NORMAL,
        source_id="artificial-pass-only",
        basis=EvidenceBasis.SYNTHETIC,
    )
    input_data.retention.elapsed_time_s = ValueWithUncertainty.exact(
        0.0, "s", source_id="artificial-pass-only", basis=EvidenceBasis.SYNTHETIC
    )
    input_data.retention.first_order_rate_constant_per_s = ValueWithUncertainty.exact(
        0.0, "1/s", source_id="artificial-pass-only", basis=EvidenceBasis.SYNTHETIC
    )
    input_data.retention.handling_loss_fraction = ValueWithUncertainty.exact(
        0.0, "1", source_id="artificial-pass-only", basis=EvidenceBasis.SYNTHETIC
    )
    input_data.heat_recovery.recovered_heat_j_per_cycle = ValueWithUncertainty(
        value=2_800.0,
        unit="J/cycle",
        standard_uncertainty=50.0,
        distribution=Distribution.NORMAL,
        source_id="artificial-pass-only",
        basis=EvidenceBasis.SYNTHETIC,
    )
    return input_data


def water_injection_preset_input() -> SimulationInput:
    return SimulationInput(scenario=Scenario.HYDROGEN_WITH_WATER_INJECTION)


def default_simulation_input(
    preset: Literal["literature", "artificial_pass", "water_injection"] = "literature",
) -> SimulationInput:
    if preset == "literature":
        return literature_preset_input()
    if preset == "artificial_pass":
        return artificial_pass_input()
    return water_injection_preset_input()


def run_simulation(input_data: SimulationInput) -> SimulationResult:
    """Run the complete evidence-gated deterministic and uncertainty pipeline."""

    base = _evaluate_deterministic(
        input_data,
        include_cycle=True,
        include_scalar_uncertainty=True,
    )
    uncertainty, trace_bands, uncertainty_diagnostics = _propagate_uncertainty(input_data, base)
    proposed = base.proposed
    if proposed is not None and trace_bands is not None:
        proposed = proposed.model_copy(update={"uncertainty": trace_bands})
    reproducibility = get_runtime_metadata(
        seed=input_data.uncertainty.seed,
        analytical_samples=input_data.uncertainty.analytical_samples,
        cycle_samples=input_data.uncertainty.cycle_samples,
    )
    identity_payload = {
        "input": input_data.model_dump(mode="json"),
        "schema_version": reproducibility.schema_version,
        "model_version": MODEL_VERSION,
        "solver_version": reproducibility.solver_version,
        "mechanism_sha256": reproducibility.mechanism_sha256,
    }
    result_id = hashlib.sha256(
        json.dumps(identity_payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    return SimulationResult(
        result_id=result_id,
        input=input_data,
        loading=base.loading,
        retention=base.retention,
        gate=base.gate,
        motored_baseline=base.motored,
        proposed_cycle=proposed if base.gate.passed else None,
        uncertainty=uncertainty,
        evidence=source_ledger(),
        diagnostics=base.diagnostics + uncertainty_diagnostics,
        reproducibility=reproducibility,
    )


def evaluate_simulation(input_data: SimulationInput) -> SimulationResult:
    """Alias retained for clients that prefer evaluator terminology."""

    return run_simulation(input_data)
