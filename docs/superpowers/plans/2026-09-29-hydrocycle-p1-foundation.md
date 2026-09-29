# HydroCycle P1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (Donald's chosen method, 2026-09-29) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Author and freeze the six stdlib-only foundation modules of the P1 model (`provenance`, `thermo`, `geometry`, `params`, `state`, `ledger`) inside `services/model/src/hydrocycle/`, and apply the two invariant amendments, without changing any existing result.

**Architecture:** New modules sit beside `physics.py` and import only the standard library and each other. Nothing existing imports them yet. Stage plans (flow, hydrogen, acoustic, ...) consume them later. A surface file freezes their public API, and an AST guard keeps them stdlib-only. Cantera is used only in `@pytest.mark.cantera` oracle tests.

**Tech Stack:** Python 3.14, stdlib (`math`, `statistics`, `dataclasses`, `hashlib`, `json`, `enum`, `ast`, `inspect`), pytest, ruff, strict mypy; Cantera 3.2 as a test oracle.

**Spec:** `docs/superpowers/specs/2026-09-29-hydrocycle-p1-design.md` §3.1, §3.2, §3.7 and §7, arguing from `docs/p1/model-spec.md` §1, §2, §4, §5.

## Context

Donald approved the revised P1 design ("next", 2026-09-29 15:20) and chose subagent-driven execution. Sub-project 1 evolves `hydrocycle` into the P1 model in place. It is too large for one plan, so it splits into this foundation plan, then one plan per stage group. The foundation files do not exist yet: the P1 spec's "do not edit the foundation files" rule starts to bite once this plan freezes them (Task 7).

Measured facts this plan relies on:
- The NASA-7 coefficients below are copied from the installed Cantera `gri30.yaml`.
- LHV derived from them is 119,959,829.77 J/kg, 5.7e-6 below `physics.H2_LHV_J_PER_KG`.
- h_fg(298.15 K) is 3.1e-5 above `physics.WATER_VAPORIZATION_J_PER_KG` × M.
- Wagner-Pruss p_sat(373.124 K) = 101,324 Pa.
- The default engine (`EngineInput()`: 0.5 L, bore 86 mm, stroke 86 mm, rod 143 mm, CR 10.5) is over-determined: π·B²·S/4 = 0.4995572 L, 0.0886 % below the declared 0.5 L.

## Global Constraints

- The foundation modules import only the standard library and other foundation modules (`provenance`, `thermo`, `geometry`, `params`, `state`, `ledger`). Never `numpy`, `scipy`, `pydantic`, `cantera`, `schemas`, or `physics`.
- float64 and SI units inside (K, Pa, kg, J, m, s, mol).
- Water states stay separate: `water_bulk`, `water_aerosol`, `water_vapor`. Hydrogen states stay separate: `h2_dissolved`, `h2_bubble`, `h2_free`. Never merged.
- No invented safety values: ratings, relief settings, supply sizing, ignition timing, hazardous concentrations, vessel dimensions and setpoints are `provenance.HAZARD_TBD`.
- Determinism: no wall-clock time and no unseeded randomness.
- Nothing existing changes behaviour. `physics.py`, `api.py`, the schemas, `__init__.__all__` and the generated contracts stay untouched, so `bun run contracts:check` shows no drift.
- The gate for every task is `bun run check:model` (ruff format, ruff, strict mypy, pytest). `bun run check` must be green before the plan is called done.
- Cantera oracle tests carry `@pytest.mark.cantera` and import `cantera` inside the test.
- Every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Work on `main` in the canonical checkout; run `git fetch` and `git status --no-optional-locks` before the first task.

## Review Focus

1. **Intake air below 300 K.** GRI's N2 polynomial starts at 300 K, but intake air at 280 K is ordinary. `thermo` must return finite values from 200 K (extrapolating the low polynomial, as Cantera does) and raise only outside [200 K, upper bound]. This is pinned in Task 2.
2. **A run with no hydrogen.** An efficiency whose denominator is zero must come back `value=None` with a flag, never `ZeroDivisionError` and never `0.0` (invariant 3). This is pinned in Task 6.
3. **Bin counts that drift from their total.** Naive float accumulation drifts; the last bin takes the `fsum` remainder, so the counts reproduce the total to one ulp, far inside the 1e-12 stage residuals. This is pinned in Task 5.
4. **Negative or non-finite masses in a stream.** These must be rejected at construction, not discovered as a mysterious residual three stages later. This is pinned in Task 5.
5. **Impossible engine geometry.** A rod no longer than the crank radius, CR ≤ 1, or a non-positive dimension must raise `ValueError`, not produce `nan` from `sqrt`. This is pinned in Task 3.

---

### Task 0: Record this plan in the repository

**Files:**
- Create: `docs/superpowers/plans/2026-09-29-hydrocycle-p1-foundation.md` (this document, verbatim)

- [ ] **Step 1:** Copy this plan to that path.
- [ ] **Step 2:** Commit.

```bash
git add docs/superpowers/plans/2026-09-29-hydrocycle-p1-foundation.md
git commit -m "docs(plan): P1 model foundation implementation plan

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 1: `provenance` and the invariant amendments

**Files:**
- Create: `services/model/src/hydrocycle/provenance.py`
- Create: `services/model/tests/test_foundation_provenance.py`
- Modify: `AGENTS.md` (invariants 1 and 4), `CLAUDE.md` (the one-line invariant summary)

**Interfaces:**
- Produces:
  - `Tag` (StrEnum `LIT`, `CALC`, `MEAS`, `P`, `I`);
  - `Q(value: float, unit: str, tag: Tag, note: str = "")`, frozen;
  - `diagnostic(value: float, unit: str, tag: Tag, note: str = "") -> dict[str, float | str]`;
  - `PhysicsConflict(what: str, failed_assumption: str, residual: float)`;
  - `HAZARD_TBD` (singleton of `HazardTBD`).

- [ ] **Step 1: Write the failing test**

```python
# services/model/tests/test_foundation_provenance.py
from __future__ import annotations

