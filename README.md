# HydroCycle

HydroCycle is a local, evidence-gated engineering sandbox for evaluating
hydrogen carried in micro/nanobubble water and used in an
internal-combustion-engine cycle. It presents the same model through three
views:

- **Summary** gives the direct feasibility conclusion and energy gap, while
  separating selected reviewed measurements from the global literature and
  model-assumption ledgers.
- **Workbench** exposes loading, retention, uncertainty, the mass-and-energy
  gate, and the bounded 0D cycle.
- **Test Runs** manages local measurements, calibration/provenance, model
  comparisons, and reproducible exports.

The governing flow is:

```text
measurements -> hydrogen loading/retention -> feasibility gate
             -> bounded 0D cycle -> comparison/export
```

Hydrogen is always the fuel. Water is modeled as a carrier, charge diluent,
phase-change load, and possible thermal working fluid; it contributes no
chemical energy. When the feasibility gate fails, HydroCycle returns the
motored baseline and sensitivities and deliberately sets the proposed
reactive trace to `null`.

HydroCycle v1 is a falsifiable research model and measurement workspace. It
is not proof of feasibility, a hardware-predictive engine model, a safety
case, engine certification, or a control system.

## Runtime

- `apps/web`: React 19, strict TypeScript, Vite 7, Bun 1.4
- `apps/mobile`: Expo SDK 53, React Native 0.79, React 19, and an isolated Bun
  lockfile for iOS Simulator first
- `services/model`: Python 3.14, FastAPI, Pydantic 2, Cantera 3.2, NumPy,
  SciPy, SQLAlchemy 2, and Alembic, managed by `uv`
- `packages/contracts`: generated OpenAPI TypeScript client, unit metadata,
  import templates, and deterministic schema fixtures
- `packages/view-model`: shared presentation types, fixtures, and request
  mapping used by both clients
- `data`: ignored local SQLite state and bounded, application-owned imports

The backend and frontend development servers bind only to `127.0.0.1`. There
is no account system, analytics, cloud sync, remote publication, or hardware
command interface.

## Run locally

Prerequisites are Bun 1.4, Python 3.14, and `uv`.

```bash
bun install
uv sync --project services/model --frozen
bun run dev
```

The web application opens at <http://127.0.0.1:5173>; the API is available at
<http://127.0.0.1:8000>. `bun run dev` runs both processes and shuts the other
one down if either exits.

### Run the Expo companion in iOS Simulator

Keep `bun run dev` running on the host, then install and start the separately
locked mobile app in another terminal:

```bash
cd apps/mobile
bun install --frozen-lockfile
bun run ios
```

The companion provides Summary, Workbench, and Test Runs views over the same
generated contracts and local FastAPI/Cantera service. iOS Simulator shares
the host loopback interface, so the API remains bound to
`http://127.0.0.1:8000`; the Expo development server is also forced to
localhost rather than Expo's LAN default. Because Expo SDK 53's `--localhost`
option changes the advertised URL without narrowing the underlying Node
listener, the Metro configuration also guards hostless TCP listen calls and
forces them to `127.0.0.1`. The app does not use EAS, `expo-updates`, telemetry,
cloud sync, or hardware-control endpoints.

Physical-device, TestFlight, and App Store support are intentionally out of
scope. A physical device cannot reach a host service bound to loopback, and
this repository does not widen the binding merely to enable distribution.

Optional environment variables are documented in `.env.example`. Export them
in the shell before starting the service; the repository does not implicitly
load environment files.

## Verify

Run the complete repository gate:

```bash
bun run check
```

It checks Python formatting and linting, strict mypy, the model/API test suite,
OpenAPI and generated-contract drift, contract and shared-view-model tests,
web formatting and linting, strict TypeScript, component tests, and the web
production build. It also verifies the isolated mobile lockfile, runs mobile
Expo-version compatibility, TypeScript, ESLint, and Jest checks, and exports a
real iOS Hermes bundle so Metro resolution is part of the repository gate. A
listener regression probe also verifies that a hostless Expo/Metro TCP server
opens on IPv4 loopback rather than a wildcard interface.

Run the isolated browser acceptance suite separately:

```bash
bun run test:e2e
```

The browser harness creates a temporary database and attachment directory,
tests desktop, tablet, and mobile workflows, and removes that temporary state when it
exits. To refresh the six visual-acceptance captures after intentionally
changing the UI, run:

```bash
bun run --cwd apps/web visual:capture
```

