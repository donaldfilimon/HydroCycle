"""Deterministic reference geometry, not an operating or thermodynamic prediction."""

from __future__ import annotations

import json
from itertools import pairwise
from math import atan2, cos, pi, radians, sin, sqrt
from typing import TypedDict

from hydrocycle.physics import slider_crank_volume_m3
from hydrocycle.schemas import EngineInput, EvidenceBasis, ValueWithUncertainty


class Geometry(TypedDict):
    bore_mm: float
    stroke_mm: float
    crank_radius_mm: float
    connecting_rod_mm: float
    displacement_l: float
    nominal_displacement_l: float
    compression_ratio: float


class Frame(TypedDict):
    angle_deg: int
    volume_cc: float
    piston_travel_mm: float
    crank_pin_mm: list[float]
    piston_pin_mm: list[float]
    rod_center_mm: list[float]
    rod_angle_rad: float


class Stage(TypedDict):
    id: str
    label: str
    kind: str
    position: list[float]
    envelope: list[float]
    description: str
    evidence: str
    unknowns: list[str]


class Variant(TypedDict):
    id: str
    label: str
    description: str
    stage_ids: list[str]
    connections: list[list[str]]


class Ledger(TypedDict):
    hydrogen_mg: dict[str, float | None]
    energy_j: dict[str, float | None]
    balance_status: str


class Comparison(TypedDict):
    angle_deg: int
    slider_crank_cc: float
    legacy_harmonic_cc: float
    difference_percent: float
    explanation: str


class TwinManifest(TypedDict):
    schema_version: str
    geometry: Geometry
    coordinate_convention: str
    conceptual_layout_units: str
    frames: list[Frame]
    stages: list[Stage]
    variants: list[Variant]
    ledger: Ledger
    reference_comparison: Comparison
    assumptions: list[str]
    limitations: list[str]


def _supplied(value: float, unit: str) -> ValueWithUncertainty:
    return ValueWithUncertainty(
        value=value,
        unit=unit,
        source_id="hydrocycle-cad-reference-2026-09-29",
        basis=EvidenceBasis.USER_ASSUMPTION,
    )


def reference_engine() -> EngineInput:
    """Explicit CAD geometry overrides, independent of synthetic solver defaults."""
    displacement_l = pi * 86.0**2 * 86.0759 / 4.0 / 1_000_000.0
    return EngineInput(
        displacement_l=_supplied(displacement_l, "L"),
        bore_mm=_supplied(86.0, "mm"),
        stroke_mm=_supplied(86.0759, "mm"),
        connecting_rod_mm=_supplied(150.6328, "mm"),
        compression_ratio=_supplied(10.0, "1"),
    )


