"""Per-cycle energy and mass ledgers and efficiencies (foundation; stdlib only).

Reference state 298.15 K with water liquid. Shaft work and friction are a split of
indicated_work_net reported beside the ledger, never added to it.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from math import isfinite
from types import MappingProxyType
from typing import Final

from .provenance import PhysicsConflict

ENERGY_IN: Final = (
    "hydrogen_chemical",
    "ultrasonic_electrical",
    "pump_electrical",
    "ancillary_electrical",
    "thermal_preconditioning",
    "inlet_sensible",
)
ENERGY_OUT: Final = (
    "indicated_work_net",
    "cooling_wall_heat",
    "ultrasonic_ambient_heat",
    "ancillary_heat",
    "vented_hydrogen_chemical",
    "exhaust_residual_chemical",
    "exhaust_latent",
    "exhaust_sensible",
    "return_liquid_sensible",
)
NEGATIVE_FLAG: Final = "NEGATIVE: the modelled engine absorbs work"
UNDEFINED_FLAG: Final = "UNDEFINED: zero denominator"


def _exact(side: str, given: Mapping[str, float], expected: tuple[str, ...]) -> Mapping[str, float]:
    missing = [n for n in expected if n not in given]
    unknown = [n for n in given if n not in expected]
    if missing:
        raise ValueError(f"{side} ledger missing categories {missing}")
    if unknown:
        raise ValueError(f"{side} ledger has unknown categories {unknown}")
    for name, value in given.items():
        if not isfinite(value):
            raise ValueError(f"{side} ledger {name} must be finite")
    return MappingProxyType(dict(given))


@dataclass(frozen=True, slots=True)
class EnergyLedger:
    inputs: Mapping[str, float]
    outputs: Mapping[str, float]

    def __post_init__(self) -> None:
        object.__setattr__(self, "inputs", _exact("input", self.inputs, ENERGY_IN))
        object.__setattr__(self, "outputs", _exact("output", self.outputs, ENERGY_OUT))

    def total_in(self) -> float:
        return sum(self.inputs.values())

    def total_out(self) -> float:
        return sum(self.outputs.values())

    def residual_rel(self) -> float:
        scale = max(abs(self.total_in()), abs(self.total_out()))
        diff = self.total_in() - self.total_out()
        return diff / scale if scale > 0.0 else diff

    def check(self, tol: float = 1e-9) -> None:
        residual = self.residual_rel()
        if not abs(residual) <= tol:
            raise PhysicsConflict("energy ledger", "the ledger must close", residual)


@dataclass(frozen=True, slots=True)
class MassLedger:
    rows: Mapping[str, tuple[float, float]]  # name -> (in, out), kg per cycle

    def __post_init__(self) -> None:
        for name, (into, out) in self.rows.items():
            if not isfinite(into) or not isfinite(out):
                raise ValueError(f"mass ledger {name} must be finite")
        object.__setattr__(self, "rows", MappingProxyType(dict(self.rows)))

    def residual_rel(self, name: str) -> float:
        into, out = self.rows[name]
        scale = max(abs(into), abs(out))
        return (into - out) / scale if scale > 0.0 else into - out

    def check(self, tol: float = 1e-12) -> None:
        for name in self.rows:
            residual = self.residual_rel(name)
            if not abs(residual) <= tol:
                raise PhysicsConflict(f"{name} mass ledger", "mass is conserved", residual)


@dataclass(frozen=True, slots=True)
class Efficiency:
    name: str
    value: float | None
    numerator: float
    denominator: float
    definition: str
    flag: str | None

    @classmethod
    def ratio(cls, name: str, numerator: float, denominator: float, definition: str) -> Efficiency:
        if denominator == 0.0:
            return cls(name, None, numerator, denominator, definition, UNDEFINED_FLAG)
        flag = NEGATIVE_FLAG if numerator < 0.0 else None
        return cls(name, numerator / denominator, numerator, denominator, definition, flag)
