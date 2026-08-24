from __future__ import annotations

import math

import numpy as np
import pytest
from pydantic import ValidationError

from hydrocycle import (
    Distribution,
    EnvironmentInput,
    EvidenceBasis,
    FailureCode,
    RetentionInput,
    RetentionMeasurement,
    ValueWithUncertainty,
    artificial_pass_input,
    get_model_metadata,
    henry_dissolved_h2_mg_l,
    hydrogen_energy_density_kj_l,
    latin_hypercube,
    literature_preset_input,
    run_simulation,
    sample_quantity,
    slider_crank_volume_m3,
    water_heating_burden_j,
    water_injection_preset_input,
)
from hydrocycle.physics import _CanteraCycleThermo, _cycle_molar_composition


def without_propagation(input_data):
    input_data.uncertainty.enabled = False
    return input_data


def test_nist_298k_reference_fixture() -> None:
    concentration = henry_dissolved_h2_mg_l(298.15, 1.0)
    assert concentration == pytest.approx(1.57, rel=0.01)
    assert hydrogen_energy_density_kj_l(concentration) == pytest.approx(0.189, rel=0.01)


def test_henry_loading_derives_partial_pressure_from_headspace_fraction() -> None:
    input_data = without_propagation(literature_preset_input())
    input_data.sample.measured_total_h2_mg_l = ValueWithUncertainty.exact(None, "mg/L")
    input_data.bubble_population = None
    input_data.environment.water_pressure_bar.value = 5.0
    input_data.environment.hydrogen_headspace_mole_fraction.value = 0.2
    result = run_simulation(input_data)
    assert result.loading.dissolved_h2_mg_l.value == pytest.approx(1.57, rel=0.01)
    assert any(item.code == "henry_h2_partial_pressure_assumption" for item in result.diagnostics)

    input_data.environment.hydrogen_headspace_mole_fraction.value = 0.0
    zero = run_simulation(input_data)
    assert zero.loading.dissolved_h2_mg_l.value == 0.0
    assert FailureCode.INSUFFICIENT_H2 in zero.gate.failures


@pytest.mark.parametrize("fraction", [-0.01, 1.01])
def test_h2_headspace_fraction_must_stay_within_physical_bounds(fraction: float) -> None:
    with pytest.raises(ValidationError, match=r"within \[0, 1\]"):
        EnvironmentInput(
            water_pressure_bar=ValueWithUncertainty.exact(1.0, "bar"),
            hydrogen_headspace_mole_fraction=ValueWithUncertainty.exact(fraction, "1"),
        )


def test_uncertain_quantity_requires_source_and_sampling_distribution() -> None:
    with pytest.raises(ValidationError, match="identify its source basis"):
        ValueWithUncertainty(
            value=1.0,
            unit="1",
            standard_uncertainty=0.1,
            distribution=Distribution.NORMAL,
        )
    with pytest.raises(ValidationError, match="sampling distribution"):
        ValueWithUncertainty(
            value=1.0,
            unit="1",
            standard_uncertainty=0.1,
            distribution=Distribution.FIXED,
            source_id="declared-but-invalid-fixed-model",
        )


def test_water_phase_burden_dominates_ambient_hydrogen_energy() -> None:
    sensible, phase = water_heating_burden_j(0.997, 298.15)
    h2_energy_j = hydrogen_energy_density_kj_l(1.57) * 1_000.0
    assert sensible > 0.0
    assert phase == pytest.approx(2.44e6, rel=0.02)
    assert sensible + phase > h2_energy_j * 1_000.0


def test_measured_total_replaces_derived_bubble_loading() -> None:
    input_data = without_propagation(literature_preset_input())
    input_data.sample.measured_total_h2_mg_l = ValueWithUncertainty(
        value=2.0,
        unit="mg/L",
        standard_uncertainty=0.1,
        distribution=Distribution.NORMAL,
        source_id="headspace-gc-example",
        basis=EvidenceBasis.MEASURED,
    )
    result = run_simulation(input_data)
    assert result.loading.mode == "measured_total"
    assert result.loading.total_h2_mg_l.value == 2.0
    assert result.loading.bubble_contained_h2_mg_l.value > 0.0
    assert result.loading.bubble_contribution_counted is False


