"""Slider-crank geometry (foundation; stdlib only). TDC at 0 deg, BDC at +/-180 deg."""

from __future__ import annotations

from dataclasses import dataclass
from math import cos, isfinite, pi, radians, sin, sqrt

from .provenance import Tag, diagnostic


@dataclass(frozen=True, slots=True)
class Geometry:
    bore_m: float
    stroke_m: float
    rod_m: float
    compression_ratio: float
    displacement_m3: float

    def __post_init__(self) -> None:
        for name in ("bore_m", "stroke_m", "rod_m", "displacement_m3"):
            value = getattr(self, name)
            if not (isfinite(value) and value > 0.0):
                raise ValueError(f"{name} must be positive and finite, got {value!r}")
        if not (isfinite(self.compression_ratio) and self.compression_ratio > 1.0):
            raise ValueError("compression_ratio must exceed 1")
        if self.rod_m <= self.crank_radius_m:
            raise ValueError("rod_m must be longer than the crank radius")

    @property
    def crank_radius_m(self) -> float:
        return self.stroke_m / 2.0

    @property
    def piston_area_m2(self) -> float:
        # displacement / stroke, as physics.slider_crank_volume_m3 does
        return self.displacement_m3 / self.stroke_m

    @property
    def clearance_m3(self) -> float:
        return self.displacement_m3 / (self.compression_ratio - 1.0)

    def pin_height_m(self, theta_deg: float) -> float:
        """Wrist-pin height above the crank centre."""

        theta = radians(theta_deg)
        r, rod = self.crank_radius_m, self.rod_m
        return r * cos(theta) + sqrt(rod**2 - (r * sin(theta)) ** 2)

    def piston_travel_m(self, theta_deg: float) -> float:
        return self.crank_radius_m + self.rod_m - self.pin_height_m(theta_deg)

    def volume_m3(self, theta_deg: float) -> float:
        return self.clearance_m3 + self.piston_area_m2 * self.piston_travel_m(theta_deg)

    def wall_area_m2(self, theta_deg: float) -> float:
        """Head + piston crown + liner exposed at this angle (bore-based)."""

        bore_area = pi * self.bore_m**2 / 4.0
        exposed_height = self.volume_m3(theta_deg) / bore_area
        return 2.0 * bore_area + pi * self.bore_m * exposed_height


def gate1_audit(g: Geometry) -> dict[str, dict[str, float | str]]:
    """Report, never reconcile, the consistency of the declared engine."""

    geometric = pi * g.bore_m**2 / 4.0 * g.stroke_m
    return {
        "bore_stroke_displacement_m3": diagnostic(
            geometric,
            "m3",
            Tag.CALC,
            "pi B^2 S / 4 from bore and stroke",
        ),
        "displacement_mismatch_rel": diagnostic(
            geometric / g.displacement_m3 - 1.0,
            "1",
            Tag.CALC,
            "bore-stroke displacement against the declared displacement; not fitted away",
        ),
        "rod_crank_ratio": diagnostic(
            g.rod_m / g.crank_radius_m,
            "1",
            Tag.CALC,
        ),
        "compression_ratio_check": diagnostic(
            g.volume_m3(180.0) / g.volume_m3(0.0),
            "1",
            Tag.CALC,
            "V(BDC)/V(TDC); equals the declared ratio by construction",
        ),
    }
