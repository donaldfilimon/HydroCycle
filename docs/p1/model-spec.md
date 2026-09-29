# HydroCycle P1 model specification

> Recorded verbatim from Donald's message of 2026-09-29. Reconciliation with this repository
> (the package is `hydrocycle`, not `hcmodel`; Cantera, numpy and scipy become test-only
> oracles; the `ideal_complete` scenario and invariant 1) is in
> `docs/superpowers/specs/2026-09-29-hydrocycle-p1-design.md`, which takes precedence where
> they differ.

This is the contract between modules. It fixes interfaces, equations and conservation rules.
Status of everything it produces: **CONCEPT, UNVALIDATED**. A negative result is a valid result.

## 1. Rules that bind every module

1. Standard library only, float64, SI units inside the model (K, Pa, kg, J, m, s, mol).
2. Basis for streams: **kilograms per engine cycle, per cylinder**. Cycles per second per
   cylinder = `engine_speed_rpm / 120` (four-stroke).
3. Every number entering the model is a `provenance.Q`. Every diagnostic a stage reports carries
   a tag: `{"value": x, "unit": "...", "tag": "CALC", "note": "..."}`.
4. Water states stay separate: `water_bulk`, `water_aerosol`, `water_vapor`. Hydrogen states
   stay separate: `h2_dissolved`, `h2_bubble`, `h2_free`. Never merge them.
5. Water is not a fuel. Hydrogen is the only combustible. Chemical energy is computed from
   hydrogen **mass**, never from bubble count.
6. No stage may create mass, hydrogen or energy. Each stage returns a `state.StageResult` whose
   `mass_residual()` and `h2_residual()` are zero to 1e-12 relative. On violation raise
   `provenance.PhysicsConflict(what, failed_assumption, residual)`. Do not clamp and continue.
7. Energy uses absolute enthalpies from `thermo` (formation enthalpy plus sensible). Do not add
   heating values or latent heats by hand inside a balance: they are differences of `thermo`
   functions. `thermo.LHV_H2` and `thermo.h_fg` are for reporting.
8. Do not edit the foundation files (`provenance.py`, `thermo.py`, `params.py`, `ledger.py`,
   `state.py`, `geometry.py`). If a module needs a parameter that `params.P0` lacks, declare it
   in the module as `DEFAULTS = {"name": Q(...)}` and read it with
   `pv.get("name", DEFAULTS["name"].value)`. The integrator promotes it into P0 later.
9. No invented safety values. Pressure ratings, relief settings, hydrogen supply sizing, ignition
   timing, hazardous concentrations, vessel dimensions and device setpoints are
   `provenance.HAZARD_TBD`. Simulated values are not hardware setpoints.
10. Determinism: no wall-clock time or unseeded randomness inside model functions.

## 2. Stage signature

```python
def stage(inlet: Stream, pv: dict[str, float], opt: dict[str, str]) -> StageResult
```

`pv = ParameterSet.values()`, `opt = ParameterSet.options`. A stage that adds mass from outside
the stream (air, hydrogen supply) records it in `diagnostics["_mass_added_kg"]` and
`diagnostics["_h2_added_kg"]`; hydrogen oxidised is `diagnostics["_h2_reacted_kg"]`. Electrical or
thermal energy crossing the stage boundary goes in `energy_in_J` (per cycle); heat rejected to
ambient goes in `diagnostics["_heat_to_ambient_J"]`. Stage energy balance, checked by the
integrator:

```
H(inlet) + H(mass added) + sum(energy_in_J) = H(outlet) + sum H(side streams)
                                              + work_out_J + heat_to_ambient_J
```

## 3. Process chain and module ownership

| Order | ID | Module.function | Physics |
|---|---|---|---|
| 1 | RSV-101, FLT-102, PMP-103 | `flow.supply` | carrier liquid per cycle; pump electrical energy ends as heat in the liquid |
| 2 | NBG-104 | `hydrogen.condition` | Henry dissolution, bubble population, supply and vent ledger |
| 3 | CND-105 | `hydrogen.hold` | bubble evolution over `hold_time_s`, retention closure |
| 4 | BQA-231 | `bubble.metrology` | pass-through; reports what Gate 2 would measure |
| 5 | MTR-106 | `flow.meter` | pass-through at the metered volume |
| 6 | USC-401 | `acoustic.atomize` | droplet population, electrical energy split, hydrogen release |
| 7 | SEP-402 | `droplet.characterize` | pass-through; droplet statistics |
| 8 | HC-IF-601 | `phase.intake_mix` | induct air, adiabatic saturation, true vapour fraction |
| 9 | ENG-601 | `engine.cycle` | crank-resolved closed cycle, combustion gate, wall heat, work |
| 10 | EXH-701 | `exhaust.analyze` | exhaust state and enthalpy split |
| 11 | CON-702 | `condensation.recover` | cooling to `condenser_T_K`, water recovery |
| - | DAT-801 | `run`, `pipeline` | run records, ledgers, gates |

