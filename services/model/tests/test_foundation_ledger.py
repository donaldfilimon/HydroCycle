from __future__ import annotations

import pytest

from hydrocycle.ledger import (
    ENERGY_IN,
    ENERGY_OUT,
    NEGATIVE_FLAG,
    UNDEFINED_FLAG,
    Efficiency,
    EnergyLedger,
    MassLedger,
)
from hydrocycle.provenance import PhysicsConflict


def zeros(names: tuple[str, ...]) -> dict[str, float]:
    return dict.fromkeys(names, 0.0)


def test_a_closing_ledger_passes() -> None:
    ledger = EnergyLedger(
        zeros(ENERGY_IN) | {"hydrogen_chemical": 100.0, "pump_electrical": 5.0},
        zeros(ENERGY_OUT) | {"indicated_work_net": 20.0, "cooling_wall_heat": 85.0},
    )
    assert ledger.residual_rel() == 0.0
    ledger.check()


def test_an_open_ledger_raises() -> None:
    ledger = EnergyLedger(zeros(ENERGY_IN) | {"hydrogen_chemical": 100.0}, zeros(ENERGY_OUT))
    with pytest.raises(PhysicsConflict, match="energy ledger"):
        ledger.check()


def test_ledger_categories_are_exact() -> None:
    with pytest.raises(ValueError, match="missing"):
        EnergyLedger({}, zeros(ENERGY_OUT))
    with pytest.raises(ValueError, match="unknown"):
        EnergyLedger(zeros(ENERGY_IN) | {"water_chemical": 1.0}, zeros(ENERGY_OUT))


def test_efficiency_carries_its_denominator() -> None:
    eff = Efficiency.ratio("eta_engine", 20.0, 80.0, "net indicated work / H2 at cylinder x LHV")
    assert (eff.value, eff.numerator, eff.denominator, eff.flag) == (0.25, 20.0, 80.0, None)


def test_negative_efficiency_is_reported_with_the_flag() -> None:
    eff = Efficiency.ratio("eta_engine", -3.0, 80.0, "d")
    assert eff.value == pytest.approx(-0.0375)
    assert eff.flag == NEGATIVE_FLAG


def test_zero_denominator_is_null_not_zero_and_not_an_exception() -> None:
    eff = Efficiency.ratio("eta_engine", 0.0, 0.0, "d")
    assert eff.value is None
    assert eff.flag == UNDEFINED_FLAG


def test_mass_ledger_rows() -> None:
    ledger = MassLedger({"water": (1.0e-3, 1.0e-3), "hydrogen": (2.0e-9, 1.0e-9)})
    assert ledger.residual_rel("water") == 0.0
    assert ledger.residual_rel("hydrogen") == pytest.approx(0.5)
    with pytest.raises(PhysicsConflict, match="hydrogen"):
        ledger.check()


def test_mass_ledger_nan_row_raises() -> None:
    with pytest.raises(ValueError, match="finite"):
        MassLedger({"water": (float("nan"), 1.0e-3)})


def test_energy_ledger_infinite_input_raises() -> None:
    with pytest.raises(ValueError, match="finite"):
        EnergyLedger(
            zeros(ENERGY_IN) | {"hydrogen_chemical": float("inf")},
            zeros(ENERGY_OUT),
        )
