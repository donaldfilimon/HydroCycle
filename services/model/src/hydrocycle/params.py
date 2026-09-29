"""Parameter sets and the P0 reference (foundation; stdlib only)."""

from __future__ import annotations

import hashlib
import json
from collections.abc import Mapping
from dataclasses import dataclass, field, replace
from types import MappingProxyType

from .provenance import Q, Tag


@dataclass(frozen=True, slots=True)
class ParameterSet:
    quantities: Mapping[str, Q]
    options: Mapping[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        for name, quantity in self.quantities.items():
            if not isinstance(quantity, Q):
                raise TypeError(f"parameter {name!r} must be a provenance.Q")
        object.__setattr__(self, "quantities", MappingProxyType(dict(self.quantities)))
        object.__setattr__(self, "options", MappingProxyType(dict(self.options)))

    def values(self) -> dict[str, float]:
        return {name: q.value for name, q in self.quantities.items()}

    def with_values(self, overrides: Mapping[str, float]) -> ParameterSet:
        updated = dict(self.quantities)
        for name, value in overrides.items():
            if name not in updated:
                raise KeyError(name)
            old = updated[name]
            updated[name] = replace(old, value=value, tag=Tag.P, note=f"override; {old.note}")
        return ParameterSet(updated, self.options)

    def with_options(self, overrides: Mapping[str, str]) -> ParameterSet:
        updated = dict(self.options)
        for name, value in overrides.items():
            if name not in updated:
                raise KeyError(name)
            updated[name] = value
        return ParameterSet(self.quantities, updated)

    def fingerprint(self) -> str:
        canonical = {
            "quantities": {
                name: [q.value.hex(), q.unit, q.tag.value]
                for name, q in sorted(self.quantities.items())
            },
            "options": dict(sorted(self.options.items())),
        }
        payload = json.dumps(canonical, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(payload.encode()).hexdigest()


def _synthetic(value: float, unit: str, source_id: str) -> Q:
    return Q(value, unit, Tag.P, f"synthetic default {source_id}")


P0 = ParameterSet(
    {
        "displacement_m3": _synthetic(5.0e-4, "m3", "synthetic-engine-displacement"),
        "bore_m": _synthetic(0.086, "m", "synthetic-engine-bore"),
        "stroke_m": _synthetic(0.086, "m", "synthetic-engine-stroke"),
        "rod_m": _synthetic(0.143, "m", "synthetic-engine-rod"),
        "compression_ratio": _synthetic(10.5, "1", "synthetic-engine-compression-ratio"),
        "volumetric_efficiency": _synthetic(0.90, "1", "synthetic-engine-ve"),
        "engine_speed_rpm": _synthetic(2_000.0, "rpm", "synthetic-engine-speed"),
        "water_T_K": _synthetic(298.15, "K", "sample-temperature"),
        "water_p_Pa": _synthetic(1.0e5, "Pa", "sample-pressure"),
    },
    {
        "scenario": "gated",
        "heat_transfer": "woschni",
        "phase_closure": "equilibrium",
        "retention_closure": "supplied",
        "retention_scope": "all_hydrogen",
    },
)