## 4. Equations

### 4.1 Bubbles (`bubble.py`)

- Population `N(d, t)`: `state.Bins` with `basis="per_m3_liquid"`, K = 32 log-spaced bins over
  plus and minus 3.5 geometric standard deviations. Bin counts from the lognormal CDF difference
  across each cell (`Bins.edges()`), so the counts sum to the supplied total exactly after
  renormalising the truncated tails.
- Young-Laplace: `p_b = p_liquid + 4 sigma / d`.
- Hydrogen per bubble: `m = (pi d^3 / 6) p_b M_H2 / (Z R T)`, `Z = 1 + B2 p_b / (R T)` with
  the second virial coefficient of hydrogen `B2 = 14.8e-6 m3/mol` near 298 K [LIT, about 1.5 %
  at 25 bar]. Report the ideal-gas value too.
- Gas volume fraction: `sum n_i pi d_i^3 / 6`.
- Epstein-Plesset dissolution for each bin, surface tension included. With `R = d/2`,
  `p_b = p_l + 2 sigma / R`, gas mass `m = (4/3) pi R^3 M p_b / (R_u T)`:
  `dm/dt = 4 pi R^2 (dR/dt) (M / (R_u T)) (p_l + 4 sigma / (3 R))` and the diffusive loss is
  `dm/dt = -4 pi R^2 D (c_s - c_inf) (1/R + 1/sqrt(pi D t))`, so
  `dR/dt = -D (c_s - c_inf) (1/R + 1/sqrt(pi D t)) (R_u T / M) / (p_l + 4 sigma / (3 R))`
  with `c_s = kH(T) * p_b * M_H2` (kg/m3) and `c_inf` the bulk dissolved concentration.
  Hydrogen leaving a bubble enters the dissolved pool of the same liquid; update `c_inf`.
  Integrate with adaptive steps; a bin whose diameter falls below 1 nm is dissolved.
  Report the e-folding lifetime of the d50 bubble.
- Brownian coalescence time scale: `tau = 1 / (alpha K n)`, `K = 8 k_B T / (3 mu)`.
- `metrology(stream)` reports d10, d50, d90, mean, number density, gas volume fraction,
  hydrogen in bubbles, hydrogen dissolved. All [CALC]; the [MEAS] slots are empty.

### 4.2 Hydrogen inventory (`hydrogen.py`)

- Henry: `c = S * kH(T) * p_H2`, `kH(T) = kH_298 * exp(B (298.15 - T) / (298.15 T))`,
  `S = h2_supersaturation`, `p_H2 = h2_saturation_bar`.
- `condition`: captured = dissolved + bubble. Supplied = captured / `nbg_transfer_efficiency`.
  Uncaptured hydrogen leaves in side stream `"nbg_vent"` as `h2_free`.
- `hold`, option `retention_closure`:
  - `supplied`: option `retention_scope = "all_hydrogen"` removes `(1 - retention_factor)` of
    dissolved and bubble hydrogen to side stream `"hold_vent"`; bubble counts scale by the
    factor. `retention_scope = "bubbles"` scales bubble counts only and moves their hydrogen
    into the dissolved pool.
  - `epstein_plesset`: run the bubble model for `hold_time_s`. Report the implied retention and
    the difference from the supplied factor as a diagnostic named
    `retention_supplied_vs_theory`. Do not reconcile them.
- `H2Inventory` dataclass with fields supplied, dissolved, bubble, free, transferred, reacted,
  vented, exhausted (kg per cycle) and `residual()`.

### 4.3 Ultrasonic stage (`acoustic.py`, `droplet.py`)

- Electrical energy per cycle: `E_el = usc_specific_energy_J_per_mL * V_atomised_mL`.
  Acoustic energy `E_ac = usc_transducer_efficiency * E_el` is reported, not added again.
- Lang number-median droplet diameter: `d = C (8 pi sigma / (rho f^2))^(1/3)`,
  `C = lang_constant`, f in Hz. Lognormal droplet bins, `basis="per_cycle"`, counts scaled so
  the summed droplet volume equals the atomised liquid volume exactly.
- New surface energy `E_s = sigma * sum n_i pi d_i^2` [CALC]. It is stored in the stream's
  droplets; report it, and count it inside the stream enthalpy rise budget (it is below 0.1 %
  of `E_el`).
