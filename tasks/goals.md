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
status: in_progress
- Captured verbatim from `/goal improve massively and turn into expo react native app`.

### Scope resolved 2026-08-27 (`/goal continue`)
Donald restated the goal and then issued `/goal continue` after being shown the
additive/simulator-only design, so the open questions below are resolved as
follows. Recorded here because these decisions bind future slices:

- **Additive, not a replacement.** New `apps/mobile` (Expo) alongside
  `apps/web`. The Vite web app and its `docs/fidelity` capture suite are
  untouched. A react-native-web unification is explicitly *not* in scope.
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
rpm, compression ratio, and retention rate — so the two *mobile* screens
disagree with each other, not merely with web. Converging them is a real
design decision (Summary is a fixture-first overview, Workbench is
parameterized), so it is left open rather than silently changed.

Root `bun run check` green: 78 model, 6 contract, 5 view-model, 23 web, 28
mobile, plus an iOS Hermes bundle. Both new screens were exercised against a
live service: the Workbench request round-trips its edited speed (2400 rpm)
and compression ratio (14) into the model's `input` echo, and the gate fails
with no proposed cycle exactly as invariant 1 requires.

**Still `in_progress`, deliberately:**
- Test Runs was only observed against an **empty** database. Populated run
  cards have never rendered against real data.
- Test Runs is **read-only** on mobile; create/patch/delete/import stay on
  web (slice 4).
- Mobile renders **no charts** — scalars and gate status only.
- Physical-device and app-store distribution remain **blocked on hard
  invariant 7** and unresolved.

The app runs in a simulator against a loopback service. That is not the same
claim as "HydroCycle is now an Expo app", and this entry does not make it.