import math

import pytest

from hydrocycle.provenance import HAZARD_TBD, PhysicsConflict, Q, Tag, diagnostic


def test_q_holds_value_unit_tag_and_note() -> None:
    q = Q(0.086, "m", Tag.LIT, "bore")
    assert (q.value, q.unit, q.tag, q.note) == (0.086, "m", Tag.LIT, "bore")


@pytest.mark.parametrize("bad", [math.nan, math.inf, -math.inf])
def test_q_rejects_non_finite_values(bad: float) -> None:
    with pytest.raises(ValueError, match="finite"):
        Q(bad, "m", Tag.CALC)


def test_q_rejects_an_empty_unit() -> None:
    with pytest.raises(ValueError, match="unit"):
        Q(1.0, "", Tag.CALC)


def test_diagnostic_has_the_spec_shape() -> None:
    assert diagnostic(2.5, "J", Tag.CALC, "wall heat") == {
        "value": 2.5,
        "unit": "J",
        "tag": "CALC",
        "note": "wall heat",
    }


def test_physics_conflict_carries_its_fields() -> None:
    error = PhysicsConflict("hydrogen", "no stage creates hydrogen", 3.0e-9)
    assert error.what == "hydrogen"
    assert error.failed_assumption == "no stage creates hydrogen"
    assert error.residual == 3.0e-9
    assert "3.000e-09" in str(error)


def test_hazard_tbd_is_a_singleton_that_is_never_a_number() -> None:
    from hydrocycle.provenance import HazardTBD

    assert HazardTBD() is HAZARD_TBD
    assert repr(HAZARD_TBD) == "HAZARD_TBD"
    with pytest.raises(TypeError):
        float(HAZARD_TBD)  # type: ignore[arg-type]
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd services/model && uv run --frozen pytest tests/test_foundation_provenance.py -q`
Expected: FAIL with `ModuleNotFoundError: No module named 'hydrocycle.provenance'`.

- [ ] **Step 3: Implement**

```python
# services/model/src/hydrocycle/provenance.py
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


class PhysicsConflict(Exception):
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
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `cd services/model && uv run --frozen pytest tests/test_foundation_provenance.py -q`
Expected: 8 passed.

- [ ] **Step 5: Amend the invariants.**

In `AGENTS.md`, replace invariant 1 with:

```markdown
1. A failed feasibility gate returns a motored baseline and sensitivities, but
   no proposed reactive cycle. The `ideal_complete` scenario is not a proposed
   cycle: it runs only when explicitly requested, is never persisted or exported
   as a proposal, and every value it produces is labelled `IDEAL, NOT PHYSICAL`.
```

and invariant 4 with:

```markdown
4. The 0D model is homogeneous and single-zone. Do not render flame fronts,
   velocity fields, particle trajectories, or CFD contours. Two exceptions, both
   drawn only from model output: a uniform whole-chamber tint scaled by the
   baked `x_burned` at the current crank angle (no front, no shape, no motion),
   and static proxies for bubbles, droplets, vapour and hydrogen that never move
   along a path, whose count never feeds a number, and which always appear with
   `VISUALIZATION NOT TO SCALE`.
```

In `CLAUDE.md`, change `single-zone 0D with no CFD
rendering` to `single-zone 0D with no CFD
rendering beyond two scoped exceptions`.

- [ ] **Step 6: Gate and commit**

Run: `bun run check:model`. Expected: all green, with the pytest count 8 above the previous run.

```bash
git add services/model/src/hydrocycle/provenance.py services/model/tests/test_foundation_provenance.py AGENTS.md CLAUDE.md
git commit -m "feat(model): P1 provenance foundation; scope invariants 1 and 4

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2: `thermo`, with Cantera as oracle

**Files:**
- Create: `services/model/src/hydrocycle/thermo.py`
- Create: `services/model/tests/test_foundation_thermo.py`

**Interfaces:**
- Produces:
  - constants `R_U`, `T_REF`, `MOLAR_MASS: dict[str, float]` (keys `H2`, `O2`, `N2`, `H2O`);
  - `cp_molar(species: str, t_k: float) -> float` (J/(mol·K));
  - `h_molar(species: str, t_k: float) -> float` (absolute J/mol);
  - `u_molar(species: str, t_k: float) -> float`;
  - `h_mass(species: str, t_k: float) -> float` (J/kg);
  - `h_liquid_water_molar(t_k: float) -> float`, `h_liquid_water_mass(t_k: float) -> float`;
  - `p_sat(t_k: float) -> float` (Pa), `t_sat(p_pa: float) -> float` (K);
  - `h_fg(t_k: float) -> float` (J/kg);
  - `LHV_H2: float` (J/kg).

- [ ] **Step 1: Write the failing test**

```python
# services/model/tests/test_foundation_thermo.py
from __future__ import annotations

import pytest

from hydrocycle import thermo

PHYSICS_LHV_J_PER_KG = 241_826.0 / 0.00201588
PHYSICS_HFG_J_PER_KG = 44_004.0 / 0.01801528


def test_lhv_matches_the_live_model_constant() -> None:
    assert thermo.LHV_H2 == pytest.approx(PHYSICS_LHV_J_PER_KG, rel=1e-4)


def test_h_fg_at_reference_matches_the_live_model_constant() -> None:
    assert thermo.h_fg(thermo.T_REF) == pytest.approx(PHYSICS_HFG_J_PER_KG, rel=1e-3)


def test_h_fg_is_a_difference_of_thermo_functions() -> None:
    t = 330.0
    expected = (thermo.h_molar("H2O", t) - thermo.h_liquid_water_molar(t)) / thermo.MOLAR_MASS["H2O"]
    assert thermo.h_fg(t) == expected


def test_p_sat_at_the_normal_boiling_point() -> None:
    assert thermo.p_sat(373.124) == pytest.approx(101_325.0, rel=1e-4)
    assert thermo.p_sat(298.15) == pytest.approx(3_169.9, rel=1e-3)


