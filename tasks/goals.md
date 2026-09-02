# Goals

## Publish HydroCycle hosted fixture preview

status: done

- Published the public Sites preview at
  <https://hydrocycle-simulator.underswitch.chatgpt.site/> and verified Summary,
  Workbench, Test Runs, the deterministic fixture interaction, desktop/mobile
  layout, HTTP 200 availability, and zero browser warnings or errors.
- The hosted surface remains explicitly fixture-only: Python/Cantera execution,
  SQLite persistence, file import, and every hardware-control path remain local
  or unavailable. Full evidence is in
  `docs/deployment/2026-08-27-sites-production.md`.

## Improve massively and turn into Expo React Native app

status: done

- Captured verbatim from `/goal improve massively and turn into expo react native app`.

### Scope resolved 2026-08-27 (`/goal continue`)

Donald restated the goal and then issued `/goal continue` after being shown the
additive/simulator-only design, so the open questions below are resolved as
follows. Recorded here because these decisions bind future slices:

- **Additive, not a replacement.** New `apps/mobile` (Expo) alongside
  `apps/web`. The Vite web app and its `docs/fidelity` capture suite are
  untouched. A react-native-web unification is explicitly _not_ in scope.
- **Simulator/emulator only; invariant 7 is NOT relaxed.** `services/model`
  keeps binding `127.0.0.1`. iOS Simulator shares host loopback directly;
  the Android emulator reaches host loopback via `10.0.2.2`. Both terminate
  on the same machine, so loopback-only holds. Physical-device and app-store
  distribution are **out of scope** and remain unresolved — shipping to a
  real device would require relaxing invariant 7 and is a separate decision.
- **No telemetry.** Expo tooling phones home by default, so `EXPO_NO_TELEMETRY=1`
  is set in the app's own scripts, and EAS / `expo-updates` are not used.
- **"Improve massively" is scoped to the mobile client** plus the structural
  cleanups it forces. Broader improvement work needs its own goal.

### Outcome — slice 1 shipped 2026-08-27 (`a571b6e`)

`apps/mobile` exists and runs against the local service. Root `bun run check`
is green end to end: 78 model tests, 6 contract, 27 web, 19 mobile, plus an
iOS Hermes bundle (605 modules). The Summary screen's exact request was also
exercised against a live service — the default fixture fails the gate with
`insufficient_h2` / `preheat_deficit` and returns no proposed cycle, which is
invariant 1 behaving correctly rather than a bug.

**Goal stays `in_progress`.** Slice 1 is one screen, not the whole app:
Workbench and Test Runs do not exist on mobile yet, and physical-device support
remains blocked on hard invariant 7 and unresolved. Nothing here is a "turn the
app into React Native" completion claim.

### Outcome — slice 2 implemented 2026-08-27

The portable domain types and deterministic presentation fixtures now live in
`packages/view-model`. Web consumes the package through Bun workspaces; the
lockfile-isolated Expo app resolves the same source through synchronized
TypeScript, Metro, and Jest aliases. Mobile Summary is now fixture-first and
labels that immediate fallback as synthetic before live API results replace it.
The goal remains `in_progress`: Workbench and Test Runs parity is Slice 3, and
physical-device support remains outside the approved loopback-only scope.

### Outcome — slice 3 shipped 2026-08-27 (`49f70e6`)

`apps/mobile` now has all three screens the web client has — Summary,
Workbench, Test Runs — over a shared tab bar keyed on the shared `Screen`
type. `simulationRequest` also moved into `packages/view-model`, so the
evidence-basis rules (when a user-entered total counts as `measured` versus
`user_assumption`, and when it stays null) exist in one place instead of two.

**Correction (2026-08-27, found by a parity audit):** an earlier draft of this
entry claimed "both clients submit byte-identical requests". That was
overclaimed and is now retracted. It holds for **Workbench only**, which posts
`simulationRequest(inputs)`. Mobile **Summary** posts the raw
`defaultSimulationInput` contracts fixture instead, which differs in seed,
rpm, compression ratio, and retention rate — so the two _mobile_ screens
disagree with each other, not merely with web. Converging them is a real
design decision (Summary is a fixture-first overview, Workbench is
parameterized), so it is left open rather than silently changed.

Root `bun run check` green: 78 model, 6 contract, 5 view-model, 23 web, 28
mobile, plus an iOS Hermes bundle. Both new screens were exercised against a
live service: the Workbench request round-trips its edited speed (2400 rpm)
and compression ratio (14) into the model's `input` echo, and the gate fails
with no proposed cycle exactly as invariant 1 requires.

**Still `in_progress`, deliberately:**

- Test Runs was only observed against an **empty** live database. Populated run
  cards now have component coverage, but have not been exercised against real
  persisted measurements.
