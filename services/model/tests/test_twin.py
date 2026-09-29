from __future__ import annotations

import json
from math import dist, isfinite
from pathlib import Path

import pytest

from hydrocycle.twin import build_twin_manifest, render_twin_manifest


def test_reference_volume_and_rod_closure() -> None:
    twin = build_twin_manifest()
    geometry, frames = twin["geometry"], twin["frames"]
    swept_cc = geometry["displacement_l"] * 1000
    assert swept_cc == pytest.approx(499.998102503499, abs=1e-9)
    assert len(frames) == 361
    assert frames[0]["volume_cc"] == pytest.approx(swept_cc / 9, rel=1e-12)
    assert frames[180]["volume_cc"] == pytest.approx(swept_cc * 10 / 9, rel=1e-12)
    assert frames[360]["volume_cc"] == pytest.approx(frames[0]["volume_cc"], rel=1e-12)
    for index, frame in enumerate(frames):
        assert frame["angle_deg"] == index
        assert frame["volume_cc"] == pytest.approx(frames[360 - index]["volume_cc"], rel=1e-12)
        assert dist(frame["crank_pin_mm"], frame["piston_pin_mm"]) == pytest.approx(
            geometry["connecting_rod_mm"],
            rel=1e-12,
        )
        assert dist(frame["crank_pin_mm"], [0, 0, 0]) == pytest.approx(
            geometry["crank_radius_mm"],
            rel=1e-12,
        )
        assert all(isfinite(value) for value in frame["piston_pin_mm"])
        assert isfinite(frame["rod_angle_rad"])
    assert max(frame["piston_travel_mm"] for frame in frames) == pytest.approx(
        geometry["stroke_mm"],
        rel=1e-12,
    )
    comparison = twin["reference_comparison"]
    assert comparison["slider_crank_cc"] == pytest.approx(60.430969158, abs=1e-7)
    assert comparison["legacy_harmonic_cc"] == pytest.approx(59.3536173, abs=1e-7)
    assert comparison["difference_percent"] > 1.8


def test_null_ledgers_and_variant_connectivity() -> None:
    twin = build_twin_manifest()
    ledger = twin["ledger"]
    assert all(value is None for value in ledger["hydrogen_mg"].values())
    assert all(value is None for value in ledger["energy_j"].values())
    assert ledger["balance_status"] == "not_evaluable"
    known = {stage["id"] for stage in twin["stages"]}
    assert len(twin["variants"]) == 5
    for variant in twin["variants"]:
        assert set(variant["stage_ids"]) <= known
        assert all(set(edge) <= set(variant["stage_ids"]) for edge in variant["connections"])
    separate = next(v for v in twin["variants"] if v["id"] == "separate-h2-water")
    assert ["H2-EXT", "HC-IF-601"] in separate["connections"]
    baseline = next(v for v in twin["variants"] if v["id"] == "motored-baseline")
    assert "H2-EXT" not in baseline["stage_ids"]


def test_committed_manifest_is_deterministic() -> None:
    fixture = (
        Path(__file__).resolve().parents[3] / "packages/contracts/fixtures/twin-reference.json"
    )
    rendered = render_twin_manifest()
    assert rendered == render_twin_manifest()
    assert fixture.read_text(encoding="utf-8") == rendered
    assert json.loads(rendered)["ledger"]["hydrogen_mg"]["dissolved"] is None