def test_t_sat_inverts_p_sat() -> None:
    for t in (280.0, 310.0, 350.0, 420.0):
        assert thermo.t_sat(thermo.p_sat(t)) == pytest.approx(t, abs=1e-6)


def test_low_temperature_intake_air_is_finite() -> None:
    # N2's GRI polynomial starts at 300 K; 280 K intake air must still work (extrapolated).
    assert thermo.h_molar("N2", 280.0) < thermo.h_molar("N2", 300.0)


@pytest.mark.parametrize(("species", "t_k"), [("N2", 199.0), ("H2", 3_501.0), ("N2", 5_001.0)])
def test_out_of_range_temperatures_raise(species: str, t_k: float) -> None:
    with pytest.raises(ValueError, match="outside"):
        thermo.h_molar(species, t_k)


def test_unknown_species_raises() -> None:
    with pytest.raises(KeyError):
        thermo.h_molar("CH4", 300.0)


@pytest.mark.cantera
@pytest.mark.parametrize("species", ["H2", "O2", "N2", "H2O"])
@pytest.mark.parametrize("t_k", [300.0, 500.0, 999.0, 1_001.0, 1_800.0, 3_000.0])
def test_species_enthalpy_and_cp_match_cantera(species: str, t_k: float) -> None:
    import cantera as ct

    gas = ct.Solution("gri30.yaml")
    gas.TPX = t_k, ct.one_atm, f"{species}:1"
    assert thermo.h_molar(species, t_k) == pytest.approx(gas.enthalpy_mole / 1000.0, rel=1e-9, abs=1e-6)
    assert thermo.cp_molar(species, t_k) == pytest.approx(gas.cp_mole / 1000.0, rel=1e-9)


@pytest.mark.cantera
@pytest.mark.parametrize("t_k", [280.0, 300.0, 340.0, 370.0])
def test_saturation_and_latent_heat_match_cantera_water(t_k: float) -> None:
    import cantera as ct

    water = ct.Water()
    water.TQ = t_k, 0.0
    h_liquid = water.enthalpy_mass
    p = water.P
    water.TQ = t_k, 1.0
    assert thermo.p_sat(t_k) == pytest.approx(p, rel=5e-3)
    assert thermo.h_fg(t_k) == pytest.approx(water.enthalpy_mass - h_liquid, rel=1.5e-2)
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd services/model && uv run --frozen pytest tests/test_foundation_thermo.py -q`
Expected: FAIL with `ModuleNotFoundError: No module named 'hydrocycle.thermo'`.

- [ ] **Step 3: Implement**

```python
# services/model/src/hydrocycle/thermo.py
"""Absolute enthalpies and water saturation (foundation; stdlib only).

Gas species use the NASA 7-coefficient fits copied verbatim from Cantera 3.2's gri30.yaml
(GRI-Mech 3.0) [LIT]. Liquid water uses the CODATA formation enthalpy and a constant molar
heat capacity at 298.15 K [LIT, P]; valid 273.16 K to about 450 K. Saturation pressure is
the Wagner-Pruss equation (IAPWS 1992 supplementary release) [LIT]. h_fg is the difference
of the vapour and liquid functions here, never a separate constant (model spec rule 7).
"""

from __future__ import annotations

from math import exp
from typing import Final

R_U: Final = 8.314462618  # J/(mol K), CODATA 2018 [LIT]
T_REF: Final = 298.15  # K

MOLAR_MASS: Final[dict[str, float]] = {
    "H2": 0.00201588,
    "O2": 0.0319988,
    "N2": 0.0280134,
    "H2O": 0.01801528,
}

# (t_low, t_mid, t_high, low-range coefficients, high-range coefficients), gri30.yaml.
_NASA7: Final[dict[str, tuple[float, float, float, tuple[float, ...], tuple[float, ...]]]] = {
    "H2": (200.0, 1000.0, 3500.0,
           (2.34433112, 7.98052075e-03, -1.9478151e-05, 2.01572094e-08, -7.37611761e-12,
            -917.935173, 0.683010238),
           (3.3372792, -4.94024731e-05, 4.99456778e-07, -1.79566394e-10, 2.00255376e-14,
            -950.158922, -3.20502331)),
    "O2": (200.0, 1000.0, 3500.0,
           (3.78245636, -2.99673416e-03, 9.84730201e-06, -9.68129509e-09, 3.24372837e-12,
            -1063.94356, 3.65767573),
           (3.28253784, 1.48308754e-03, -7.57966669e-07, 2.09470555e-10, -2.16717794e-14,
            -1088.45772, 5.45323129)),
    "N2": (300.0, 1000.0, 5000.0,
           (3.298677, 1.4082404e-03, -3.963222e-06, 5.641515e-09, -2.444854e-12,
            -1020.8999, 3.950372),
           (2.92664, 1.4879768e-03, -5.68476e-07, 1.0097038e-10, -6.753351e-15,
            -922.7977, 5.980528)),
    "H2O": (200.0, 1000.0, 3500.0,
            (4.19864056, -2.0364341e-03, 6.52040211e-06, -5.48797062e-09, 1.77197817e-12,
             -3.02937267e04, -0.849032208),
            (3.03399249, 2.17691804e-03, -1.64072518e-07, -9.7041987e-11, 1.68200992e-14,
             -3.00042971e04, 4.9667701)),
}
_EXTRAPOLATION_FLOOR_K: Final = 200.0  # low polynomials are used down to here, as Cantera does

H_F_LIQUID_WATER: Final = -285_830.0  # J/mol at 298.15 K, CODATA [LIT]
CP_LIQUID_WATER_MOLAR: Final = 75.327  # J/(mol K) at 298.15 K [LIT], held constant [P]

_T_CRIT: Final = 647.096  # K
_P_CRIT: Final = 22.064e6  # Pa
_T_TRIPLE: Final = 273.16  # K
_WAGNER: Final = (-7.85951783, 1.84408259, -11.7866497, 22.6807411, -15.9618719, 1.80122502)