- Energy split: `heat_to_ambient = usc_heat_loss_fraction * E_el`; the remainder raises the
  enthalpy of the outlet stream. Solve the outlet temperature from the enthalpy balance.
- Liquid not atomised, `(1 - aerosol_fraction)`, leaves in side stream `"usc_return"` as
  `water_bulk` with its share of dissolved and bubble hydrogen.
- Hydrogen in the atomised liquid: `usc_h2_release_fraction` of dissolved hydrogen and
  `(1 - usc_bubble_survival_fraction)` of bubble hydrogen become free gas.
  `free_h2_capture_fraction` of that free gas stays in the outlet; the rest leaves in side
  stream `"usc_vent"`.
- No vapour is created here. Vapour appears only where an enthalpy balance pays for it.
- Diagnostics: droplet d10/d50/d90, Sauter diameter, droplet count, expected bubbles per
  droplet, droplet hydrogen diffusion time `d50^2 / D`, atomisation power at speed,
  number of 25 W transducers implied [I].

### 4.4 Intake mixing (`phase.py`)

- The cylinder inducts a gas volume `volumetric_efficiency * V_d` at `intake_p_Pa` and the mixed
  temperature. Gas moles `n = VE p V_d / (R T_mix)`.
- Add `h2_direct_mg_per_cycle` as free hydrogen (mass added).
- If liquid remains the gas is saturated: `x_v = p_sat(T_mix) / p`. Otherwise all water is
  vapour. Dry air fills the rest of the gas moles.
- `T_mix` from the adiabatic enthalpy balance, solved by bisection on absolute enthalpy.
  Droplets and gas leave at the same temperature.
- Diagnostics: true vapour fraction of the water, aerosol fraction, temperature drop, hydrogen
  mole fraction of the gas phase, equivalence ratio, margin to `lfl_h2_mole_fraction`.

### 4.5 Engine cycle (`engine.py`, `combustion.py`, `heat_transfer.py`)

- Closed system from theta = -180 deg (BDC, intake valve closes) to +180 deg (BDC, exhaust
  valve opens). Valve events at the dead centres are a simplification [P].
