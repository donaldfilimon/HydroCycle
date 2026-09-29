# HydroCycle P1: model, twin contract, web and phone (design)

Status: **proposed, awaiting Donald's review.** Date: 2026-09-29.
Binding references: `docs/p1/model-spec.md` (the P1 model specification) and
`docs/p1/twin-spec.md` (the P1 digital twin specification), both recorded verbatim.
Where this document and those two differ, this document governs, because it reconciles them
with the repository as it exists.

Everything P1 produces stays **CONCEPT, UNVALIDATED**. A negative result is a valid result.

## 1. Context

Donald asked for a major HydroCycle app across three surfaces (React 19 + Next.js web, an
Expo phone app, and a 3D digital twin) built to the P1 model and twin specifications. The
specifications assume a stdlib-only package `hcmodel`, a `blender/` tree, and a set of
foundation files (`provenance.py`, `thermo.py`, `params.py`, `ledger.py`, `state.py`,
`geometry.py`, `blender/twin_contract.py`). Measured on 2026-09-29, none of those exist on this
machine. What does exist:

| Surface | Today |
|---|---|
| Model | `services/model/src/hydrocycle/physics.py` (1,702 lines): staged loading, retention, gate, motored and Cantera-backed reactive traces, numpy Latin-hypercube uncertainty. FastAPI in `api.py`. Depends on `cantera==3.2.0`, numpy, scipy. |
| Twin | `hydrocycle/twin.py` builds a `TwinManifest` into `packages/contracts/fixtures/twin-reference.json`; `crates/hydrocycle-twin` (Rust wgpu, winit native plus wasm WebGPU) draws it. |
| Web | `apps/web`, Next 16 App Router + React 19: Summary, Workbench, Test Runs, Twin. `HydroCycleProviders` (reducer + TanStack Query), `local` and `hosted` data sources, everything through `/gateway`. |
| Phone | `apps/mobile`, Expo SDK 53, React Native 0.79: Summary, Workbench, Test Runs; own lockfile; network policy in `docs/superpowers/specs/2026-08-27-expo-mobile-client-design.md`. |

## 2. Decisions (Donald, 2026-09-29)

1. **Evolve `hydrocycle` into P1**, in place. The P1 spec's `hcmodel` means
   `services/model/src/hydrocycle`.
2. **Migration by in-place refactor** of `physics.py`, stage by stage, every intermediate
   commit green on `bun run check`.
3. **Cantera is a test-time oracle only.** The same applies to numpy and scipy. Runtime model
   code is standard library, float64.
4. **Both renderers, one contract.** Blender 5.2.2 (the P1 twin spec) is the authoring,
   verification and stills renderer; the Rust wgpu/WebGPU twin draws the same contract live on
   web and native.
5. **`AGENTS.md` invariant 4 is amended, tightly scoped** (text in section 7).
6. **`ideal_complete` is kept, fenced** against invariant 1 (section 3.4).
7. Web keeps bounded synchronous runs (no job queue). Phone shows Blender stills plus plots,
   not live 3D.

## 3. Sub-project 1: the model

### 3.1 Module layout

`services/model/src/hydrocycle/` gains the P1 module set named in the model spec:
`provenance`, `thermo`, `params`, `state`, `ledger`, `geometry` (the foundation);
`flow`, `hydrogen`, `bubble`, `acoustic`, `droplet`, `phase`, `engine`, `combustion`,
`heat_transfer`, `exhaust`, `condensation` (the stages); `pipeline`, `uncertainty`, `run`,
`experiment` (the entry points). `physics.py` shrinks as each stage moves out and is deleted
when it is empty. `api.py`, `schemas.py`, `imports.py`, `exports.py`, `orm.py` and the
persistence layer stay where they are.

### 3.2 Foundation first, then frozen

The P1 spec forbids editing the foundation files, but they do not exist. They are authored
first, in one sub-task, with their own tests. A test then fingerprints each foundation module's
public surface (names and signatures). From that commit on, changing a foundation file
requires changing the fingerprint in the same commit, which makes the "do not edit" rule
visible rather than silent. New parameters follow model spec rule 8 (`DEFAULTS` in the stage
module, promoted into `params.P0` by a later, deliberate commit).

### 3.3 Stage migration order

One stage group per commit, in chain order: `flow`; `hydrogen` + `bubble`; `acoustic` +
`droplet`; `phase`; `engine` + `combustion` + `heat_transfer`; `exhaust`; `condensation`;
then `pipeline.simulate` replaces the body of `run_simulation`. Each commit:

- implements the P1 equations for that stage, with `mass_residual()` and `h2_residual()`
  zero to 1e-12 relative and `PhysicsConflict` on violation (never a clamp);
- keeps `run_simulation`'s public outputs within a stated tolerance of the previous commit,
  or records the deliberate change and its reason in the commit message and in
  `docs/model-validation.md`;
