from __future__ import annotations

import pytest

from hydrocycle import EngineInput, EnvironmentInput
from hydrocycle.params import P0, ParameterSet
from hydrocycle.provenance import Q, Tag


def test_p0_matches_the_live_schema_defaults() -> None:
    engine, env = EngineInput(), EnvironmentInput()
    v = P0.values()
    assert v["displacement_m3"] == pytest.approx(engine.displacement_l.value * 1e-3)  # type: ignore[operator]
    assert v["bore_m"] == pytest.approx(engine.bore_mm.value * 1e-3)  # type: ignore[operator]
    assert v["stroke_m"] == pytest.approx(engine.stroke_mm.value * 1e-3)  # type: ignore[operator]
    assert v["rod_m"] == pytest.approx(engine.connecting_rod_mm.value * 1e-3)  # type: ignore[operator]
    assert v["compression_ratio"] == engine.compression_ratio.value
    assert v["volumetric_efficiency"] == engine.volumetric_efficiency.value
    assert v["engine_speed_rpm"] == engine.speed_rpm.value
    assert v["water_T_K"] == env.water_temperature_k.value
    assert v["water_p_Pa"] == pytest.approx(env.water_pressure_bar.value * 1e5)  # type: ignore[operator]


def test_p0_default_options() -> None:
    assert P0.options["scenario"] == "gated"
    assert P0.options["retention_scope"] == "all_hydrogen"


def test_fingerprint_is_stable_and_sensitive() -> None:
    assert P0.fingerprint() == P0.fingerprint()
    assert len(P0.fingerprint()) == 64
    assert P0.with_values({"bore_m": 0.0861}).fingerprint() != P0.fingerprint()
    assert P0.with_options({"scenario": "ideal_complete"}).fingerprint() != P0.fingerprint()


def test_with_values_keeps_unit_and_marks_the_override() -> None:
    changed = P0.with_values({"bore_m": 0.09})
    assert changed.quantities["bore_m"].unit == "m"
    assert changed.quantities["bore_m"].tag is Tag.P
    assert "override" in changed.quantities["bore_m"].note
    assert P0.values()["bore_m"] == 0.086  # original untouched


def test_unknown_names_are_rejected() -> None:
    with pytest.raises(KeyError):
        P0.with_values({"no_such_parameter": 1.0})
    with pytest.raises(KeyError):
        P0.with_options({"no_such_option": "x"})


def test_quantities_must_be_q() -> None:
    with pytest.raises(TypeError):
        ParameterSet({"x": 1.0}, {})  # type: ignore[dict-item]
    assert ParameterSet({"x": Q(1.0, "1", Tag.P)}, {}).values() == {"x": 1.0}
