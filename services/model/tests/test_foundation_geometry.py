from __future__ import annotations

import pytest

from hydrocycle import EngineInput, slider_crank_volume_m3
from hydrocycle.geometry import Geometry, gate1_audit

DEFAULT = Geometry(
    bore_m=0.086, stroke_m=0.086, rod_m=0.143, compression_ratio=10.5, displacement_m3=5.0e-4
)
ANGLES = [-180.0 + 15.0 * i for i in range(24)]


def test_volume_matches_the_live_model_at_24_angles() -> None:
    engine = EngineInput()
    for theta in ANGLES:
        live = slider_crank_volume_m3(theta, engine)
        assert isinstance(live, float)
        assert DEFAULT.volume_m3(theta) == pytest.approx(live, rel=1e-12)


def test_compression_ratio_identity() -> None:
    assert DEFAULT.volume_m3(180.0) / DEFAULT.volume_m3(0.0) == pytest.approx(10.5, rel=1e-12)


def test_pin_height_at_dead_centres() -> None:
    assert DEFAULT.pin_height_m(0.0) == pytest.approx(0.043 + 0.143, rel=1e-12)
    assert DEFAULT.pin_height_m(180.0) == pytest.approx(0.143 - 0.043, rel=1e-12)


def test_wall_area_grows_from_tdc_to_bdc() -> None:
    assert DEFAULT.wall_area_m2(180.0) > DEFAULT.wall_area_m2(90.0) > DEFAULT.wall_area_m2(0.0)


@pytest.mark.parametrize(
    "kwargs",
    [
        {"rod_m": 0.043},  # rod not longer than crank radius
        {"compression_ratio": 1.0},
        {"bore_m": 0.0},
        {"displacement_m3": -1.0e-4},
    ],
)
def test_impossible_geometry_raises(kwargs: dict[str, float]) -> None:
    base = {
        "bore_m": 0.086,
        "stroke_m": 0.086,
        "rod_m": 0.143,
        "compression_ratio": 10.5,
        "displacement_m3": 5.0e-4,
    }
    with pytest.raises(ValueError, match=r".*"):
        Geometry(**(base | kwargs))


def test_gate1_audit_reports_the_over_determined_default_engine() -> None:
    audit = gate1_audit(DEFAULT)
    assert audit["bore_stroke_displacement_m3"]["value"] == pytest.approx(4.995572142e-4, rel=1e-9)
    assert audit["displacement_mismatch_rel"]["value"] == pytest.approx(-8.85571564e-4, rel=1e-6)
    assert audit["displacement_mismatch_rel"]["tag"] == "CALC"
    assert audit["rod_crank_ratio"]["value"] == pytest.approx(0.143 / 0.043, rel=1e-12)
