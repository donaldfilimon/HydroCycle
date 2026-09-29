"""Regenerate with uv run --frozen python ../../scripts/twin-diagnostics.py from services/model."""

from __future__ import annotations

import argparse
import hashlib
import json
from math import dist, isfinite
from pathlib import Path

from hydrocycle.physics import slider_crank_volume_m3
from hydrocycle.twin import build_twin_manifest, reference_engine, render_twin_manifest


def diagnostics() -> dict[str, object]:
    twin = build_twin_manifest()
    geometry = twin["geometry"]
    frames = twin["frames"]
    engine = reference_engine()
    swept_cc = geometry["displacement_l"] * 1000
    clearance_cc = swept_cc / (geometry["compression_ratio"] - 1)
    travels = [frame["piston_travel_mm"] for frame in frames]
    angles = [frame["angle_deg"] for frame in frames]
    expected_angles = list(range(361))
    stage_ids = {stage["id"] for stage in twin["stages"]}
    canonical = render_twin_manifest()
    fixture = (
        Path(__file__).resolve().parents[1]
        / "packages/contracts/fixtures/twin-reference.json"
    )
    return {
        "schema_version": "hydrocycle-twin-diagnostics/1.0.0",
        "scope": "Deterministic numerical geometry diagnostics, not physical predictive accuracy",
        "reference_manifest": {
            "schema_version": twin["schema_version"],
            "sha256": hashlib.sha256(canonical.encode("utf-8")).hexdigest(),
            "committed_fixture_matches_generator": fixture.read_text(encoding="utf-8")
            == canonical,
        },
        "sampling": {
            "frame_count": len(frames),
            "angle_min_deg": min(angles),
            "angle_max_deg": max(angles),
            "step_deg": 1,
            "covers_every_integer_degree_including_both_endpoints": angles
            == expected_angles,
            "all_numeric_frame_values_finite": all(
                isfinite(value)
                for frame in frames
                for value in [
                    frame["volume_cc"],
                    frame["piston_travel_mm"],
                    frame["rod_angle_rad"],
                    *frame["crank_pin_mm"],
                    *frame["piston_pin_mm"],
                    *frame["rod_center_mm"],
                ]
            ),
            "continuous_angle_error_bound": None,
            "continuous_angle_error_bound_reason": "Only the 361 exported samples were evaluated",
        },
        "geometry_errors": {
            "max_rod_length_closure_error_mm": max(
                abs(
                    dist(frame["crank_pin_mm"], frame["piston_pin_mm"])
                    - geometry["connecting_rod_mm"]
                )
                for frame in frames
            ),
            "max_crank_radius_error_mm": max(
                abs(
                    dist(frame["crank_pin_mm"], [0.0, 0.0, 0.0])
                    - geometry["crank_radius_mm"]
                )
                for frame in frames
            ),
            "stroke_range_mm": max(travels) - min(travels),
            "reference_stroke_mm": geometry["stroke_mm"],
            "stroke_range_absolute_error_mm": abs(
                max(travels) - min(travels) - geometry["stroke_mm"]
            ),
            "max_tdc_volume_absolute_error_cc": max(
                abs(frames[index]["volume_cc"] - clearance_cc) for index in (0, 360)
            ),
            "bdc_volume_absolute_error_cc": abs(
                frames[180]["volume_cc"] - clearance_cc - swept_cc
            ),
            "max_exported_volume_vs_python_solver_error_cc": max(
                abs(
                    frame["volume_cc"]
                    - float(slider_crank_volume_m3(float(frame["angle_deg"]), engine))
                    * 1e6
                )
                for frame in frames
            ),
            "interpretation": (
                "Floating-point closure against the supplied ideal geometry. "
                "These errors do not measure machining tolerance or physical model validity. "
                "Exported volume comparison reuses the authoritative solver and is not independent."
            ),
        },
        "assembly": {
            "variant_count": len(twin["variants"]),
            "stage_count": len(twin["stages"]),
            "all_variant_stages_declared": all(
                set(variant["stage_ids"]) <= stage_ids for variant in twin["variants"]
            ),
            "all_connections_within_variant": all(
                set(edge) <= set(variant["stage_ids"])
                for variant in twin["variants"]
                for edge in variant["connections"]
            ),
            "scope": "Five bounded conceptual research layouts, not all possible designs",
        },
        "displacement": {
            "geometric_cc": swept_cc,
            "nominal_cc": geometry["nominal_displacement_l"] * 1000,
            "geometric_minus_nominal_cc": swept_cc
            - geometry["nominal_displacement_l"] * 1000,
            "basis": "Bore-derived geometric displacement; supplied drawing dimensions unvalidated",
        },
        "legacy_comparison": twin["reference_comparison"],
        "physical_predictive_accuracy": None,
        "physical_predictive_accuracy_reason": (
            "No calibrated held-out measurements or validated physical experimental results "
            "were supplied for this twin. Numerical closure is not predictive accuracy."
        ),
        "ledgers": twin["ledger"],
        "physical_mass_energy_residuals": None,
        "physical_mass_energy_residuals_reason": (
            "Inventories and energy measurements are unknown; physical conservation cannot "
            "be evaluated. No synthetic simulation residual is substituted for measured evidence."
        ),
        "cross_renderer_validation": {
            "shared_source": "Python-generated twin-reference.json",
            "browser_rendered_geometry_parity": None,
            "blender_geometry_parity": None,
            "reason": (
                "A shared manifest establishes intended source consistency only. This diagnostic "
                "does not measure rendered browser coordinates or independently compare Blender."
            ),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export reference twin numerical diagnostics"
    )
    parser.add_argument(
        "output",
        type=Path,
        nargs="?",
        default=Path(__file__).resolve().parents[1] / "docs/twin-diagnostics.json",
    )
    args = parser.parse_args()
    args.output.write_text(
        json.dumps(diagnostics(), indent=2, sort_keys=True, allow_nan=False) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
