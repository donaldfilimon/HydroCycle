from __future__ import annotations

import json
import math
import random

import pytest

from hydrocycle import thermo
from hydrocycle.provenance import PhysicsConflict
from hydrocycle.state import Bins, StageResult, Stream


def water(name: str, kg: float, h2: float = 0.0, t_k: float = 298.15) -> Stream:
    return Stream(name, t_k, 1.0e5, {"water_bulk": kg, "h2_dissolved": h2})


def test_lognormal_bins_sum_to_the_total_exactly() -> None:
    bins = Bins.lognormal(d50_m=150e-9, gsd=1.6, total=3.7e14, basis="per_m3_liquid")
    assert len(bins.edges_m) == 33
    assert len(bins.counts) == 32
    assert math.isclose(math.fsum(bins.counts), 3.7e14, rel_tol=1e-15)
    assert bins.total() == math.fsum(bins.counts)
    assert all(c >= 0.0 for c in bins.counts)


def test_lognormal_edges_span_plus_minus_three_and_a_half_sigma() -> None:
    bins = Bins.lognormal(d50_m=1e-6, gsd=2.0, total=1.0, basis="per_cycle")
    assert bins.edges_m[0] == pytest.approx(1e-6 * 2.0**-3.5, rel=1e-12)
    assert bins.edges_m[-1] == pytest.approx(1e-6 * 2.0**3.5, rel=1e-12)
    assert bins.counts[15] == pytest.approx(bins.counts[16], rel=1e-9)  # symmetric in log space


def test_bins_reject_an_unknown_basis_and_bad_shapes() -> None:
    with pytest.raises(ValueError, match="basis"):
        Bins.lognormal(d50_m=1e-6, gsd=2.0, total=1.0, basis="per_litre")
    with pytest.raises(ValueError, match="one more entry"):
        Bins((1.0, 2.0), (1.0, 2.0), "per_cycle")


@pytest.mark.parametrize("bad", [-1e-9, math.nan, math.inf])
def test_streams_reject_negative_or_non_finite_masses(bad: float) -> None:
    with pytest.raises(ValueError, match="finite and non-negative"):
        Stream("s", 298.15, 1.0e5, {"water_bulk": bad})


def test_streams_reject_unknown_species() -> None:
    with pytest.raises(KeyError):
        Stream("s", 298.15, 1.0e5, {"water": 1.0})


def test_stream_totals_and_enthalpy() -> None:
    s = water("in", 1.0e-3, h2=2.0e-9)
    assert s.total_mass() == 1.0e-3 + 2.0e-9
    assert s.h2_mass() == 2.0e-9
    expected = 1.0e-3 * thermo.h_liquid_water_mass(298.15) + 2.0e-9 * thermo.h_mass("H2", 298.15)
    assert s.enthalpy_j() == pytest.approx(expected, rel=1e-12)


def test_a_conserving_stage_passes_check() -> None:
    inlet = water("in", 1.0e-3, h2=2.0e-9)
    vent = Stream("vent", 298.15, 1.0e5, {"h2_free": 0.5e-9})
    outlet = water("out", 1.0e-3, h2=1.5e-9)
    result = StageResult("NBG-104", inlet, outlet, side_streams={"nbg_vent": vent})
    assert abs(result.mass_residual()) < 1e-15
    assert abs(result.h2_residual()) < 1e-15
    result.check()


def test_creating_hydrogen_raises_physics_conflict() -> None:
    inlet = water("in", 1.0e-3, h2=2.0e-9)
    outlet = water("out", 1.0e-3 - 1.0e-9, h2=3.0e-9)  # total mass conserved; only H2 is created
    with pytest.raises(PhysicsConflict, match="hydrogen"):
        StageResult("NBG-104", inlet, outlet).check()