The accepted concepts are in `docs/design`; implementation captures and the
review ledger are in `docs/fidelity`. Concept images specify layout,
hierarchy, and interaction only. Their illustrative numbers, measurements,
citations, dates, source names, and synthetic run data are not model inputs.

## Scientific contract

The computation is staged and inspectable:

1. **Hydrogen loading** accepts authoritative measured total H2 or derives a
   dissolved reference plus an explicitly uncertain bubble-gas estimate.
   Dissolved loading uses hydrogen partial pressure as carrier-system pressure
   multiplied by an explicit headspace H2 mole fraction. Bubble diameter,
   number density, surface tension, and a positive lognormal gas-content scale
   remain separate uncertainty-bearing inputs. Measured total H2 replaces the
   derived total; it is never added to it.
2. **Retention** uses a measured decay series when supplied, otherwise a
   visible first-order assumption. Every measured decay ordinate retains its
   own uncertainty, distribution, source, and measured/synthetic basis; those
   points participate directly in seeded propagation. Retained, released,
   handling loss, delivered, and unaccounted mass remain explicit.
3. **Feasibility gate** compares retained H2 with the oxygen/equivalence-ratio
   requirement and charges water heating, phase change, specified recovered
   heat, wall loss, and target work to the appropriate scenario.
4. **Bounded 0D cycle** uses slider-crank volume, an independent polytropic
   motored baseline, temperature- and composition-dependent Cantera sensible
   internal energy, enthalpy, and heat capacity at every reactive step, a
   Wiebe heat-release closure, and a documented single-zone wall-loss model.
5. **Uncertainty and sensitivity** use deterministic seeded Latin-hypercube
   propagation, 95% intervals, and normalized one-at-a-time sensitivities.

The user-configurable gate propagation defaults to 200 Latin-hypercube
samples, and reactive trace propagation is configurable from 32 to 256
samples. Derived loading and required-H2 scalar standard uncertainties use a
separate deterministic 32,768-sample dependency audit so the displayed scalar
uncertainty includes linked equations such as pressure times headspace fraction
instead of independently perturbing already-derived display values.

The two explicit scenarios are:

- **Upstream-vaporized carrier:** external carrier heating and vaporization
  are system costs unless measured recovered heat is supplied.
- **Hydrogen fuel with water injection:** hydrogen is supplied separately;
  water is a diluent and charge cooler, not an energy source.

Stable gate results are `pass`, `invalid_data`, `mass_balance_failed`,
`insufficient_h2`, `preheat_deficit`, and `outside_model_domain`. The ambient
hydrogen lower flammability limit is exposed only as a safety reference, not
as a performance criterion. Thermal NOx output is a relative risk indicator;
the model does not claim calibrated emissions in g/kWh.

Every saved simulation includes the schema, model, solver, Python, NumPy,
SciPy, Cantera, `gri30.yaml` mechanism hash, random seed, and sample settings.
The cylinder is always labeled **“Single-zone state — schematic, not CFD.”**

## API

The local, versioned surface is:

- `GET /api/v1/health`
- `GET /api/v1/model-metadata`
- `POST /api/v1/simulations`
- `GET /api/v1/simulations/{simulation_id}`
- `GET|POST /api/v1/test-runs`
- `GET|PATCH|DELETE /api/v1/test-runs/{test_run_id}`
- `POST /api/v1/test-runs/import`
- `GET /api/v1/test-runs/{test_run_id}/export`

Generated OpenAPI is committed at `packages/contracts/openapi.json`; the typed
browser client is generated into `packages/contracts/src/api.generated.ts`.
Use `bun run contracts` to intentionally regenerate the boundary and
`bun run contracts:check` to test for drift.
The running service intentionally does not expose `/docs`, `/redoc`, or
`/openapi.json`; every public HTTP route is under `/api/v1`. Contract generation
calls the application schema builder in-process and does not open a network
documentation endpoint.

## Imports, persistence, and exports

HydroCycle accepts canonical JSON and three canonical CSV series:

- `hydrogen_decay.csv`:
  `time_s,total_h2_mg_L,uncertainty_mg_L`
- `bubble_distribution.csv`: `diameter_nm,number_per_mL`
- `pressure_trace.csv`:
  `crank_angle_deg,pressure_bar,uncertainty_bar`