def test_literature_gate_failure_suppresses_reactive_trace() -> None:
    result = run_simulation(without_propagation(literature_preset_input()))
    assert result.gate.passed is False
    assert FailureCode.INSUFFICIENT_H2 in result.gate.failures
    assert FailureCode.PREHEAT_DEFICIT in result.gate.failures
    assert result.proposed_cycle is None
    assert result.motored_baseline.model_label == "Single-zone state — schematic, not CFD."
    assert result.uncertainty.sensitivities


def test_zero_hydrogen_always_fails_and_has_no_reactive_trace() -> None:
    input_data = literature_preset_input()
    input_data.uncertainty.enabled = False
    input_data.sample.measured_total_h2_mg_l = ValueWithUncertainty.exact(0.0, "mg/L")
    result = run_simulation(input_data)
    assert FailureCode.INSUFFICIENT_H2 in result.gate.failures
    assert result.proposed_cycle is None


def test_artificial_fixture_reaches_bounded_cycle() -> None:
    result = run_simulation(without_propagation(artificial_pass_input()))
    assert result.gate.failures == [FailureCode.PASS]
    assert result.proposed_cycle is not None
    assert result.proposed_cycle.pv_work_j > 0.0
    assert result.proposed_cycle.imep_bar > 0.0
    assert result.proposed_cycle.energy_conservation_residual_fraction < 0.005
    assert result.proposed_cycle.relative_thermal_nox_risk in {"low", "moderate", "high"}
    assert len(result.proposed_cycle.pressure_pa) == 361
    property_diagnostic = next(
        item
        for item in result.diagnostics
        if item.code == "cantera_temperature_dependent_cycle_properties"
    )
    assert property_diagnostic.details["composition_updated_each_step"] is True
    assert (
        property_diagnostic.details["cv_max_j_per_kg_k"]
        > property_diagnostic.details["cv_min_j_per_kg_k"]
    )
    assert not any(
        item.code == "cantera_temperature_solve_not_converged" for item in result.diagnostics
    )


def test_water_injection_keeps_hydrogen_as_fuel_and_water_as_load() -> None:
    result = run_simulation(without_propagation(water_injection_preset_input()))
    assert result.gate.passed
    assert result.gate.energy_terms.water_phase_change_j > 0.0
    assert result.gate.energy_terms.hydrogen_chemical_energy_j > 0.0
    assert result.proposed_cycle is not None
    assert result.proposed_cycle.cumulative_vaporization_heat_j[-1] > 0.0


def test_slider_crank_tdc_bdc_identities() -> None:
    input_data = literature_preset_input()
    engine = input_data.engine
    displacement_m3 = engine.displacement_l.value * 1.0e-3
    clearance_m3 = displacement_m3 / (engine.compression_ratio.value - 1.0)
    tdc = slider_crank_volume_m3(0.0, engine)
    bdc_positive = slider_crank_volume_m3(180.0, engine)
    bdc_negative = slider_crank_volume_m3(-180.0, engine)
    assert tdc == pytest.approx(clearance_m3, rel=1.0e-12)
    assert bdc_positive == pytest.approx(clearance_m3 + displacement_m3, rel=1.0e-12)
    assert bdc_negative == pytest.approx(bdc_positive, rel=1.0e-12)


def test_motored_trace_matches_analytic_polytropic_law() -> None:
    input_data = without_propagation(literature_preset_input())
    result = run_simulation(input_data)
    trace = result.motored_baseline
    bdc_volume = trace.volume_m3[0]
    tdc_index = trace.crank_angle_deg.index(0.0)
    tdc_volume = trace.volume_m3[tdc_index]
    gamma = input_data.combustion.motored_gamma.value
    pressure_ratio = (bdc_volume / tdc_volume) ** gamma
    temperature_ratio = (bdc_volume / tdc_volume) ** (gamma - 1.0)
    assert trace.pressure_pa[tdc_index] == pytest.approx(trace.pressure_pa[0] * pressure_ratio)
    assert trace.temperature_k[tdc_index] == pytest.approx(
        trace.temperature_k[0] * temperature_ratio
    )
    assert trace.pressure_pa[-1] == pytest.approx(trace.pressure_pa[0])
    assert trace.temperature_k[-1] == pytest.approx(trace.temperature_k[0])


