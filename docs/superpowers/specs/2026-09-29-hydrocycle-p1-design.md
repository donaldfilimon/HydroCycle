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
4. **Two renderers, one contract, no Blender** (revised 2026-09-29 15:1x, superseding the
   first draft's Blender renderer). The Rust wgpu/WebGPU twin draws the contract live on web
   and native; the browser `/cad` workspace (`93e9cba`) is the concept-geometry renderer
   (cutaways, exploded views, OBJ/JSON export). There is no `blender/` tree.
5. **`AGENTS.md` invariant 4 is amended, tightly scoped** (text in section 7).
6. **`ideal_complete` is kept, fenced** against invariant 1 (section 3.4).
7. Web keeps bounded synchronous runs (no job queue). Phone shows the process schematic and
   crank-angle plots, not 3D.

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

**Kinematics:** the Rust twin draws the precomputed transforms, so it derives no physics.
`/cad` keeps its client-side slider-crank as a *reproduction* only: it never supplies a
displayed thermodynamic number, and a test cross-checks it against the contract's geometry at
24 crank angles (0.01 mm, 1e-4 relative), the same rule the first draft applied to Blender's
Geometry Nodes.

**Codegen:** `bun run contracts` emits TypeScript types into `packages/contracts` and a JSON
Schema; a drift test pins the Rust `serde` structs in `crates/hydrocycle-twin` to that schema.
`twin.py`'s existing `TwinManifest` evolves into this contract rather than being duplicated.

**Honesty is data plus tests.** Every renderer carries the same three checks: zero
reaction-zone geometry when `x_burned = 0`; no vapour proxy at USC-401; the fixture label
present when `is_fixture = 1`.

## 5. Sub-project 3: renderers

**Rust wgpu / WebGPU (`crates/hydrocycle-twin`):** draws `TwinRun` in native and browser
builds; `bun run check:twin` stays in the root gate.

**Browser `/cad` (`apps/web/public/hydrocycle-cad.html`, route `apps/web/app/cad`):** a
sandboxed, dependency-free concept-geometry workspace (WebGL with a Canvas 3D fallback). Its
existing checks stay: 14 in `scripts/test-cad-model.cjs` against the shipped document and 6 in
`apps/web/src/test/cad-document.test.ts`. When the twin contract lands, `/cad` reads component
IDs, positions, sizes and the honesty strings from the generated contract JSON instead of
constants embedded in the HTML; until then it stays labelled "independent concept geometry,
not a thermodynamic solver", as it is today. Its `null` hydrogen mass, vapour fraction and
shaft power stay `null`. The twin spec's honesty rules (§3) and verification (§5) apply to it
as to every renderer.

The P0 differences in twin spec section 6 stay visible, reported by the `/cad` and contract
tests (both deck heights; the retained legacy −10° volume discrepancy, 60.431 cc against
59.354). The engine-position question (conditioning deck versus separate test article)
remains an owner decision; P1 follows the STEP position and marks HC-IF-601 as the boundary.

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
- **Twin.** No 3D on the phone. The twin screen shows the process schematic plus crank-angle
  plots over the `TwinRun` traces with a scrubber, every value read from the run.
- **Status.** The same banner rules as the web; always `TEST FIXTURE, NOT A MODEL RUN` on a
  physical device.
- **Tests.** Jest pins the honesty rendering; `check:mobile` still
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
3. Rust/WebGPU twin, `/cad` alignment to the contract, and the web app, in parallel
   (sub-projects 3 and 4.1).
4. Phone (sub-project 4.2), last, because it renders the same view-model types the web
   settles.

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
