from __future__ import annotations

import math

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
