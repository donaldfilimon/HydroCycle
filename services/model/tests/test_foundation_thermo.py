from __future__ import annotations

import pytest

from hydrocycle import thermo

PHYSICS_LHV_J_PER_KG = 241_826.0 / 0.00201588
PHYSICS_HFG_J_PER_KG = 44_004.0 / 0.01801528


def test_lhv_matches_the_live_model_constant() -> None:
    assert pytest.approx(PHYSICS_LHV_J_PER_KG, rel=1e-4) == thermo.LHV_H2


def test_h_fg_at_reference_matches_the_live_model_constant() -> None:
    assert thermo.h_fg(thermo.T_REF) == pytest.approx(PHYSICS_HFG_J_PER_KG, rel=1e-3)


def test_h_fg_is_a_difference_of_thermo_functions() -> None:
    t = 330.0
    expected = (thermo.h_molar("H2O", t) - thermo.h_liquid_water_molar(t)) / thermo.MOLAR_MASS[
        "H2O"
    ]
    assert thermo.h_fg(t) == expected


def test_p_sat_at_the_normal_boiling_point() -> None:
    assert thermo.p_sat(373.124) == pytest.approx(101_325.0, rel=1e-4)
    assert thermo.p_sat(298.15) == pytest.approx(3_169.9, rel=1e-3)


def test_t_sat_inverts_p_sat() -> None:
    for t in (280.0, 310.0, 350.0, 420.0):
        assert thermo.t_sat(thermo.p_sat(t)) == pytest.approx(t, abs=1e-6)


def test_low_temperature_intake_air_is_finite() -> None:
    # N2's GRI polynomial starts at 300 K; 280 K intake air must still work (extrapolated).
    assert thermo.h_molar("N2", 280.0) < thermo.h_molar("N2", 300.0)


@pytest.mark.parametrize(("species", "t_k"), [("N2", 199.0), ("H2", 3_501.0), ("N2", 5_001.0)])
def test_out_of_range_temperatures_raise(species: str, t_k: float) -> None:
    with pytest.raises(ValueError, match="outside"):
        thermo.h_molar(species, t_k)


def test_unknown_species_raises() -> None:
    with pytest.raises(KeyError):
        thermo.h_molar("CH4", 300.0)


@pytest.mark.cantera
@pytest.mark.parametrize("species", ["H2", "O2", "N2", "H2O"])
@pytest.mark.parametrize("t_k", [300.0, 500.0, 999.0, 1_001.0, 1_800.0, 3_000.0])
def test_species_enthalpy_and_cp_match_cantera(species: str, t_k: float) -> None:
    import cantera as ct

    gas = ct.Solution("gri30.yaml")
    gas.TPX = t_k, ct.one_atm, f"{species}:1"
    assert thermo.h_molar(species, t_k) == pytest.approx(
        gas.enthalpy_mole / 1000.0, rel=1e-9, abs=1e-6
    )
    assert thermo.cp_molar(species, t_k) == pytest.approx(gas.cp_mole / 1000.0, rel=1e-9)


@pytest.mark.cantera
@pytest.mark.parametrize("t_k", [280.0, 300.0, 340.0, 370.0])
def test_saturation_and_latent_heat_match_cantera_water(t_k: float) -> None:
    import cantera as ct

    water = ct.Water()
    water.TQ = t_k, 0.0
    h_liquid = water.enthalpy_mass
    p = water.P
    water.TQ = t_k, 1.0
    assert thermo.p_sat(t_k) == pytest.approx(p, rel=5e-3)
    assert thermo.h_fg(t_k) == pytest.approx(water.enthalpy_mass - h_liquid, rel=1.5e-2)


def test_liquid_water_density_is_the_spec_constant() -> None:
    assert thermo.RHO_LIQUID_WATER == 997.05