- preserves the existing invariants: measured total hydrogen **replaces** the derived
  dissolved + bubble loading (invariant 2); missing measurements stay `null` (invariant 3);
- passes `bun run check`, regenerating contracts with `bun run contracts` whenever a schema,
  including a field description, changes.

### 3.4 Scenarios and invariant 1

`gated` is the default scenario and keeps invariant 1 exactly: a closed flammability gate
returns the motored baseline and sensitivities, never a proposed reactive cycle.
`ideal_complete` runs only when a request names it explicitly, is never a default, is never
persisted or exported as a proposed cycle, and every value it produces carries the tag
`IDEAL, NOT PHYSICAL`.

### 3.5 Result shape

`pipeline.simulate(ps, mode)` returns the dict in model spec section 6. `SimulationResult`
gains those fields **additively**: stable `outputs` names (added, never renamed),
`output_tags`, the three ledgers, efficiencies carrying numerator, denominator, definition and
flag, `warnings` and `conflicts`. Existing fields stay until web and phone have moved, then are
removed in their own commit.

### 3.6 Oracles and determinism

Cantera, numpy and scipy move to the `dev` dependency group. Cantera-marked tests
(`pytest -m cantera`) cross-check `thermo` enthalpies and phase closures against Cantera.
`uncertainty.monte_carlo` uses a seeded stdlib generator; a test compares its p5/p50/p95
against the retired numpy Latin-hypercube on the reference inputs. No wall-clock time and no
unseeded randomness in model functions (model spec rule 10).

### 3.7 Reproducibility (invariant 6)

Every persisted result records schema, solver, Python version, `thermo=hydrocycle-stdlib
<version>`, `mechanism=none`, and the random seed. No field is dropped because Cantera left the
runtime.

## 4. Sub-project 2: the twin data contract

One contract, two halves, emitted by the model and read by every renderer.

**Static half, `hydrocycle/twin_contract.py`:** `COMPONENTS` (ID, name, `pos` and `size` in
metres, the P0 tag in a note), `STREAMS`, `hc_part` IDs for components, engine sub-parts,
streams and proxies, the ten views, and the honesty strings as data:
`CONCEPT, UNVALIDATED`; `TEST FIXTURE, NOT A MODEL RUN`; `VISUALIZATION NOT TO SCALE`;
`CONCEPT ENVELOPE, UNRATED`; `IDEAL, NOT PHYSICAL`; `legacy display fixture (infinite rod)`.
No renderer hard-codes those strings.

**Per-run half, `TwinRun`, emitted by `pipeline`:** `schema_version`,
`parameter_fingerprint`, `status_code`, `is_fixture`, `scenario`, and crank-resolved arrays
at the engine step (theta, V, p, T, phase masses, `x_burned`, and precomputed piston, rod and
crank transforms), plus ledgers and gates. Values are float64 in JSON. A renderer may cast to
float32 for geometry; any number it shows as text comes from the float64 value.

**Kinematics:** clients draw the precomputed transforms, so no client derives physics. Blender's
Geometry Nodes may reproduce the slider-crank, as the twin spec requires, but only as a
reproduction that `verify_twin.py` checks against the contract to 0.01 mm at 24 crank angles.

**Codegen:** `bun run contracts` emits TypeScript types into `packages/contracts` and a JSON
Schema; a drift test pins the Rust `serde` structs in `crates/hydrocycle-twin` to that schema.
Blender's `data_bake.py` reads the JSON directly. `twin.py`'s existing `TwinManifest` evolves
into this contract rather than being duplicated.

**Honesty is data plus tests.** Every renderer carries the same three checks: zero
reaction-zone geometry when `x_burned = 0`; no vapour proxy at USC-401; the fixture label
present when `is_fixture = 1`.

## 5. Sub-project 3: renderers

**Rust wgpu / WebGPU (`crates/hydrocycle-twin`):** draws `TwinRun` in native and browser
builds; `bun run check:twin` stays in the root gate.

**Blender (`blender/` at the repository root):** the modules in twin spec section 4, built to
its build rules and verification. Its headless verify becomes a root-gate stage that runs
`blender -b --factory-startup --disable-autoexec` and reads explicit PASS or FAIL markers
(twin spec rule 9). When Blender 5.2.2 is absent the stage prints
`SKIPPED: blender 5.2.2 not found` and the gate's verdict names the skip; it is never a silent
pass. `render_twin.py` writes the ten stills, each stamped with the `parameter_fingerprint` it
was rendered from.

The P0 differences in twin spec section 6 stay visible in `verify_twin.py`'s report. The
engine-position question (conditioning deck versus separate test article) remains an owner
decision; P1 follows the STEP position and marks HC-IF-601 as the boundary.

## 6. Sub-project 4: clients

### 6.1 Web (`apps/web`)