def test_normal_mass_inventory_never_exceeds_initial_hydrogen() -> None:
    result = run_simulation(without_propagation(literature_preset_input()))
    assert FailureCode.MASS_BALANCE_FAILED not in result.gate.failures
    initial = result.retention.initial_total_h2_mg_l.value
    assert 0.0 <= result.retention.retained_at_intake_mg_l.value <= initial
    assert 0.0 <= result.retention.released_h2_mg_l.value <= initial
    assert 0.0 <= result.retention.unaccounted_h2_mg_l.value <= initial


def test_retention_result_exposes_handling_and_intake_delivery_factors() -> None:
    input_data = without_propagation(literature_preset_input())
    result = run_simulation(input_data)
    expected_pre_handling = math.exp(
        -input_data.retention.first_order_rate_constant_per_s.value
        * input_data.retention.elapsed_time_s.value
    )
    expected_retained = (
        expected_pre_handling
        * (1.0 - input_data.retention.handling_loss_fraction.value)
        * input_data.retention.intake_delivery_fraction.value
    )
    assert result.retention.pre_handling_retention_fraction.value == pytest.approx(
        expected_pre_handling
    )
    assert result.retention.handling_loss_fraction.value == pytest.approx(
        input_data.retention.handling_loss_fraction.value
    )
    assert result.retention.intake_delivery_fraction.value == pytest.approx(
        input_data.retention.intake_delivery_fraction.value
    )
    assert result.retention.retained_fraction.value == pytest.approx(expected_retained)


def test_derived_loading_scalar_uncertainty_propagates_full_dependency_graph() -> None:
    input_data = without_propagation(literature_preset_input())
    input_data.sample.measured_total_h2_mg_l = ValueWithUncertainty.exact(None, "mg/L")
    result = run_simulation(input_data)
    dissolved = result.loading.dissolved_h2_mg_l
    bubble = result.loading.bubble_contained_h2_mg_l
    total = result.loading.total_h2_mg_l

    # The 15% Henry-model allowance, temperature, pressure, and explicit
    # headspace relation are sampled together; this is not a display-only 5%.
    assert dissolved.standard_uncertainty == pytest.approx(0.24, abs=0.05)
    assert bubble.standard_uncertainty > 0.0
    assert total.standard_uncertainty >= dissolved.standard_uncertainty


def test_loading_model_sensitivities_are_active_only_in_derived_mode() -> None:
    derived_input = without_propagation(literature_preset_input())
    derived_input.sample.measured_total_h2_mg_l = ValueWithUncertainty.exact(None, "mg/L")
    derived = run_simulation(derived_input)
    derived_by_name = {entry.parameter: entry for entry in derived.uncertainty.sensitivities}
    assert derived_by_name["environment.henry_loading_scale"].direction != "neutral"
    assert derived_by_name["bubble_population.hydrogen_content_scale"].direction != "neutral"

    measured = run_simulation(without_propagation(literature_preset_input()))
    measured_by_name = {entry.parameter: entry for entry in measured.uncertainty.sensitivities}
    assert measured_by_name["environment.henry_loading_scale"].direction == "neutral"
    assert measured_by_name["bubble_population.hydrogen_content_scale"].direction == "neutral"


def test_out_of_domain_input_suppresses_reactive_cycle() -> None:
    input_data = artificial_pass_input()
    input_data.uncertainty.enabled = False
    input_data.environment.water_temperature_k.value = 250.0
    result = run_simulation(input_data)
    assert FailureCode.OUTSIDE_MODEL_DOMAIN in result.gate.failures
    assert result.gate.domain_warnings
    assert result.proposed_cycle is None


def test_invalid_fraction_is_rejected_at_schema_boundary() -> None:
    with pytest.raises(ValidationError):
        RetentionInput(handling_loss_fraction=ValueWithUncertainty.exact(1.01, "1"))