def _coefficients(species: str, t_k: float) -> tuple[float, ...]:
    _t_low, t_mid, t_high, low, high = _NASA7[species]
    if not _EXTRAPOLATION_FLOOR_K <= t_k <= t_high:
        raise ValueError(
            f"{species} temperature {t_k} K is outside [{_EXTRAPOLATION_FLOOR_K}, {t_high}] K"
        )
    return low if t_k <= t_mid else high


def cp_molar(species: str, t_k: float) -> float:
    a = _coefficients(species, t_k)
    return R_U * (a[0] + a[1] * t_k + a[2] * t_k**2 + a[3] * t_k**3 + a[4] * t_k**4)


def h_molar(species: str, t_k: float) -> float:
    a = _coefficients(species, t_k)
    return R_U * t_k * (
        a[0] + a[1] * t_k / 2 + a[2] * t_k**2 / 3 + a[3] * t_k**3 / 4 + a[4] * t_k**4 / 5
        + a[5] / t_k
    )


def u_molar(species: str, t_k: float) -> float:
    return h_molar(species, t_k) - R_U * t_k


def h_mass(species: str, t_k: float) -> float:
    return h_molar(species, t_k) / MOLAR_MASS[species]


def _check_liquid_range(t_k: float) -> None:
    if not _T_TRIPLE <= t_k <= _T_CRIT:
        raise ValueError(f"liquid water temperature {t_k} K is outside [{_T_TRIPLE}, {_T_CRIT}] K")


def h_liquid_water_molar(t_k: float) -> float:
    _check_liquid_range(t_k)
    return H_F_LIQUID_WATER + CP_LIQUID_WATER_MOLAR * (t_k - T_REF)


def h_liquid_water_mass(t_k: float) -> float:
    return h_liquid_water_molar(t_k) / MOLAR_MASS["H2O"]


def p_sat(t_k: float) -> float:
    _check_liquid_range(t_k)
    tau = 1.0 - t_k / _T_CRIT
    a1, a2, a3, a4, a5, a6 = _WAGNER
    exponent = (_T_CRIT / t_k) * (
        a1 * tau + a2 * tau**1.5 + a3 * tau**3 + a4 * tau**3.5 + a5 * tau**4 + a6 * tau**7.5
    )
    return _P_CRIT * exp(exponent)


def t_sat(p_pa: float) -> float:
    if not p_sat(_T_TRIPLE) <= p_pa <= _P_CRIT:
        raise ValueError(f"pressure {p_pa} Pa is outside the saturation range")
    low, high = _T_TRIPLE, _T_CRIT
    for _ in range(200):
        mid = 0.5 * (low + high)
        if p_sat(mid) < p_pa:
            low = mid
        else:
            high = mid
        if high - low < 1e-10:
            break
    return 0.5 * (low + high)


def h_fg(t_k: float) -> float:
    return (h_molar("H2O", t_k) - h_liquid_water_molar(t_k)) / MOLAR_MASS["H2O"]


LHV_H2: Final = -(
    h_molar("H2O", T_REF) - h_molar("H2", T_REF) - 0.5 * h_molar("O2", T_REF)
) / MOLAR_MASS["H2"]
```

Let `ruff format` reflow the coefficient table; the values must stay byte-identical to the ones above.

- [ ] **Step 4: Run it and confirm it passes**

Run: `cd services/model && uv run --frozen pytest tests/test_foundation_thermo.py -q`
Expected: 38 passed (10 non-oracle, 24 species-oracle and 4 water-oracle cases). Any Cantera mismatch is a transcription error in the table: fix the table, never the tolerance.

- [ ] **Step 5: Gate and commit**

Run: `bun run check:model`. Expected: green.

```bash
git add services/model/src/hydrocycle/thermo.py services/model/tests/test_foundation_thermo.py
git commit -m "feat(model): stdlib thermo foundation checked against Cantera

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3: `geometry`

**Files:**
- Create: `services/model/src/hydrocycle/geometry.py`
- Create: `services/model/tests/test_foundation_geometry.py`

**Interfaces:**
- Consumes: `provenance.Tag`, `provenance.diagnostic`.
- Produces:
  - `Geometry(bore_m, stroke_m, rod_m, compression_ratio, displacement_m3)`, frozen;
  - properties `crank_radius_m`, `piston_area_m2`, `clearance_m3`;
  - methods `pin_height_m(theta_deg)`, `piston_travel_m(theta_deg)`, `volume_m3(theta_deg)`, `wall_area_m2(theta_deg)`;
  - `gate1_audit(g: Geometry) -> dict[str, dict[str, float | str]]`.
- Convention (parity with `physics.slider_crank_volume_m3`): TDC at 0°, BDC at ±180°. The piston area is `displacement / stroke`, and the bore is used only for wall area and the audit.

- [ ] **Step 1: Write the failing test**

```python
# services/model/tests/test_foundation_geometry.py
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
        "bore_m": 0.086, "stroke_m": 0.086, "rod_m": 0.143,
        "compression_ratio": 10.5, "displacement_m3": 5.0e-4,
    }
    with pytest.raises(ValueError):
        Geometry(**(base | kwargs))


def test_gate1_audit_reports_the_over_determined_default_engine() -> None:
    audit = gate1_audit(DEFAULT)
    assert audit["bore_stroke_displacement_m3"]["value"] == pytest.approx(4.995572142e-4, rel=1e-9)
    assert audit["displacement_mismatch_rel"]["value"] == pytest.approx(-8.85571564e-4, rel=1e-6)
    assert audit["displacement_mismatch_rel"]["tag"] == "CALC"
    assert audit["rod_crank_ratio"]["value"] == pytest.approx(0.143 / 0.043, rel=1e-12)
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd services/model && uv run --frozen pytest tests/test_foundation_geometry.py -q`
Expected: FAIL with `ModuleNotFoundError: No module named 'hydrocycle.geometry'`.

- [ ] **Step 3: Implement**