- Charge at -180 deg: inducted stream plus residual gas (`residual_gas_fraction` of the previous
  cycle's end-state mass, mixed at constant internal energy). Iterate cycles until the start
  temperature changes by less than 0.01 K.
- State: total internal energy `U` of everything in the cylinder (gas species N2, O2, H2, H2O
  and liquid water), species masses, volume `V(theta)` from `geometry.Geometry`. Gas volume is
  `V - m_liquid / 997.05`.
- Step: `U_new = U - p_mid dV - dQ_wall`, Heun predictor-corrector on `p`. Default step 0.25 deg.
- Phase closure `equilibrium`: given `U`, `V` and masses, find `T` such that total internal
  energy matches, with vapour at `min(all water, p_sat(T) V_gas M_w / (R T))`. Bisection.
  Closure `finite_rate`: relax vapour mass toward the equilibrium value with time constant
  `tau = d32^2 / K`, `K = 8 rho_g D_v ln(1 + B_M) / rho_l`, exponential update per step.
- Combustion gate at `sim_spark_deg`: gas-phase hydrogen mole fraction compared with
  `lfl_h2_mole_fraction`. Scenario `gated`: burn only if above the limit. Scenario
  `ideal_complete`: burn regardless; label every result of that scenario
  `IDEAL, NOT PHYSICAL`. Burned fraction follows the Wiebe function
  `x_b = 1 - exp(-a ((theta - theta_0) / dtheta)^(m + 1))`, scaled by
  `combustion_efficiency` and limited by available oxygen. Conversion
  `H2 + 1/2 O2 -> H2O(g)` at constant `U`: the temperature rise follows from the formation
  enthalpies, nothing is added by hand.
- Woschni wall heat transfer: `h = 3.26 B^-0.2 p_kPa^0.8 T^-0.55 w^0.8` W/(m2 K),
  `w = 2.28 S_p + 3.24e-3 (V_d T_r / (p_r V_r)) (p - p_motored)`, reference state at -180 deg,
  second term only while burning. `dQ = woschni_scale * h * A(theta) * (T - wall_T_K) dt`.
  Option `heat_transfer = "adiabatic"` sets it to zero.
- Outputs: traces every step (theta, V, p, T, m_liquid, m_vapor, m_h2, x_burned, dQ_wall,
  heat-release rate, cumulative work); gross indicated work; pumping work
  `(exhaust_p_Pa - intake_p_Pa) V_d`; net indicated work; friction `fmep_bar * V_d`; shaft work;
  peak pressure and temperature with their angles; whether the gate opened.
- Exhaust stream enthalpy by the open-system balance over one periodic cycle:
  `H_exh = H_inducted - W_net_indicated - Q_wall`.

### 4.6 Exhaust and condensation (`exhaust.py`, `condensation.py`)

- Exhaust temperature and phase split at `exhaust_p_Pa` from `H_exh` with phase equilibrium.
- Dew point: `T_sat(x_v p)`.
- Condenser: cool to `condenser_T_K` at constant pressure; vapour above saturation condenses
  into side stream `"condensate"`. Heat rejected is the enthalpy difference.
- Water recovery = condensate / (carrier water + water formed by combustion).

## 5. Ledgers (`pipeline.py`)

Energy categories, per cycle, reference state 298.15 K with water as liquid:

- In: `hydrogen_chemical` = supplied H2 x LHV; `ultrasonic_electrical`; `pump_electrical`;
  `ancillary_electrical`; `thermal_preconditioning`; `inlet_sensible`.
- Out: `indicated_work_net`; `cooling_wall_heat`; `ultrasonic_ambient_heat`;
  `ancillary_heat`; `vented_hydrogen_chemical`; `exhaust_residual_chemical`;
  `exhaust_latent` = (vapour out - vapour in - water formed) x h_fg(298.15);
  `exhaust_sensible`; `return_liquid_sensible`.
- The identity `H_in - H_out = sensible_in - sensible_out + reacted x LHV - evaporated x h_fg(298.15)`
  is exact with these definitions. The ledger must close to 1e-9 relative.
- Shaft work and friction heat are a split of `indicated_work_net`, reported beside the ledger,
  never added to it.

Efficiencies, each stored with its denominator spelled out:

- `eta_engine` = net indicated work / (hydrogen entering the cylinder x LHV)
- `eta_conditioning` = (hydrogen entering the cylinder x LHV) / (supplied hydrogen x LHV + all
  electrical and thermal inputs)
- `eta_system` = shaft work / (supplied hydrogen x LHV + all electrical and thermal inputs)
- If a numerator is negative the efficiency is reported as the number with the flag
  `NEGATIVE: the modelled engine absorbs work`.

Mass ledger: water, hydrogen (as the inventory of 4.2), air, products, with residuals.

## 6. Public entry points

```python
pipeline.simulate(ps: ParameterSet, mode: str = "C") -> dict
```

Modes: `"B"` lumped (engine replaced by closed-form variable-gamma compression and expansion
with the same phase closure at four points), `"C"` transient (crank-resolved). Returns:

```python
{
  "mode": str, "parameter_fingerprint": str, "options": dict,
  "stages": {component_id: StageResult-as-dict},
  "streams": {name: Stream.as_dict()},
  "hydrogen_inventory": dict, "mass_ledger": dict, "energy_ledger": dict,
  "efficiencies": {name: {"value", "numerator", "denominator", "definition", "flag"}},
  "gate1": geometry.gate1_audit(...),
  "traces": {name: [floats]},          # mode C only
  "outputs": {scalar_name: float},     # flat, stable names; used by sensitivity and Monte Carlo
  "output_tags": {scalar_name: tag},
  "warnings": [str], "conflicts": [str],
}
```

Stable names in `outputs` (add more, never rename): `h2_supplied_ug`, `h2_at_intake_ug`,
`h2_bubble_share_pct`, `chemical_energy_at_intake_J`, `water_flash_energy_J`,
`energy_deficit_ratio`, `vapour_fraction_intake`, `x_h2_gas_ppm`, `equivalence_ratio`,
`flammable`, `peak_pressure_bar`, `peak_temperature_K`, `indicated_work_net_J`, `shaft_work_J`,
`wall_heat_J`, `exhaust_T_K`, `water_recovered_fraction`, `ultrasonic_electrical_J`,
`eta_engine`, `eta_conditioning`, `eta_system`, `mass_residual_rel`, `energy_residual_rel`,
`h2_residual_rel`, `shaft_power_W`, `ultrasonic_power_W`, `chemical_power_W`.

```python
uncertainty.sweep(ps, name, values, mode="B") -> dict
uncertainty.elasticities(ps, names=None, mode="B", rel_step=0.01) -> dict
uncertainty.monte_carlo(ps, n, seed, names=None, mode="B") -> dict   # p5, p50, p95, mean per output
run.record(ps, result, kind, assumptions, solver) -> path           # never overwrites
experiment.replay / calibrate / validate                             # see docs/VALIDATION_GATES.md
```