Imports are data-only and bounded by accepted filename/type, byte size, row
count, finite values, headers, axis ordering, duplicates, physical domains,
and required calibration references. Formula-like cells, executable payloads,
filesystem paths, ambiguous units, and traversal names are rejected before a
database or attachment write. The original SHA-256 and warnings are retained.
Canonical JSON simulation results are never trusted as cached authority: the
service validates the embedded input, reruns it deterministically, requires the
result ID, diagnostics, reproducibility block, and complete result to match, and
persists only the regenerated result. Exported attachment hashes and metadata
return as non-owned provenance records; the uploaded JSON file is stored as a
separate HydroCycle-owned attachment.

Runtime state is stored in the ignored `data/hydrocycle.db`; imported content
is copied into the ignored, application-owned `data/attachments` directory.
Missing measurements stay `null`, never zero. Deletion requires explicit
confirmation and removes only database references and HydroCycle-owned
attachments.

When a simulation is linked to a Test Run, the service upserts every compatible
typed measured/model comparison in a deterministic metric order: total H2,
retained H2, retention fraction, and peak pressure. Stable IDs use
`simulation:{result_id}:{metric}`. Re-linking is idempotent, legacy generated
records are replaced, and existing operator/imported comparisons retain their
order. If no compatible measurement exists, exactly one modeled-total record
is stored with a `null` measured side; no measurement is invented.

Summary counts each populated canonical scalar and each present canonical
series as one selected Test Run dataset only when that run is persisted,
non-synthetic, and reviewed (`needs_review` or `valid`). Draft, invalid,
volatile, and synthetic/demo runs contribute zero operator-measurement
datasets. Literature and user-assumption counts remain global properties of
the current model result.

Populated scalar measurements use the complete `ValueWithUncertainty` shape:
value, canonical unit, positive standard uncertainty, distribution, source ID,
and measured basis. Temperature and pressure are stored as K and Pa and are
converted to °C and kPa only for display. A run cannot enter `valid` status
without at least one calibrated, provenance-bearing scalar measurement or
canonical series. Reviewed CSV export additionally requires the applicable
validated series and repeats that validation against stored data.

Exports include canonical reproducible JSON, reviewed measurement CSVs, and a
neutral homogeneous 0D CFD-boundary document. The boundary export contains no
generated spatial field and lists its missing spatial inputs explicitly.

## Evidence basis

The model metadata endpoint returns the complete source ledger and the exact
applicability limits. Principal references are:

- [NIST hydrogen Henry-law data](https://webbook.nist.gov/cgi/cbook.cgi?Mask=877&Source=1970TAK5793&Units=SI)
  for the 298.15 K reference of `0.00078 mol/(kg*bar)`.
- [NIST water-vapor thermochemistry](https://webbook.nist.gov/cgi/cbook.cgi?Name=water&cTG=on)
  and [NIST liquid-water thermochemistry](https://webbook.nist.gov/cgi/cbook.cgi?ID=C7732185&Mask=27AE)
  for the hydrogen LHV and liquid-to-vapor water burden derivations.
- [Nanobubble characterization limitations](https://pmc.ncbi.nlm.nih.gov/articles/PMC6350620/)
  and a [headspace-GC method](https://hjgcjsxb.org.cn/en/article/Y2024/I4/1105)
  for the rule that bubble counting is supporting evidence, not total-H2 mass.
- [Ambient-pressure nanobubble-water study](https://www.sciencedirect.com/science/article/pii/S0304389424016145)
  and [electrolyzed-water retention study](https://www.sciencedirect.com/science/article/abs/pii/S0021979706000154)
  for comparison context only.
- [2026 direct-water-injection experiment](https://journals.sagepub.com/doi/abs/10.1177/14680874261440837)
  and [2023 hydrogen-engine water-injection study](https://www.sciencedirect.com/science/article/pii/S0016236122034767)
  for water-as-diluent/charge-cooling context while hydrogen remains the fuel.
- [Cantera installation compatibility](https://cantera.org/stable/install/pip.html)
  and the [illustrative internal-combustion example](https://cantera.org/stable/examples/python/reactors/ic_engine.html)
  for runtime support and structural validation context.

Temperature behavior away from the NIST Henry-law reference, unmeasured
retention, bubble-gas mass, burn duration, wall heat transfer, and water phase
behavior remain assumptions or calibration targets. Hardware-predictive use
requires measured total-H2 and pressure-trace calibration plus a separate
safety and validation program.

## Hardware boundary

V1 defines only a read-only `TelemetrySource.read_snapshot()` protocol; it
registers no live adapter. The UI labels the **Live DAQ connector** as
“Read-only interface reserved for a later validated phase.” There is no
`ControlSink`, command dispatcher, actuator, ignition, injector, or throttle
endpoint. Closed-loop control is explicitly outside this repository’s v1
authorization and validation scope.