def test_increasing_measured_retention_series_returns_invalid_data() -> None:
    input_data = literature_preset_input()
    input_data.uncertainty.enabled = False
    input_data.retention.measured_time_series = [
        RetentionMeasurement(
            time_s=0.0,
            total_h2_mg_l=ValueWithUncertainty.exact(
                1.0,
                "mg/L",
                source_id="invalid-increasing-series-0",
                basis=EvidenceBasis.MEASURED,
            ),
        ),
        RetentionMeasurement(
            time_s=60.0,
            total_h2_mg_l=ValueWithUncertainty.exact(
                1.2,
                "mg/L",
                source_id="invalid-increasing-series-1",
                basis=EvidenceBasis.MEASURED,
            ),
        ),
    ]
    input_data.retention.elapsed_time_s = ValueWithUncertainty.exact(60.0, "s")
    result = run_simulation(input_data)
    assert FailureCode.INVALID_DATA in result.gate.failures
    assert result.proposed_cycle is None


def test_inconsistent_reported_release_fails_mass_balance() -> None:
    input_data = literature_preset_input()
    input_data.uncertainty.enabled = False
    input_data.retention.elapsed_time_s = ValueWithUncertainty.exact(0.0, "s")
    input_data.retention.handling_loss_fraction = ValueWithUncertainty.exact(0.0, "1")
    input_data.retention.reported_released_fraction = ValueWithUncertainty.exact(0.9, "1")
    result = run_simulation(input_data)
    assert FailureCode.MASS_BALANCE_FAILED in result.gate.failures
    assert result.gate.mass_balance.unaccounted_h2_mg_per_cycle < 0.0


def test_more_hydrogen_never_worsens_mass_margin() -> None:
    low = literature_preset_input()
    high = literature_preset_input()
    low.uncertainty.enabled = False
    high.uncertainty.enabled = False
    low.sample.measured_total_h2_mg_l = ValueWithUncertainty.exact(1.6, "mg/L")
    high.sample.measured_total_h2_mg_l = ValueWithUncertainty.exact(2.2, "mg/L")
    low_result = run_simulation(low)
    high_result = run_simulation(high)
    assert (
        high_result.gate.hydrogen_mass_margin_mg_per_cycle
        >= low_result.gate.hydrogen_mass_margin_mg_per_cycle
    )


def test_rich_gate_never_credits_hydrogen_that_oxygen_cannot_burn() -> None:
    input_data = water_injection_preset_input()
    input_data.uncertainty.enabled = False
    input_data.combustion.target_equivalence_ratio.value = 2.0
    input_data.sample.separate_h2_mg_per_cycle.value = 40.0
    input_data.sample.water_injection_mg_per_cycle.value = 0.0
    input_data.engine.target_imep_bar.value = 30.0
    result = run_simulation(input_data)
    oxygen_limited_h2_mg = result.gate.oxygen_available_mg_per_cycle / (31.9988 / (2.0 * 2.01588))
    expected_energy_j = oxygen_limited_h2_mg * 1.0e-6 * (241_826.0 / 0.00201588)
    assert result.gate.energy_terms.hydrogen_chemical_energy_j == pytest.approx(expected_energy_j)
    assert result.gate.passed is False
    assert result.proposed_cycle is None


def test_more_recovered_heat_never_worsens_energy_margin() -> None:
    low = artificial_pass_input()
    high = artificial_pass_input()
    low.uncertainty.enabled = False
    high.uncertainty.enabled = False
    low.heat_recovery.recovered_heat_j_per_cycle = ValueWithUncertainty.exact(0.0, "J/cycle")
    high.heat_recovery.recovered_heat_j_per_cycle = ValueWithUncertainty.exact(3_000.0, "J/cycle")
    low_result = run_simulation(low)
    high_result = run_simulation(high)
    assert (
        high_result.gate.energy_terms.usable_energy_margin_j
        >= low_result.gate.energy_terms.usable_energy_margin_j
    )


def test_seeded_latin_hypercube_is_deterministic_and_stratified() -> None:
    first = latin_hypercube(32, 3, 1234)
    second = latin_hypercube(32, 3, 1234)
    assert np.array_equal(first, second)
    strata = np.floor(first[:, 0] * 32).astype(int)
    assert sorted(strata.tolist()) == list(range(32))


