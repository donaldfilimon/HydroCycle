"""Provenance for every number entering the P1 model (foundation; stdlib only)."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from math import isfinite
from typing import Final


class Tag(StrEnum):
    """Where a number comes from."""

    LIT = "LIT"  # literature value
    CALC = "CALC"  # computed by this model
    MEAS = "MEAS"  # measured
    P = "P"  # modelling premise (assumption)
    I = "I"  # noqa: E741 (inference drawn from other values)


@dataclass(frozen=True, slots=True)
class Q:
    """A tagged scalar in SI units."""

    value: float
    unit: str
    tag: Tag
    note: str = ""

    def __post_init__(self) -> None:
        if not isfinite(self.value):
            raise ValueError(f"Q value must be finite, got {self.value!r}")
        if not self.unit:
            raise ValueError("Q unit must be a non-empty string")


def diagnostic(value: float, unit: str, tag: Tag, note: str = "") -> dict[str, float | str]:
    """A stage diagnostic in the spec's shape."""

    return {"value": value, "unit": unit, "tag": tag.value, "note": note}


class PhysicsConflict(Exception):  # noqa: N818
    """A conservation rule failed. Raised, never clamped."""

    def __init__(self, what: str, failed_assumption: str, residual: float) -> None:
        super().__init__(f"{what}: {failed_assumption} (residual {residual:.3e})")
        self.what = what
        self.failed_assumption = failed_assumption
        self.residual = residual


class HazardTBD:
    """Marker for a safety value this model must never invent."""

    _instance: HazardTBD | None = None

    def __new__(cls) -> HazardTBD:
        instance = cls._instance
        if instance is None:
            instance = super().__new__(cls)
            cls._instance = instance
        return instance

    def __repr__(self) -> str:
        return "HAZARD_TBD"


HAZARD_TBD: Final = HazardTBD()