def test_reacted_hydrogen_is_accounted_for() -> None:
    inlet = Stream("in", 400.0, 1.0e5, {"h2_free": 2.0e-9, "o2": 16.0e-9})
    outlet = Stream("out", 400.0, 1.0e5, {"h2_free": 1.0e-9, "o2": 8.06e-9, "water_vapor": 8.94e-9})
    result = StageResult("ENG-601", inlet, outlet, diagnostics={"_h2_reacted_kg": 1.0e-9})
    assert abs(result.h2_residual()) < 1e-12


def test_energy_residual_counts_inputs_work_and_ambient_heat() -> None:
    inlet = water("in", 1.0e-3)
    outlet = water("out", 1.0e-3, t_k=299.15)
    rise = outlet.enthalpy_j() - inlet.enthalpy_j()
    result = StageResult(
        "PMP-103",
        inlet,
        outlet,
        energy_in_j={"pump_electrical": rise + 0.25},
        diagnostics={"_heat_to_ambient_J": 0.25},
    )
    assert abs(result.energy_residual()) < 1e-12
    result.check()


@pytest.mark.parametrize("bad", [math.nan, math.inf, -math.inf])
def test_stage_results_reject_non_finite_work_and_energy_inputs(bad: float) -> None:
    inlet = water("in", 1.0e-3)
    outlet = water("out", 1.0e-3)
    with pytest.raises(ValueError, match="work_out_j must be finite"):
        StageResult("PMP-103", inlet, outlet, work_out_j=bad)
    with pytest.raises(ValueError, match="energy_in_j"):
        StageResult("PMP-103", inlet, outlet, energy_in_j={"pump_electrical": bad})


@pytest.mark.parametrize("key", ["_mass_added_kg", "_h2_added_kg", "_h2_reacted_kg", "_H_added_J"])
@pytest.mark.parametrize("bad", [math.nan, math.inf])
def test_stage_results_reject_non_finite_diagnostics(key: str, bad: float) -> None:
    inlet = water("in", 1.0e-3, h2=2.0e-9)
    with pytest.raises(ValueError, match="must be finite"):
        StageResult("ENG-601", inlet, inlet, diagnostics={key: bad})


def test_negative_reacted_hydrogen_is_rejected() -> None:
    inlet = water("in", 1.0e-3, h2=2.0e-9)
    with pytest.raises(ValueError, match="non-negative"):
        StageResult("ENG-601", inlet, inlet, diagnostics={"_h2_reacted_kg": -1.0e-9})


def test_a_bool_diagnostic_is_not_a_number() -> None:
    inlet = water("in", 1.0e-3)
    with pytest.raises(ValueError, match="must be a number"):
        StageResult("ENG-601", inlet, inlet, diagnostics={"_h2_reacted_kg": True})


def test_check_treats_a_non_finite_residual_as_a_conflict() -> None:
    # Construction rejects non-finite inputs, so force NaN through a stream that bypasses it.
    inlet = water("in", 1.0e-3, h2=2.0e-9)
    result = StageResult("NBG-104", inlet, inlet)
    object.__setattr__(result, "work_out_j", math.nan)
    with pytest.raises(PhysicsConflict, match="energy"):
        result.check()


@pytest.mark.parametrize("edges", [(0.0, 1.0), (-1.0, 1.0), (math.nan, 1.0), (1.0, math.inf)])
def test_bins_reject_non_finite_or_non_positive_edges(edges: tuple[float, float]) -> None:
    with pytest.raises(ValueError, match="finite and strictly positive"):
        Bins(edges, (1.0,), "per_cycle")


def test_stage_result_as_dict_is_json_ready() -> None:
    inlet = water("in", 1.0e-3, h2=2.0e-9)
    vent = Stream("vent", 298.15, 1.0e5, {"h2_free": 0.5e-9})
    outlet = water("out", 1.0e-3, h2=1.5e-9)
    result = StageResult(
        "NBG-104",
        inlet,
        outlet,
        side_streams={"nbg_vent": vent},
        energy_in_j={"pump_electrical": 0.0},
        diagnostics={"note": "vent", "_heat_to_ambient_J": 0.0},
    )
    d = result.as_dict()
    assert d["component_id"] == "NBG-104"
    assert d["inlet"] == inlet.as_dict()
    assert d["outlet"] == outlet.as_dict()
    assert d["side_streams"] == {"nbg_vent": vent.as_dict()}
    assert d["energy_in_j"] == {"pump_electrical": 0.0}
    assert d["work_out_j"] == 0.0
    assert d["diagnostics"] == {"note": "vent", "_heat_to_ambient_J": 0.0}
    assert d["residuals"] == {
        "mass": result.mass_residual(),
        "h2": result.h2_residual(),
        "energy": result.energy_residual(),
    }
    assert json.loads(json.dumps(d)) == d