```python
# services/model/src/hydrocycle/geometry.py
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
            geometric, "m3", Tag.CALC, "pi B^2 S / 4 from bore and stroke"
        ),
        "displacement_mismatch_rel": diagnostic(
            geometric / g.displacement_m3 - 1.0, "1", Tag.CALC,
            "bore-stroke displacement against the declared displacement; not fitted away",
        ),
        "rod_crank_ratio": diagnostic(g.rod_m / g.crank_radius_m, "1", Tag.CALC),
        "compression_ratio_check": diagnostic(
            g.volume_m3(180.0) / g.volume_m3(0.0), "1", Tag.CALC,
            "V(BDC)/V(TDC); equals the declared ratio by construction",
        ),
    }
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `cd services/model && uv run --frozen pytest tests/test_foundation_geometry.py -q`
Expected: 9 passed (the 24-angle parity check is one test; the impossible-geometry test has 4 cases). A parity failure means a convention drifted from `physics.py`.

- [ ] **Step 5: Gate and commit**

Run: `bun run check:model`. Expected: green.

```bash
git add services/model/src/hydrocycle/geometry.py services/model/tests/test_foundation_geometry.py
git commit -m "feat(model): slider-crank geometry foundation with gate-1 audit

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 4: `params`

**Files:**
- Create: `services/model/src/hydrocycle/params.py`
- Create: `services/model/tests/test_foundation_params.py`

**Interfaces:**
- Consumes: `provenance.Q`, `provenance.Tag`.
- Produces:
  - `ParameterSet(quantities: Mapping[str, Q], options: Mapping[str, str])`, frozen;
  - `.values() -> dict[str, float]`;
  - `.with_values(overrides: Mapping[str, float]) -> ParameterSet`;
  - `.with_options(overrides: Mapping[str, str]) -> ParameterSet`;
  - `.fingerprint() -> str` (64 hex chars);
  - `P0: ParameterSet`.
- `P0` holds only values the live model already defines (engine and water state). Stage plans add their parameters as module `DEFAULTS` (model spec rule 8) and promote them into `P0` deliberately.

- [ ] **Step 1: Write the failing test**

```python
# services/model/tests/test_foundation_params.py
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
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd services/model && uv run --frozen pytest tests/test_foundation_params.py -q`
Expected: FAIL with `ModuleNotFoundError: No module named 'hydrocycle.params'`.

- [ ] **Step 3: Implement**

```python
# services/model/src/hydrocycle/params.py
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
        "rod_m": _synthetic(0.143, "m", "synthetic-engine-connecting-rod"),
        "compression_ratio": _synthetic(10.5, "1", "synthetic-engine-compression-ratio"),
        "volumetric_efficiency": _synthetic(0.90, "1", "synthetic-engine-volumetric-efficiency"),
        "engine_speed_rpm": _synthetic(2_000.0, "rpm", "synthetic-engine-speed"),
        "water_T_K": _synthetic(298.15, "K", "environment-water-temperature"),
        "water_p_Pa": _synthetic(1.0e5, "Pa", "environment-water-pressure"),
    },
    {
        "scenario": "gated",
        "heat_transfer": "woschni",
        "phase_closure": "equilibrium",
        "retention_closure": "supplied",
        "retention_scope": "all_hydrogen",
    },
)
```

Before writing the literals, the implementer reads the `source_id` strings in `schemas.py` (`EngineInput`, `EnvironmentInput`) and copies them exactly. The ones above are the expected pattern, and `test_p0_matches_the_live_schema_defaults` pins the values.

- [ ] **Step 4: Run it and confirm it passes**

Run: `cd services/model && uv run --frozen pytest tests/test_foundation_params.py -q`
Expected: 6 passed.

- [ ] **Step 5: Gate and commit**

Run: `bun run check:model`. Expected: green.

```bash
git add services/model/src/hydrocycle/params.py services/model/tests/test_foundation_params.py
git commit -m "feat(model): parameter sets, fingerprint and the P0 reference

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 5: `state` (streams, size bins, stage results)

**Files:**
- Create: `services/model/src/hydrocycle/state.py`
- Create: `services/model/tests/test_foundation_state.py`

**Interfaces:**
- Consumes: `provenance.PhysicsConflict`, `thermo.h_molar`, `thermo.h_liquid_water_molar`, `thermo.MOLAR_MASS`.
- Produces:
  - `WATER_STATES`, `H2_STATES`, `GAS_SPECIES`, `SPECIES` (all tuples);
  - `Bins(edges_m: tuple[float, ...], counts: tuple[float, ...], basis: str)`, frozen, with classmethod `Bins.lognormal(d50_m, gsd, total, basis, k=32, span_sigma=3.5)`, and `.centers_m()`, `.total()`, `.volume_sum_m3()`, `.as_dict()`;
  - `Stream(name, t_k, p_pa, masses_kg: Mapping[str, float], bubbles: Bins | None = None, droplets: Bins | None = None)`, frozen, with `.total_mass()`, `.h2_mass()`, `.enthalpy_j()`, `.as_dict()`;
  - `StageResult(component_id, inlet, outlet, side_streams={}, energy_in_j={}, work_out_j=0.0, diagnostics={})`, frozen, with `.mass_residual()`, `.h2_residual()`, `.energy_residual()`, `.check()`;
  - constants `MASS_TOLERANCE = 1e-12`, `ENERGY_TOLERANCE = 1e-9`.
- Stream enthalpy convention:
  - `water_bulk` and `water_aerosol` are liquid;
  - `water_vapor` is gaseous H2O;
  - `h2_dissolved`, `h2_bubble` and `h2_free` all use gaseous H2 enthalpy (dissolution enthalpy neglected [P], recorded in the docstring);
  - `o2` and `n2` are gaseous.
- Diagnostic keys read by the residuals (float, default 0): `_mass_added_kg`, `_h2_added_kg`, `_h2_reacted_kg`, `_H_added_J`, `_heat_to_ambient_J`.

- [ ] **Step 1: Write the failing test**

```python
# services/model/tests/test_foundation_state.py
from __future__ import annotations

import math

import pytest

from hydrocycle import thermo
from hydrocycle.provenance import PhysicsConflict
from hydrocycle.state import Bins, StageResult, Stream


