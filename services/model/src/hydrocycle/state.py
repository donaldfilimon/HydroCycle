"""Streams, size bins and stage results (foundation; stdlib only).

Basis: kilograms per engine cycle, per cylinder. Hydrogen in every state is costed at the
gaseous H2 enthalpy; the dissolution enthalpy is neglected [P].
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from itertools import pairwise
from math import fsum, isfinite, pi
from statistics import NormalDist
from types import MappingProxyType
from typing import Final

from . import thermo
from .provenance import PhysicsConflict

WATER_STATES: Final = ("water_bulk", "water_aerosol", "water_vapor")
H2_STATES: Final = ("h2_dissolved", "h2_bubble", "h2_free")
GAS_SPECIES: Final = ("o2", "n2")
SPECIES: Final = WATER_STATES + H2_STATES + GAS_SPECIES
BASES: Final = ("per_m3_liquid", "per_cycle")
MASS_TOLERANCE: Final = 1e-12
ENERGY_TOLERANCE: Final = 1e-9


@dataclass(frozen=True, slots=True)
class Bins:
    edges_m: tuple[float, ...]
    counts: tuple[float, ...]
    basis: str

    def __post_init__(self) -> None:
        if self.basis not in BASES:
            raise ValueError(f"basis must be one of {BASES}, got {self.basis!r}")
        if len(self.edges_m) != len(self.counts) + 1:
            raise ValueError("edges_m must have exactly one more entry than counts")
        if any(b <= a for a, b in pairwise(self.edges_m)):
            raise ValueError("edges_m must be strictly increasing")
        if any(not (isfinite(c) and c >= 0.0) for c in self.counts):
            raise ValueError("counts must be finite and non-negative")

    @classmethod
    def lognormal(
        cls,
        *,
        d50_m: float,
        gsd: float,
        total: float,
        basis: str,
        k: int = 32,
        span_sigma: float = 3.5,
    ) -> Bins:
        if basis not in BASES:
            raise ValueError(f"basis must be one of {BASES}, got {basis!r}")
        if not (d50_m > 0.0 and gsd > 1.0 and total >= 0.0 and k >= 1):
            raise ValueError("need d50_m > 0, gsd > 1, total >= 0, k >= 1")
        z = [-span_sigma + 2.0 * span_sigma * i / k for i in range(k + 1)]
        edges = tuple(d50_m * gsd**zi for zi in z)
        cdf = [NormalDist().cdf(zi) for zi in z]
        raw = [b - a for a, b in pairwise(cdf)]
        scale = total / fsum(raw)
        counts = [r * scale for r in raw[:-1]]
        counts.append(max(total - fsum(counts), 0.0))  # the remainder closes the sum to 1 ulp
        return cls(edges, tuple(counts), basis)

    def centers_m(self) -> tuple[float, ...]:
        return tuple((a * b) ** 0.5 for a, b in pairwise(self.edges_m))

    def total(self) -> float:
        return fsum(self.counts)

    def volume_sum_m3(self) -> float:
        return sum(n * pi * d**3 / 6.0 for n, d in zip(self.counts, self.centers_m(), strict=True))

    def as_dict(self) -> dict[str, object]:
        return {"edges_m": list(self.edges_m), "counts": list(self.counts), "basis": self.basis}


def _species_enthalpy_j(species: str, kg: float, t_k: float) -> float:
    if kg == 0.0:
        return 0.0
    if species in ("water_bulk", "water_aerosol"):
        return kg * thermo.h_liquid_water_mass(t_k)
    if species == "water_vapor":
        return kg * thermo.h_mass("H2O", t_k)
    if species in H2_STATES:
        return kg * thermo.h_mass("H2", t_k)
    return kg * thermo.h_mass(species.upper(), t_k)


@dataclass(frozen=True, slots=True)
class Stream:
    name: str
    t_k: float
    p_pa: float
    masses_kg: Mapping[str, float]
    bubbles: Bins | None = None
    droplets: Bins | None = None

    def __post_init__(self) -> None:
        if not (isfinite(self.t_k) and self.t_k > 0.0 and isfinite(self.p_pa) and self.p_pa > 0.0):
            raise ValueError("stream temperature and pressure must be positive and finite")
        for species, kg in self.masses_kg.items():
            if species not in SPECIES:
                raise KeyError(f"unknown species {species!r}; expected one of {SPECIES}")
            if not (isfinite(kg) and kg >= 0.0):
                raise ValueError(f"{species} mass must be finite and non-negative, got {kg!r}")
        object.__setattr__(self, "masses_kg", MappingProxyType(dict(self.masses_kg)))

    def total_mass(self) -> float:
        return sum(self.masses_kg.values())

    def h2_mass(self) -> float:
        return sum(self.masses_kg.get(s, 0.0) for s in H2_STATES)

    def enthalpy_j(self) -> float:
        return sum(_species_enthalpy_j(s, kg, self.t_k) for s, kg in self.masses_kg.items())

    def as_dict(self) -> dict[str, object]:
        return {
            "name": self.name,
            "T_K": self.t_k,
            "p_Pa": self.p_pa,
            "masses_kg": dict(self.masses_kg),
            "bubbles": None if self.bubbles is None else self.bubbles.as_dict(),
            "droplets": None if self.droplets is None else self.droplets.as_dict(),
        }


_NON_NEGATIVE_DIAGNOSTICS: Final = ("_mass_added_kg", "_h2_added_kg", "_h2_reacted_kg")
_NUMERIC_DIAGNOSTICS: Final = (*_NON_NEGATIVE_DIAGNOSTICS, "_H_added_J", "_heat_to_ambient_J")


def _relative(residual: float, scale: float) -> float:
    return residual / scale if scale > 0.0 else residual


@dataclass(frozen=True, slots=True)
class StageResult:
    component_id: str
    inlet: Stream
    outlet: Stream
    side_streams: Mapping[str, Stream] = field(default_factory=dict)
    energy_in_j: Mapping[str, float] = field(default_factory=dict)
    work_out_j: float = 0.0
    diagnostics: Mapping[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not isfinite(self.work_out_j):
            raise ValueError(f"work_out_j must be finite, got {self.work_out_j!r}")
        for name, joules in self.energy_in_j.items():
            if not isfinite(joules):
                raise ValueError(f"energy_in_j[{name!r}] must be finite, got {joules!r}")
        for key in _NUMERIC_DIAGNOSTICS:
            if key not in self.diagnostics:
                continue
            value = self.diagnostics[key]
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                raise ValueError(f"diagnostic {key} must be a number, got {value!r}")
            if not isfinite(value):
                raise ValueError(f"diagnostic {key} must be finite, got {value!r}")
            if key in _NON_NEGATIVE_DIAGNOSTICS and value < 0.0:
                raise ValueError(f"diagnostic {key} must be non-negative, got {value!r}")

    def _number(self, key: str) -> float:
        value = self.diagnostics.get(key, 0.0)
        if not isinstance(value, (int, float)):
            raise TypeError(f"diagnostic {key} must be a number")
        return float(value)

    def mass_residual(self) -> float:
        into = self.inlet.total_mass() + self._number("_mass_added_kg")
        out = self.outlet.total_mass() + sum(s.total_mass() for s in self.side_streams.values())
        return _relative(into - out, into)

    def h2_residual(self) -> float:
        into = self.inlet.h2_mass() + self._number("_h2_added_kg")
        out = (
            self.outlet.h2_mass()
            + sum(s.h2_mass() for s in self.side_streams.values())
            + self._number("_h2_reacted_kg")
        )
        return _relative(into - out, into)

    def energy_residual(self) -> float:
        h_in = self.inlet.enthalpy_j() + self._number("_H_added_J") + sum(self.energy_in_j.values())
        h_out = (
            self.outlet.enthalpy_j()
            + sum(s.enthalpy_j() for s in self.side_streams.values())
            + self.work_out_j
            + self._number("_heat_to_ambient_J")
        )
        return _relative(h_in - h_out, abs(h_in) + abs(h_out))

    def check(self) -> None:
        mass = self.mass_residual()
        if not abs(mass) <= MASS_TOLERANCE:
            raise PhysicsConflict(f"{self.component_id} mass", "no stage creates mass", mass)
        h2 = self.h2_residual()
        if not abs(h2) <= MASS_TOLERANCE:
            raise PhysicsConflict(f"{self.component_id} hydrogen", "no stage creates hydrogen", h2)
        energy = self.energy_residual()
        if not abs(energy) <= ENERGY_TOLERANCE:
            raise PhysicsConflict(f"{self.component_id} energy", "stage energy balance", energy)