def test_lognormal_bubble_content_scale_preserves_declared_moments_without_clamping() -> None:
    quantity = ValueWithUncertainty(
        value=1.0,
        unit="1",
        standard_uncertainty=0.75,
        distribution=Distribution.LOGNORMAL,
        source_id="wide-positive-scale",
    )
    probabilities = (np.arange(20_000, dtype=float) + 0.5) / 20_000
    values = np.asarray([sample_quantity(quantity, float(point)) for point in probabilities])
    assert np.all(values > 0.0)
    assert float(np.mean(values)) == pytest.approx(1.0, rel=0.01)
    assert float(np.std(values)) == pytest.approx(0.75, rel=0.02)


def test_literature_uniform_preset_support_is_exactly_1_6_to_2_2_mg_l() -> None:
    quantity = literature_preset_input().sample.measured_total_h2_mg_l
    assert sample_quantity(quantity, 0.0) == pytest.approx(1.6, abs=1.0e-9)
    assert sample_quantity(quantity, 1.0) == pytest.approx(2.2, abs=1.0e-9)


def test_full_uncertainty_result_is_repeatable() -> None:
    first_input = water_injection_preset_input()
    first_input.uncertainty.analytical_samples = 16
    first_input.uncertainty.cycle_samples = 32
    second_input = first_input.model_copy(deep=True)
    first = run_simulation(first_input)
    second = run_simulation(second_input)
    assert first.result_id == second.result_id
    assert first.uncertainty == second.uncertainty
    assert first.proposed_cycle is not None
    assert first.proposed_cycle.uncertainty is not None
    assert first.proposed_cycle.uncertainty == second.proposed_cycle.uncertainty


def test_measured_decay_uncertainty_widens_seeded_available_h2_interval() -> None:
    def input_with_series_uncertainty(sigma: float):
        input_data = literature_preset_input()
        input_data.sample.measured_total_h2_mg_l = ValueWithUncertainty.exact(
            2.0,
            "mg/L",
            source_id="decay-authoritative-initial",
            basis=EvidenceBasis.MEASURED,
        )
        input_data.retention.measured_time_series = [
            RetentionMeasurement(
                time_s=0.0,
                total_h2_mg_l=ValueWithUncertainty(
                    value=2.0,
                    unit="mg/L",
                    standard_uncertainty=sigma,
                    distribution=Distribution.NORMAL,
                    source_id="decay-series-point-0",
                    basis=EvidenceBasis.MEASURED,
                ),
            ),
            RetentionMeasurement(
                time_s=1_800.0,
                total_h2_mg_l=ValueWithUncertainty(
                    value=1.2,
                    unit="mg/L",
                    standard_uncertainty=sigma,
                    distribution=Distribution.NORMAL,
                    source_id="decay-series-point-1",
                    basis=EvidenceBasis.MEASURED,
                ),
            ),
        ]
        input_data.retention.elapsed_time_s = ValueWithUncertainty.exact(
            1_800.0,
            "s",
            source_id="decay-series-time-axis",
            basis=EvidenceBasis.MEASURED,
        )
        input_data.retention.handling_loss_fraction = ValueWithUncertainty.exact(
            0.0, "1", source_id="no-handling-loss"
        )
        input_data.retention.intake_delivery_fraction = ValueWithUncertainty.exact(
            1.0, "1", source_id="complete-delivery"
        )
        input_data.uncertainty.analytical_samples = 256
        input_data.uncertainty.cycle_samples = 32
        input_data.uncertainty.seed = 424_242
        return input_data

    low = run_simulation(input_with_series_uncertainty(0.005))
    high_input = input_with_series_uncertainty(0.20)
    high = run_simulation(high_input)
    repeated = run_simulation(high_input.model_copy(deep=True))

    low_width = (
        low.uncertainty.hydrogen_available_95.upper - low.uncertainty.hydrogen_available_95.lower
    )
    high_width = (
        high.uncertainty.hydrogen_available_95.upper - high.uncertainty.hydrogen_available_95.lower
    )
    assert high_width > low_width * 3.0
    assert high.uncertainty == repeated.uncertainty
    assert any(
        "measured_time_series" in entry.parameter for entry in high.uncertainty.sensitivities
    )