def water(name: str, kg: float, h2: float = 0.0, t_k: float = 298.15) -> Stream:
    return Stream(name, t_k, 1.0e5, {"water_bulk": kg, "h2_dissolved": h2})


def test_lognormal_bins_sum_to_the_total_exactly() -> None:
    bins = Bins.lognormal(d50_m=150e-9, gsd=1.6, total=3.7e14, basis="per_m3_liquid")
    assert len(bins.edges_m) == 33 and len(bins.counts) == 32
    assert math.isclose(math.fsum(bins.counts), 3.7e14, rel_tol=1e-15)
    assert bins.total() == math.fsum(bins.counts)
    assert all(c >= 0.0 for c in bins.counts)


def test_lognormal_edges_span_plus_minus_three_and_a_half_sigma() -> None:
    bins = Bins.lognormal(d50_m=1e-6, gsd=2.0, total=1.0, basis="per_cycle")
    assert bins.edges_m[0] == pytest.approx(1e-6 * 2.0**-3.5, rel=1e-12)
    assert bins.edges_m[-1] == pytest.approx(1e-6 * 2.0**3.5, rel=1e-12)
    assert bins.counts[15] == pytest.approx(bins.counts[16], rel=1e-9)  # symmetric in log space


def test_bins_reject_an_unknown_basis_and_bad_shapes() -> None:
    with pytest.raises(ValueError, match="basis"):
        Bins.lognormal(d50_m=1e-6, gsd=2.0, total=1.0, basis="per_litre")
    with pytest.raises(ValueError):
        Bins((1.0, 2.0), (1.0, 2.0), "per_cycle")


@pytest.mark.parametrize("bad", [-1e-9, math.nan, math.inf])
def test_streams_reject_negative_or_non_finite_masses(bad: float) -> None:
    with pytest.raises(ValueError):
        Stream("s", 298.15, 1.0e5, {"water_bulk": bad})


def test_streams_reject_unknown_species() -> None:
    with pytest.raises(KeyError):
        Stream("s", 298.15, 1.0e5, {"water": 1.0})


def test_stream_totals_and_enthalpy() -> None:
    s = water("in", 1.0e-3, h2=2.0e-9)
    assert s.total_mass() == 1.0e-3 + 2.0e-9
    assert s.h2_mass() == 2.0e-9
    expected = 1.0e-3 * thermo.h_liquid_water_mass(298.15) + 2.0e-9 * thermo.h_mass("H2", 298.15)
    assert s.enthalpy_j() == pytest.approx(expected, rel=1e-12)


def test_a_conserving_stage_passes_check() -> None:
    inlet = water("in", 1.0e-3, h2=2.0e-9)
    vent = Stream("vent", 298.15, 1.0e5, {"h2_free": 0.5e-9})
    outlet = water("out", 1.0e-3, h2=1.5e-9)
    result = StageResult("NBG-104", inlet, outlet, side_streams={"nbg_vent": vent})
    assert abs(result.mass_residual()) < 1e-15
    assert abs(result.h2_residual()) < 1e-15
    result.check()


def test_creating_hydrogen_raises_physics_conflict() -> None:
    inlet = water("in", 1.0e-3, h2=2.0e-9)
    outlet = water("out", 1.0e-3, h2=3.0e-9)
    with pytest.raises(PhysicsConflict, match="hydrogen"):
        StageResult("NBG-104", inlet, outlet).check()


def test_reacted_hydrogen_is_accounted_for() -> None:
    inlet = Stream("in", 400.0, 1.0e5, {"h2_free": 2.0e-9, "o2": 16.0e-9})
    outlet = Stream("out", 400.0, 1.0e5, {"h2_free": 1.0e-9, "o2": 8.06e-9, "water_vapor": 8.94e-9})
    result = StageResult("ENG-601", inlet, outlet, diagnostics={"_h2_reacted_kg": 1.0e-9})
    assert abs(result.h2_residual()) < 1e-12


def test_energy_residual_counts_inputs_work_and_ambient_heat() -> None:
    inlet = water("in", 1.0e-3)
    outlet = water("out", 1.0e-3, t_k=299.15)
    rise = outlet.enthalpy_j() - inlet.enthalpy_j()
    result = StageResult(
        "PMP-103", inlet, outlet,
        energy_in_j={"pump_electrical": rise + 0.25},
        diagnostics={"_heat_to_ambient_J": 0.25},
    )
    assert abs(result.energy_residual()) < 1e-12
    result.check()
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd services/model && uv run --frozen pytest tests/test_foundation_state.py -q`
Expected: FAIL with `ModuleNotFoundError: No module named 'hydrocycle.state'`.

- [ ] **Step 3: Implement**

```python
# services/model/src/hydrocycle/state.py
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
        cls, *, d50_m: float, gsd: float, total: float, basis: str, k: int = 32,
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
        if abs(mass) > MASS_TOLERANCE:
            raise PhysicsConflict(f"{self.component_id} mass", "no stage creates mass", mass)
        h2 = self.h2_residual()
        if abs(h2) > MASS_TOLERANCE:
            raise PhysicsConflict(f"{self.component_id} hydrogen", "no stage creates hydrogen", h2)
        energy = self.energy_residual()
        if abs(energy) > ENERGY_TOLERANCE:
            raise PhysicsConflict(f"{self.component_id} energy", "stage energy balance", energy)
```

Naming: the model spec writes `energy_in_J`, `work_out_J`. This repository's ruff `N` rules and its existing code (`water_heating_burden_j`) use lowercase units, so the Python names are `energy_in_j`, `work_out_j` and `enthalpy_j`. Diagnostic *keys* are strings and keep the spec's spelling (`_heat_to_ambient_J`).

- [ ] **Step 4: Run it and confirm it passes**

Run: `cd services/model && uv run --frozen pytest tests/test_foundation_state.py -q`
Expected: 12 passed. If `test_reacted_hydrogen_is_accounted_for` fails, the h2 accounting is wrong. Do not loosen `MASS_TOLERANCE`.

- [ ] **Step 5: Gate and commit**

Run: `bun run check:model`. Expected: green.

```bash
git add services/model/src/hydrocycle/state.py services/model/tests/test_foundation_state.py
git commit -m "feat(model): streams, lognormal bins and conserving stage results

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6: `ledger` (energy and mass ledgers, efficiencies)