def _stages() -> list[Stage]:
    definitions = [
        ("WTR-101", "Feedwater", "reservoir", "Water carrier reservoir"),
        ("FLT-102", "Filtration", "filter", "Feedwater filtration"),
        ("PMP-103", "Feed pump", "pump", "Conceptual carrier feed"),
        ("NBG-104", "Nanobubble conditioner", "conditioner", "Hydrogen conditioning boundary"),
        ("CND-105", "Retention chamber", "chamber", "Hold, retention and sampling"),
        ("BQA-231", "Bubble metrology", "sensor", "Bubble population measurement boundary"),
        (
            "USC-401",
            "Ultrasonic conditioner",
            "aerosol",
            "Aerosolization, distinct from vaporization",
        ),
        ("SEP-402", "Phase separator", "separator", "Optional droplet and phase boundary"),
        ("MTR-106", "Metering", "meter", "Transferred inventory measurement boundary"),
        ("HC-IF-601", "Research interface", "interface", "Read-only conceptual engine interface"),
        ("ENG-601", "Reciprocating engine", "engine", "Slider-crank geometric reference"),
        ("EXH-701", "Exhaust boundary", "exhaust", "Unmeasured exhaust energy and mass"),
        ("CON-702", "Recovery", "condenser", "Condensation and recovery boundary"),
        ("DAT-801", "Data logger", "logger", "Evidence and measurement records"),
        ("H2-EXT", "External hydrogen boundary", "boundary", "Independent hydrogen inventory"),
    ]
    stages: list[Stage] = []
    for index, (stage_id, label, kind, description) in enumerate(definitions):
        stages.append(
            {
                "id": stage_id,
                "label": label,
                "kind": kind,
                "position": [float(index % 7) * 2.4 - 7.2, 0.0, float(index // 7) * 3.4],
                "envelope": [1.5, 2.0 if kind == "engine" else 1.5, 1.3],
                "description": description,
                "evidence": "Proposed conceptual envelope; no fabrication or pressure rating",
                "unknowns": ["Measured inventory", "Validated dimensions", "Energy transfer"],
            }
        )
    return stages


def _variants() -> list[Variant]:
    conditioning = ["WTR-101", "FLT-102", "PMP-103", "NBG-104", "CND-105", "BQA-231"]
    tail = ["MTR-106", "HC-IF-601", "ENG-601", "EXH-701", "CON-702"]
    definitions = [
        (
            "conditioning-metrology",
            "Conditioning + metrology",
            "Characterization only; no engine connection or asserted energy output.",
            conditioning,
        ),
        (
            "aerosol-carrier",
            "Aerosol carrier research",
            "Proposed newer research interpretation; droplets are not molecular vapor.",
            [*conditioning, "USC-401", "SEP-402", *tail],
        ),
        (
            "upstream-vaporized",
            "Upstream vaporized carrier",
            "Existing model scenario; requires measured upstream phase-change energy.",
            [*conditioning, "USC-401", "SEP-402", *tail],
        ),
        (
            "separate-h2-water",
            "Separate hydrogen + water",
            "Existing model scenario; independent hydrogen and water inventories.",
            ["WTR-101", "FLT-102", "PMP-103", *tail],
        ),
        (
            "motored-baseline",
            "Motored baseline",
            "Geometric motion only; no reactive cycle or performance prediction.",
            ["ENG-601", "EXH-701"],
        ),
    ]
    variants: list[Variant] = []
    for variant_id, label, description, chain in definitions:
        connections = [[left, right] for left, right in pairwise(chain)]
        stage_ids = [*chain, "DAT-801"]
        if variant_id == "separate-h2-water":
            stage_ids.append("H2-EXT")
            connections.append(["H2-EXT", "HC-IF-601"])
        variants.append(
            {
                "id": variant_id,
                "label": label,
                "description": description,
                "stage_ids": stage_ids,
                "connections": connections,
            }
        )
    return variants


def build_twin_manifest() -> TwinManifest:
    engine = reference_engine()
    displacement = engine.displacement_l.value
    assert displacement is not None
    radius, rod = 86.0759 / 2.0, 150.6328
    frames: list[Frame] = []
    for angle in range(361):
        theta = radians(angle)
        pin_x, pin_y = radius * sin(theta), radius * cos(theta)
        piston_y = pin_y + sqrt(rod**2 - pin_x**2)
        frames.append(
            {
                "angle_deg": angle,
                "volume_cc": float(slider_crank_volume_m3(float(angle), engine)) * 1e6,
                "piston_travel_mm": radius + rod - piston_y,
                "crank_pin_mm": [pin_x, pin_y, 0.0],
                "piston_pin_mm": [0.0, piston_y, 0.0],
                "rod_center_mm": [pin_x / 2.0, (pin_y + piston_y) / 2.0, 0.0],
                "rod_angle_rad": atan2(pin_x, piston_y - pin_y),
            }
        )
    exact = float(slider_crank_volume_m3(-10.0, engine)) * 1e6
    harmonic = 500.0 / 9 + 500.0 / 2 * (1 - cos(radians(-10)))
    return {
        "schema_version": "hydrocycle-twin/1.0.0",
        "geometry": {
            "bore_mm": 86.0,
            "stroke_mm": 86.0759,
            "crank_radius_mm": radius,
            "connecting_rod_mm": rod,
            "displacement_l": displacement,
            "nominal_displacement_l": 0.5,
            "compression_ratio": 10.0,
        },
        "coordinate_convention": (
            "Engine coordinates in mm; Y up; crank origin [0,0,0]; TDC at 0 degrees. "
            "Rod angle is clockwise from +Y toward crank pin. Frames include 0 and 360."
        ),
        "conceptual_layout_units": "Arbitrary scene units, not apparatus dimensions",
        "frames": frames,
        "stages": _stages(),
        "variants": _variants(),
        "ledger": {
            "hydrogen_mg": dict.fromkeys(["dissolved", "bubble_contained", "free", "transferred"]),
            "energy_j": dict.fromkeys(
                [
                    "input_electricity",
                    "hydrogen_chemical",
                    "phase_change",
                    "shaft_work",
                    "recovered_heat",
                ]
            ),
            "balance_status": "not_evaluable",
        },
        "reference_comparison": {
            "angle_deg": -10,
            "slider_crank_cc": exact,
            "legacy_harmonic_cc": harmonic,
            "difference_percent": (exact - harmonic) / harmonic * 100,
            "explanation": (
                "Legacy harmonic travel omits connecting-rod obliquity. Preserve the discrepancy; "
                "do not tune dimensions to match it. The legacy value uses nominal 500 cc; "
                "the exact value uses bore-derived 499.9981025 cc displacement."
            ),
        },
        "assumptions": [
            "Supplied drawing geometry is unvalidated, not a manufacturing tolerance claim.",
            (
                "Bubble d50 180 nm, number density 1e6/mL and retention 0.72 are "
                "unvalidated assumptions."
            ),
            "Variants are five finite conceptual research layouts, not an exhaustive design space.",
        ],
        "limitations": [
            "Hydrogen is the energy carrier; water contributes no chemical fuel energy.",
            (
                "Bubble and aerosol glyphs are illustrative proxies, NOT TO "
                "SCALE; no particle trajectories."
            ),
            (
                "Ultrasonic aerosolization is distinct from vaporization; "
                "phase-change energy is unknown."
            ),
            (
                "No CFD, flame fronts, performance forecast, validated reactive "
                "cycle or hardware controls."
            ),
            "All missing mass and energy measurements remain null; conservation is not evaluable.",
            "Playback speed is an illustration setting, not an engine operating recommendation.",
        ],
    }


def render_twin_manifest() -> str:
    return json.dumps(build_twin_manifest(), indent=2, sort_keys=True, allow_nan=False) + "\n"
