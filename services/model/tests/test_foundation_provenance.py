from __future__ import annotations

import math

import pytest

from hydrocycle.provenance import HAZARD_TBD, PhysicsConflict, Q, Tag, diagnostic


def test_q_holds_value_unit_tag_and_note() -> None:
    q = Q(0.086, "m", Tag.LIT, "bore")
    assert (q.value, q.unit, q.tag, q.note) == (0.086, "m", Tag.LIT, "bore")


@pytest.mark.parametrize("bad", [math.nan, math.inf, -math.inf])
def test_q_rejects_non_finite_values(bad: float) -> None:
    with pytest.raises(ValueError, match="finite"):
        Q(bad, "m", Tag.CALC)


def test_q_rejects_an_empty_unit() -> None:
    with pytest.raises(ValueError, match="unit"):
        Q(1.0, "", Tag.CALC)


def test_diagnostic_has_the_spec_shape() -> None:
    assert diagnostic(2.5, "J", Tag.CALC, "wall heat") == {
        "value": 2.5,
        "unit": "J",
        "tag": "CALC",
        "note": "wall heat",
    }


def test_physics_conflict_carries_its_fields() -> None:
    error = PhysicsConflict("hydrogen", "no stage creates hydrogen", 3.0e-9)
    assert error.what == "hydrogen"
    assert error.failed_assumption == "no stage creates hydrogen"
    assert error.residual == 3.0e-9
    assert "3.000e-09" in str(error)


def test_hazard_tbd_is_a_singleton_that_is_never_a_number() -> None:
    from hydrocycle.provenance import HazardTBD

    assert HazardTBD() is HAZARD_TBD
    assert repr(HAZARD_TBD) == "HAZARD_TBD"
    with pytest.raises(TypeError):
        float(HAZARD_TBD)  # type: ignore[arg-type]


def test_q_stores_an_integer_value_as_a_float() -> None:
    q = Q(3000, "rpm", Tag.P)
    assert isinstance(q.value, float)
    assert q.value == 3000.0


def test_q_rejects_a_bool_value() -> None:
    with pytest.raises(TypeError, match="bool"):
        Q(True, "1", Tag.P)  # type: ignore[arg-type]


def test_diagnostic_coerces_its_value_to_float() -> None:
    value = diagnostic(3, "J", Tag.CALC)["value"]
    assert isinstance(value, float)
    assert value == 3.0