**Files:**
- Create: `services/model/src/hydrocycle/ledger.py`
- Create: `services/model/tests/test_foundation_ledger.py`

**Interfaces:**
- Consumes: `provenance.PhysicsConflict`.
- Produces:
  - `ENERGY_IN`, `ENERGY_OUT` (the model spec §5 category names);
  - `EnergyLedger(inputs: Mapping[str, float], outputs: Mapping[str, float])`, frozen, with `.total_in()`, `.total_out()`, `.residual_rel()`, `.check(tol=1e-9)`;
  - `MassLedger(rows: Mapping[str, tuple[float, float]])`, with `.residual_rel(name)`, `.check(tol=1e-12)`;
  - `Efficiency(name, value: float | None, numerator, denominator, definition, flag: str | None)`, with classmethod `Efficiency.ratio(name, numerator, denominator, definition)`;
  - `NEGATIVE_FLAG = "NEGATIVE: the modelled engine absorbs work"`, `UNDEFINED_FLAG = "UNDEFINED: zero denominator"`.

- [ ] **Step 1: Write the failing test**

```python
# services/model/tests/test_foundation_ledger.py
from __future__ import annotations

import pytest

from hydrocycle.ledger import (
    ENERGY_IN,
    ENERGY_OUT,
    NEGATIVE_FLAG,
    UNDEFINED_FLAG,
    Efficiency,
    EnergyLedger,
    MassLedger,
)
from hydrocycle.provenance import PhysicsConflict


def zeros(names: tuple[str, ...]) -> dict[str, float]:
    return dict.fromkeys(names, 0.0)


def test_a_closing_ledger_passes() -> None:
    ledger = EnergyLedger(
        zeros(ENERGY_IN) | {"hydrogen_chemical": 100.0, "pump_electrical": 5.0},
        zeros(ENERGY_OUT) | {"indicated_work_net": 20.0, "cooling_wall_heat": 85.0},
    )
    assert ledger.residual_rel() == 0.0
    ledger.check()


def test_an_open_ledger_raises() -> None:
    ledger = EnergyLedger(zeros(ENERGY_IN) | {"hydrogen_chemical": 100.0}, zeros(ENERGY_OUT))
    with pytest.raises(PhysicsConflict, match="energy ledger"):
        ledger.check()


def test_ledger_categories_are_exact() -> None:
    with pytest.raises(ValueError, match="missing"):
        EnergyLedger({}, zeros(ENERGY_OUT))
    with pytest.raises(ValueError, match="unknown"):
        EnergyLedger(zeros(ENERGY_IN) | {"water_chemical": 1.0}, zeros(ENERGY_OUT))


def test_efficiency_carries_its_denominator() -> None:
    eff = Efficiency.ratio("eta_engine", 20.0, 80.0, "net indicated work / H2 at cylinder x LHV")
    assert (eff.value, eff.numerator, eff.denominator, eff.flag) == (0.25, 20.0, 80.0, None)


def test_negative_efficiency_is_reported_with_the_flag() -> None:
    eff = Efficiency.ratio("eta_engine", -3.0, 80.0, "d")
    assert eff.value == pytest.approx(-0.0375)
    assert eff.flag == NEGATIVE_FLAG


def test_zero_denominator_is_null_not_zero_and_not_an_exception() -> None:
    eff = Efficiency.ratio("eta_engine", 0.0, 0.0, "d")
    assert eff.value is None
    assert eff.flag == UNDEFINED_FLAG


def test_mass_ledger_rows() -> None:
    ledger = MassLedger({"water": (1.0e-3, 1.0e-3), "hydrogen": (2.0e-9, 1.0e-9)})
    assert ledger.residual_rel("water") == 0.0
    assert ledger.residual_rel("hydrogen") == pytest.approx(0.5)
    with pytest.raises(PhysicsConflict, match="hydrogen"):
        ledger.check()
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd services/model && uv run --frozen pytest tests/test_foundation_ledger.py -q`
Expected: FAIL with `ModuleNotFoundError: No module named 'hydrocycle.ledger'`.

- [ ] **Step 3: Implement**

```python
# services/model/src/hydrocycle/ledger.py
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
        if abs(residual) > tol:
            raise PhysicsConflict("energy ledger", "the ledger must close", residual)


@dataclass(frozen=True, slots=True)
class MassLedger:
    rows: Mapping[str, tuple[float, float]]  # name -> (in, out), kg per cycle

    def residual_rel(self, name: str) -> float:
        into, out = self.rows[name]
        scale = max(abs(into), abs(out))
        return (into - out) / scale if scale > 0.0 else into - out

    def check(self, tol: float = 1e-12) -> None:
        for name in self.rows:
            residual = self.residual_rel(name)
            if abs(residual) > tol:
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
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `cd services/model && uv run --frozen pytest tests/test_foundation_ledger.py -q`
Expected: 7 passed.

- [ ] **Step 5: Gate and commit**

Run: `bun run check:model`. Expected: green.

```bash
git add services/model/src/hydrocycle/ledger.py services/model/tests/test_foundation_ledger.py
git commit -m "feat(model): energy and mass ledgers and denominator-carrying efficiencies

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 7: Freeze the foundation (stdlib guard and surface file)