The spine stays: thin App Router pages over client feature components,
`HydroCycleProviders`, the `local` and `hosted` data sources behind `HydroCycleDataSource`,
all traffic through `/gateway`. New model routes are added to the gateway allowlist in
`services/gateway/src/proxy.ts`.

- **Routes.** Summary, Workbench, Test Runs and Twin move to P1 results. New: `/process`
  (the RSV-101 to CON-702 chain with per-stream phase fractions and hydrogen states, never
  merged) and `/ledgers` (energy, mass and hydrogen inventory; each efficiency with its
  numerator, denominator and flag). Workbench gains sweep, elasticity and Monte Carlo panels
  (p5, p50, p95).
- **Twin page.** The WebGPU canvas draws `TwinRun`. An accessible React inspector beside it
  carries everything the canvas shows as text: view switcher (ten views), explode and section,
  a component inspector reading float64 values, and plots sharing one crank-angle cursor with
  the canvas through app state. Without WebGPU the canvas area says so and the inspector and
  plots stay fully usable; there is no WebGL reimplementation. Reduced-motion stops playback.
- **Status is global.** A `StatusBanner` in the root layout reads `status_code`,
  `is_fixture` and `scenario`. It renders VALIDATED only if the model emits it; the hosted build
  always shows `TEST FIXTURE, NOT A MODEL RUN`.
- **Bounded runs.** Sweeps and Monte Carlo run synchronously within the gateway's 90 s budget.
  The model rejects a request whose sample count exceeds a measured bound with a typed 422
  rather than timing out.
- **Tests.** Vitest pins the honesty rendering (banner, fixture label, `VISUALIZATION NOT TO
  SCALE` whenever proxies are visible, `IDEAL, NOT PHYSICAL` on every ideal value). Playwright
  covers desktop, tablet and mobile projects. `check:web` still builds local and hosted modes.

### 6.2 Phone (`apps/mobile`)

The August Expo spec's network rules stand: live data only from the iOS Simulator
(`127.0.0.1`) or Android emulator (`10.0.2.2`); physical devices are fixture-only;
`EXPO_NO_TELEMETRY=1`; no EAS, no expo-updates; own lockfile, outside the root workspaces.

- **Role.** A read-and-inspect companion: Summary, Process, Ledgers and Runs render the same
  `packages/view-model` presentation types as the web. The phone derives no number.
- **Twin.** The ten Blender stills ship as assets beside a crank-angle scrubber over the
  `TwinRun` traces. The screen states that the views are rendered, not live. When a still's
  `parameter_fingerprint` differs from the current run's, the screen shows `STALE RENDER`
  rather than pairing a picture with the wrong numbers.
- **Status.** The same banner rules as the web; always `TEST FIXTURE, NOT A MODEL RUN` on a
  physical device.
- **Tests.** Jest pins the honesty rendering and the stale-render check; `check:mobile` still
  ends with real iOS and Android `expo export` runs.

## 7. Invariant amendments

Applied to `AGENTS.md` (and mirrored in `CLAUDE.md`) in the first plan's first task.

Invariant 4, amended text:

> The 0D model is homogeneous and single-zone. Do not render flame fronts, velocity fields,
> particle trajectories, or CFD contours. Two exceptions, both drawn only from model output:
> a uniform whole-chamber tint scaled by the baked `x_burned` at the current crank angle (no
> front, no shape, no motion), and static proxies for bubbles, droplets, vapour and hydrogen
> that never move along a path, whose count never feeds a number, and which always appear
> with `VISUALIZATION NOT TO SCALE`.

Invariant 1 gains one sentence:

> The `ideal_complete` scenario is not a proposed cycle: it runs only when explicitly
> requested, is never persisted or exported as a proposal, and every value it produces is
> labelled `IDEAL, NOT PHYSICAL`.

## 8. Build order

1. Model: foundation, then stage migration (sub-project 1).
2. Twin contract (sub-project 2).
3. Rust/WebGPU twin and the web app, in parallel (sub-projects 3 and 4.1).
4. Blender tree (sub-project 3).
5. Phone (sub-project 4.2), last, because it consumes the Blender stills.

Each step gets its own implementation plan, and `bun run check` is green before the next
begins.

## 9. Out of scope

Hardware control of any kind (invariant 5); any rating, relief setting, supply size, ignition
timing or safe concentration (model spec rule 9, `HAZARD_TBD`); CFD or spatially resolved
fields; live 3D on the phone; physical-device live data; job queues; cloud sync or telemetry.

## 10. Open items

- The model spec cites `docs/VALIDATION_GATES.md` for `experiment.replay`, `calibrate` and
  `validate`. That file does not exist; `docs/model-validation.md` does. The `experiment`
  module's plan must either write the gates document or point at the existing one.
- Engine position (twin spec section 6): owner decision pending.
- The Monte Carlo sample bound for the 90 s budget is measured during sub-project 1, not
  guessed here.