def _warmed_gram(leak_j: float) -> StageResult:
    inlet = water("in", 1.0e-3)
    outlet = water("out", 1.0e-3, t_k=299.15)
    rise = outlet.enthalpy_j() - inlet.enthalpy_j()
    return StageResult("PMP-103", inlet, outlet, energy_in_j={"pump_electrical": rise + leak_j})


def test_a_warmed_gram_of_water_that_balances_passes() -> None:
    _warmed_gram(0.0).check()


def test_a_one_microjoule_leak_on_a_gram_of_water_raises() -> None:
    # Before the reference-relative scale, this leak passed (the scale was |H_in| + |H_out|).
    with pytest.raises(PhysicsConflict, match="energy"):
        _warmed_gram(1.0e-6).check()


def test_a_reacting_stage_with_its_heat_accounted_for_passes() -> None:
    """Legitimate chemistry is not failed by the energy check.

    The reaction heat is closed by _heat_to_ambient_J, which already carries the scale on its
    own (about 0.12 J), so this passes with or without the |dH_ref| term. It shows that a
    reacting stage is not rejected; it does not prove that the dH_ref term is necessary.
    """
    inlet = Stream("in", 400.0, 1.0e5, {"h2_free": 2.0e-9, "o2": 16.0e-9})
    outlet = Stream("out", 400.0, 1.0e5, {"h2_free": 1.0e-9, "o2": 8.06e-9, "water_vapor": 8.94e-9})
    heat = inlet.enthalpy_j() - outlet.enthalpy_j()
    assert heat > 0.1  # about 0.12 J released by 1 ng of H2
    StageResult(
        "ENG-601",
        inlet,
        outlet,
        diagnostics={"_h2_reacted_kg": 1.0e-9, "_heat_to_ambient_J": heat},
    ).check()


def _shuffled(rng: random.Random, masses: dict[str, float]) -> dict[str, float]:
    items = list(masses.items())
    rng.shuffle(items)
    return dict(items)


def test_randomised_conserving_stages_pass_and_leaks_are_caught() -> None:
    rng = random.Random(20260929)
    for _ in range(600):
        water_kg = rng.uniform(1.0e-4, 2.0e-3)
        h2_kg = rng.uniform(1.0e-9, 1.0e-8)
        vented = rng.uniform(0.1, 0.9) * h2_kg
        t_k = rng.choice([thermo.T_REF, thermo.T_REF, 350.0])
        inlet = Stream(
            "in", t_k, 1.0e5, _shuffled(rng, {"water_bulk": water_kg, "h2_dissolved": h2_kg})
        )
        outlet = Stream(
            "out",
            t_k,
            1.0e5,
            _shuffled(rng, {"water_bulk": water_kg, "h2_dissolved": h2_kg - vented}),
        )
        parts = rng.randint(1, 3)  # split the vent into side streams to vary the summation
        vents = {
            f"vent{i}": Stream(f"vent{i}", t_k, 1.0e5, {"h2_free": vented / parts})
            for i in range(parts)
        }
        StageResult("NBG-104", inlet, outlet, side_streams=vents).check()
        leaky = StageResult(
            "NBG-104", inlet, outlet, side_streams=vents, energy_in_j={"pump_electrical": 1.0e-6}
        )
        if water_kg <= 1.0e-3:
            with pytest.raises(PhysicsConflict, match="energy"):
                leaky.check()