- Mobile can create additive empty drafts. Editing, validation, deletion, and
  native file import stay on web until their complete review and confirmation
  flows exist.
- Mobile renders pressure and temperature as homogeneous scalar 0D traces;
  heat terms, P–V, and uncertainty bands remain open.
- Physical-device and app-store distribution remain **blocked on hard
  invariant 7** and unresolved.

The app runs in a simulator against a loopback service. That is not the same
claim as "HydroCycle is now an Expo app", and this entry does not make it.

### Outcome — chart and safe-write follow-up 2026-08-27

Workbench now renders accessible pressure and temperature traces for the
motored baseline and, only when present, the proposed cycle. The charts are
explicitly scalar single-zone 0D views, not spatial or CFD output. Test Runs can
create an empty persisted draft but cannot edit or delete data on mobile. Root
`bun run check` passed with 78 model, 6 contract, 5 view-model, 23 web, and 39
mobile tests, plus the iOS Hermes export. Draft creation has component/API
contract coverage but has not yet been exercised against a live database.

### Outcome — simulator acceptance and goal closure 2026-08-28

The additive companion is now exercised end to end in an iPhone 17 Pro Max
simulator against the real loopback FastAPI/Cantera service. Summary rendered
the canonical failed-gate fixture as motored-only; Workbench round-tripped a
14:1 compression ratio and 2400 rpm and preserved the edit and result across
tab changes; Test Runs created and rendered an empty persisted draft from an
isolated acceptance database without replacing any null measurement with zero.
Native captures and the acceptance ledger are in `docs/fidelity/mobile`.

The live socket audit found that Expo SDK 53 advertised localhost while Metro
still listened on an IPv6 wildcard. The Metro configuration now guards the
actual Node listener, the app-local gate probes that behavior, and the repeated
OS audit showed only `127.0.0.1` listeners on ports 5173, 8000, and 8081.

Final root `bun run check` passed with 78 model, 6 contract, 5 view-model, 23
web, and 48 mobile tests, plus the web production build and real iOS Hermes
export. Physical-device and store support, Test Run editing/deletion/import,
and additional chart parity remain explicitly deferred or out of scope; none
requires weakening this completed simulator-first companion.

## Complete simulator companion workflow and scientific parity

status: done

- Continue the completed Expo foundation into one coherent research workflow:
  shared scientific semantics, reviewed Test Run inspection and safe authoring,
  linked persisted simulations, decision-relevant native charts, Android
  emulator proof, local-service reliability, and native accessibility evidence.
- Preserve the simulator-only, loopback-only boundary. Physical-device and
  store distribution remain out of scope unless opened as a separate transport
  and security architecture goal.
- Phase 0 completed locally on 2026-08-28: simulation and Test Run contract
  adapters now live in `packages/view-model`; web and mobile consume the shared
  failed-gate and measurement-presence semantics. `bun run check` and all 17
  Playwright cases passed.
- Phase 1 completed locally on 2026-08-28: mobile now owns one explicitly
  sourced simulation session, maps and inspects persisted Test Runs through the
  shared adapter, applies only eligible reviewed evidence, links persisted
  evaluations, and keeps failed gates motored-only. The root gate passed with
  15 view-model, 22 web, and 51 mobile tests.
- Phase 2 completed locally on 2026-08-28: persisted non-synthetic Test Runs now
  have null-safe scalar editing, explicit validation, dirty-state protection,
  bounded native JSON/CSV import, temporary canonical export, duplicate
  readback, and confirmed deletion. The audit also restored the rule that
  display-derived retention is never persisted as measured evidence. The root
  gate passed with 78 model, 6 contract, 16 view-model, 22 web, and 68 mobile
  tests.
- Phase 3 completed locally on 2026-08-28: web and mobile now consume shared
  fail-closed chart transforms and numeric summaries. Native views cover P-V,
  real uncertainty bands, signed heat terms, sensitivities, and measured/model
  retention with residuals while preserving the homogeneous single-zone 0D
  boundary. The root gate passed with 26 view-model, 23 web, and 70 mobile
  tests.
- Phase 4 completed locally on 2026-08-28: web and mobile suppress stale
  responses, freeze evaluation inputs, preserve server-authoritative Test Run
  ledgers with atomic `expected_updated_at` preconditions, and report attachment
  cleanup failures honestly. Loopback-only Android and iOS smoke harnesses pass,
  accessibility evidence and its limits are retained, and the checksummed
  dual-platform Hermes export records tool/source-state provenance without
  claiming installability or byte-identical rebuilds. Final acceptance passed
  79 model, 6 contract, 34 view-model, 23 web, and 79 mobile tests, the web
  production build, all 17 Playwright cases, both native smokes, checksum
  verification, and `git diff --check`.