def test_model_metadata_exposes_mechanism_equations_and_limits() -> None:
    metadata = get_model_metadata()
    assert metadata.mechanism == "gri30.yaml"
    assert "first_law" in metadata.equations
    assert any("not CFD" in limitation for limitation in metadata.limitations)
    evidence_ids = {entry.id for entry in metadata.source_ledger}
    assert "ambient-h2-water-comparison-range" in evidence_ids
    assert "headspace-gc-total-h2" in evidence_ids
    assert "hydrogen-engine-water-injection-2023" in evidence_ids
    assert "cantera-python-314-compatibility" in evidence_ids
    assert "cantera-illustrative-ic-engine-example" in evidence_ids


def test_cantera_reference_properties_when_dependency_is_installed() -> None:
    cantera = pytest.importorskip("cantera")
    gas = cantera.Solution("gri30.yaml")
    gas.TPX = 300.0, 1.0e5, {"H2": 2.0, "O2": 1.0, "N2": 3.76}
    assert math.isfinite(float(gas.cv_mass))
    assert float(gas.cv_mass) > 0.0


def test_temperature_dependent_cycle_properties_match_direct_cantera_calls() -> None:
    cantera = pytest.importorskip("cantera")
    composition = _cycle_molar_composition(
        h2_mg=12.0,
        oxygen_mg=96.0,
        nitrogen_mg=310.0,
        water_mg=25.0,
    )
    phase = cantera.Solution("gri30.yaml")
    thermo = _CanteraCycleThermo(phase, 100_000.0)
    state_600 = thermo.sensible_state(600.0, composition)
    state_1800 = thermo.sensible_state(1_800.0, composition)

    direct = cantera.Solution("gri30.yaml")
    direct.TPX = 298.15, 100_000.0, composition
    reference_u = float(direct.int_energy_mass)
    reference_h = float(direct.enthalpy_mass)
    direct.TPX = 1_800.0, 100_000.0, composition
    assert state_1800.internal_energy_j_per_kg == pytest.approx(
        float(direct.int_energy_mass) - reference_u,
        rel=1.0e-12,
    )
    assert state_1800.enthalpy_j_per_kg == pytest.approx(
        float(direct.enthalpy_mass) - reference_h,
        rel=1.0e-12,
    )
    assert state_1800.cv_j_per_kg_k == pytest.approx(float(direct.cv_mass), rel=1.0e-12)
    assert state_1800.cv_j_per_kg_k > state_600.cv_j_per_kg_k


def test_cycle_adiabatic_temperature_matches_direct_cantera_equilibrium() -> None:
    cantera = pytest.importorskip("cantera")
    input_data = without_propagation(water_injection_preset_input())
    result = run_simulation(input_data)
    assert result.proposed_cycle is not None
    available_h2_mg = min(
        result.gate.hydrogen_available.value,
        result.gate.hydrogen_required.value,
    )
    oxygen_mg = result.gate.oxygen_available_mg_per_cycle
    nitrogen_mg = result.gate.trapped_air_mg_per_cycle - oxygen_mg
    water_mg = input_data.sample.water_injection_mg_per_cycle.value
    gas = cantera.Solution("gri30.yaml")
    gas.TPX = (
        input_data.environment.intake_temperature_k.value,
        input_data.environment.intake_pressure_bar.value * 1.0e5,
        {
            "H2": max(available_h2_mg * 1.0e-6 / 0.00201588, 1.0e-30),
            "O2": max(oxygen_mg * 1.0e-6 / 0.0319988, 1.0e-30),
            "N2": max(nitrogen_mg * 1.0e-6 / 0.0280134, 1.0e-30),
            "H2O": max(water_mg * 1.0e-6 / 0.01801528, 0.0),
        },
    )
    gas.equilibrate("HP")
    assert result.proposed_cycle.adiabatic_flame_temperature_k == pytest.approx(
        float(gas.T), rel=1.0e-12
    )