**Files:**
- Create: `services/model/tests/test_foundation_frozen.py`
- Create: `services/model/tests/data/foundation_surface.txt` (generated by the test's own helper, then committed)

**Interfaces:**
- Consumes: all six foundation modules.
- Produces: the freeze rule for later plans. Changing a foundation module's public surface requires regenerating `foundation_surface.txt` in the same commit, which makes the model spec's "do not edit" rule visible in review.

- [ ] **Step 1: Write the test**

```python
# services/model/tests/test_foundation_frozen.py
from __future__ import annotations

import ast
import dataclasses
import importlib
import inspect
import sys
from pathlib import Path

FOUNDATION = ("provenance", "thermo", "geometry", "params", "state", "ledger")
SOURCE = Path(__file__).resolve().parents[1] / "src" / "hydrocycle"
SURFACE_FILE = Path(__file__).resolve().parent / "data" / "foundation_surface.txt"


def test_foundation_imports_only_stdlib_and_foundation() -> None:
    for name in FOUNDATION:
        tree = ast.parse((SOURCE / f"{name}.py").read_text())
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    top = alias.name.split(".")[0]
                    assert top in sys.stdlib_module_names, f"{name} imports {alias.name}"
            elif isinstance(node, ast.ImportFrom):
                if node.level == 0:
                    top = (node.module or "").split(".")[0]
                    assert top in sys.stdlib_module_names or top == "__future__", (
                        f"{name} imports {node.module}"
                    )
                else:
                    targets = [node.module] if node.module else [a.name for a in node.names]
                    for target in targets:
                        assert target in FOUNDATION, f"{name} imports .{target}"


def render_surface() -> str:
    lines: list[str] = []
    for name in FOUNDATION:
        module = importlib.import_module(f"hydrocycle.{name}")
        for attr in sorted(vars(module)):
            if attr.startswith("_"):
                continue
            obj = getattr(module, attr)
            if getattr(obj, "__module__", None) != module.__name__ and not isinstance(
                obj, (str, float, int, tuple, dict)
            ):
                continue
            if inspect.isclass(obj):
                if dataclasses.is_dataclass(obj):
                    fields = ", ".join(f"{f.name}: {f.type}" for f in dataclasses.fields(obj))
                    lines.append(f"{name}.{attr}({fields})")
                else:
                    lines.append(f"{name}.{attr} class")
                for member in sorted(vars(obj)):
                    if member.startswith("_"):
                        continue
                    value = inspect.getattr_static(obj, member)
                    if isinstance(value, (staticmethod, classmethod)):
                        value = value.__func__
                    if inspect.isfunction(value):
                        lines.append(f"{name}.{attr}.{member}{inspect.signature(value)}")
                    elif isinstance(value, property):
                        lines.append(f"{name}.{attr}.{member} property")
            elif inspect.isfunction(obj):
                lines.append(f"{name}.{attr}{inspect.signature(obj)}")
            else:
                lines.append(f"{name}.{attr} = {type(obj).__name__}")
    return "\n".join(lines) + "\n"


def test_foundation_surface_is_frozen() -> None:
    expected = SURFACE_FILE.read_text()
    actual = render_surface()
    assert actual == expected, (
        "The P1 foundation's public surface changed. The model spec forbids editing the "
        "foundation; if the change is deliberate, regenerate tests/data/foundation_surface.txt "
        "with `uv run --frozen python -c \"import tests.test_foundation_frozen as t; "
        "open('tests/data/foundation_surface.txt','w').write(t.render_surface())\"` "
        "from services/model and commit it with the change."
    )
```

- [ ] **Step 2: Generate the surface file and read it**

Run from `services/model`:

```bash
mkdir -p tests/data
uv run --frozen python -c "import tests.test_foundation_frozen as t; open('tests/data/foundation_surface.txt','w').write(t.render_surface())"
cat tests/data/foundation_surface.txt
```

Expected: one line per public name across the six modules, with no private `_` names and no imported stdlib names. If `tests` isn't importable as a package, add `tests/__init__.py` only if no existing test relies on its absence; otherwise run the helper with `PYTHONPATH=.`.

- [ ] **Step 3: Prove the tests can fail**

Temporarily add `import numpy` to `thermo.py` and run `uv run --frozen pytest tests/test_foundation_frozen.py -q`. Expect FAIL on the stdlib test. Then temporarily rename `ledger.UNDEFINED_FLAG` and expect FAIL on the surface test. Revert both, then confirm `git diff --stat src` is empty.

- [ ] **Step 4: Run it and confirm it passes**

Run: `cd services/model && uv run --frozen pytest tests/test_foundation_frozen.py -q`
Expected: 2 passed.

- [ ] **Step 5: Full gate and commit**

Run: `bun run check >| /private/tmp/hydrocycle-gate.log 2>&1; echo EXIT:$?`. Expected: `EXIT:0`, and the log ends with `HydroCycle full gate passed.`. Also confirm `bun run contracts:check` reports no drift.

```bash
git add services/model/tests/test_foundation_frozen.py services/model/tests/data/foundation_surface.txt
git commit -m "test(model): freeze the P1 foundation surface and keep it stdlib-only

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push origin main
```

## Verification (end of plan)

- `bun run check` log ends `HydroCycle full gate passed.`, EXIT 0, run after the last commit.
- `cd services/model && uv run --frozen pytest -m cantera tests/test_foundation_thermo.py -q` passes, so the oracle actually ran rather than being skipped.
- `git diff <plan-start>..HEAD --stat -- services/model/src/hydrocycle/physics.py services/model/src/hydrocycle/schemas.py services/model/src/hydrocycle/api.py packages/contracts` is empty, so no behaviour changed.
- `grep -nE '^(import|from) (numpy|scipy|pydantic|cantera)' services/model/src/hydrocycle/{provenance,thermo,geometry,params,state,ledger}.py` prints nothing.
- The final whole-branch review checks the Review Focus items against their tests.

## After this plan

The next plans follow the spec's order, one per stage group: `flow`; then `hydrogen` + `bubble`; `acoustic` + `droplet`; `phase`; `engine` + `combustion` + `heat_transfer`; `exhaust` + `condensation`. After those, `pipeline` + `uncertainty` + `run` + `experiment`, which replaces the body of `run_simulation`. Each migrates the matching `physics.py` code into these foundations.

Before the `uncertainty` plan: `hydrocycle/uncertainty.py` already exists (numpy/scipy Latin hypercube). That plan must rename or absorb it, not collide with it.
