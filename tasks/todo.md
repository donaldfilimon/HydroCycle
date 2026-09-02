# Todo

Granular slices for `## Improve massively and turn into Expo React Native app`
in `goals.md`. Each slice is done only when root `bun run check` is green.

## Slice 1 — `apps/mobile` scaffold reaching the local model service — DONE (a571b6e)

- [x] Root `workspaces` narrowed `apps/*` -> `apps/web` so `apps/mobile` stays
      lockfile-isolated (mirrors the `mlai` precedent, where Metro and the
      workspace hoister fight each other).
- [x] `apps/mobile` Expo SDK 53 + RN 0.79 + React 19 app, own `bun.lock`.
- [x] Platform-aware API base URL: `127.0.0.1:8000` (iOS sim) /
      `10.0.2.2:8000` (Android emulator). Both are host loopback.
- [x] `EXPO_NO_TELEMETRY=1` in the app's own scripts; no EAS, no expo-updates.
- [x] Summary screen rendering gate status, loading mode, and reproducibility
      metadata, with an explicit "no proposed reactive cycle" state.
- [x] `check:mobile` wired into `scripts/check.sh`, including a real Hermes
      bundle export.

### Two resolution traps found by bundling, not by typechecking

Both type-checked clean and would have shipped a non-running app:

1. Bun **copies** `file:` dependencies, so a regenerated contract silently
   serves stale types to the app; Bun's `link:` means a _globally_ linked
   package, not a relative symlink. `@hydrocycle/contracts` is therefore
   resolved as a **source alias** in three places that must stay in sync:
   `apps/mobile/tsconfig.json` paths, `metro.config.js` `extraNodeModules`,
   and the `jest.moduleNameMapper` in `apps/mobile/package.json`.
2. A deep `@hydrocycle/contracts/fixtures/*.json` import type-checks but
   Metro cannot resolve JSON through an `exports` wildcard. The generated
   fixtures are now re-exported as typed modules from
   `packages/contracts/src/fixtures.ts`.

This is why `check-mobile.sh` exports a bundle: the green gate was lying.

## Slice 2 — extract the shared view model — DONE

- [x] Moved the DOM-free domain types and deterministic presentation fixtures
      into `packages/view-model` with their own strict typecheck and tests.
- [x] Migrated all web consumers to the `@hydrocycle/view-model` workspace
      package and moved fixture invariant tests with their owner.
- [x] Added matching TypeScript, Metro, and Jest source aliases for the
      lockfile-isolated mobile app.
- [x] Made Summary render the explicitly synthetic failed-gate fixture before
      live API data arrives, so the Hermes export exercises the runtime alias.
- [x] Added mutation-isolation coverage so fixture results cannot contaminate
      later simulations through shared crank-angle or evidence arrays.

## Slice 3 — screen parity — DONE (49f70e6)

- [x] Tab navigation over the shared `Screen` type. Plain state, no
      expo-router: the web app has no router either, and there is no URL to
      mirror on device.
- [x] Workbench screen — 8 of the 25 inputs, remainder on shared defaults.
      An unparseable field leaves the committed value untouched rather than
      coercing to `0`, so invariant 3 governs what is _sent_, not only shown.
- [x] `simulationRequest` moved into `packages/view-model`, so both clients
      share the Workbench evidence-basis rules (when a user-entered total is
      `measured` vs `user_assumption`). Summary deliberately retains the raw
      canonical contract fixture documented in Slice 3b.
- [x] Test Runs screen — read-only list, synthetic runs excluded from the
      measured count.

### Verified against a live service, not just the gate

- Workbench: the shared mapper's request returns HTTP 200 with the edited
  speed (2400 rpm) and compression ratio (14) echoed in `input`, gate failing
  with no proposed cycle — invariant 1 correct.
- Test Runs: `GET /api/v1/test-runs` returns HTTP 200.

**Resolved 2026-08-28:** simulator acceptance created an empty persisted draft
in an isolated live database, rendered the populated native card, and read it
back through the API with null operator/sample fields and no simulations.

### Two defects this gap actually hid (found 2026-08-27 by a parity audit)

Both shipped in `49f70e6`, both passed all 28 mobile tests and the bundle
export, and neither was type-detectable. They are the concrete cost of
verifying only the gate-failing path and an empty runs table:

1. **Red "Pass" bullet under a green PASSED badge.** `physics.py:702` sets
   `failures = [FailureCode.PASS]` when the gate _passes_. Web filters that
   sentinel (`App.tsx:164-167`, `failure !== "pass"`); mobile rendered it
   through the failure style. Invisible on the failing path.
2. **`valid` and `invalid` looked identical.** `statusTone` in
   `TestRunsScreen.tsx` tested for `"reviewed"`, which is not in the enum —
   `TestRunStatus` is `draft|needs_review|valid|invalid` — so both real
   terminal states fell through to muted grey. Web renders them green/red.

Lesson worth keeping: a green gate plus a successful bundle proved the app
_runs_, not that it renders _correctly_, and the one path never exercised is
where both defects lived.

## Slice 3b — distinguish Summary and Workbench requests — DONE

Mobile Summary posts the raw `defaultSimulationInput` fixture; Workbench posts
`simulationRequest(inputs)`. They differ in seed, rpm, compression ratio, and
retention rate, so the two screens can show different results for what a user
reasonably reads as "the default case". Summary now identifies itself as the
canonical contract fixture; Workbench remains the parameterized view-model
request. Keeping both preserves the approved fixture-first overview without
pretending its inputs are the Workbench defaults.

## Slice 4a — additive Test Run draft creation — DONE

- [x] Mobile can create an empty non-synthetic draft through the typed API.
- [x] The returned persisted document is prepended without inventing any
      measurement values; all measurements remain null until an operator enters
      and explicitly validates evidence on web or mobile.
- [x] Component coverage exercises the real populated-card path and valid /
      invalid status distinction.

## Slice 4b — Test Run editing, deletion, and native file import — DONE

- [x] Small-screen scalar editor preserves untouched evidence and refetches the
      server ledger before a reviewed write.
- [x] Dirty-state protection and server-authoritative readback cover saves.
- [x] Native JSON/CSV import is size-bounded and cache-stat verified; export,
      duplicate, and delete use explicit operation states and confirmation.
- [x] Delete reports locally owned attachment cleanup failures without implying
      that imported source files were removed.

## Slice 5 — native simulator acceptance and loopback enforcement — DONE

- [x] Summary, Workbench, and populated Test Runs rendered in iOS Simulator
      against the real FastAPI/Cantera service and an isolated database.
- [x] Failed Summary and Workbench gates withheld proposed cycles and displayed
      only motored homogeneous 0D traces.
- [x] Workbench edits and results survive tab changes after a screen has been
      visited; component coverage locks that behavior.
- [x] Expo/Metro's actual TCP listener is forced to `127.0.0.1`, not merely
      advertised as localhost. The app-local check probes the guard and the
      live socket table was audited after restart.
- [x] Native 1320x2868 captures and the acceptance ledger are stored under
      `docs/fidelity/mobile`.

## Out of scope / unresolved

- Physical device + app-store distribution. Requires relaxing hard invariant 7
  (`127.0.0.1` binding). Needs an explicit decision from Donald; do not assume.
- Installable `.app`/APK simulator releases. The current artifact is a
  checksummed dual-platform Hermes export used as build evidence, not a binary.

## Simulator companion parity continuation

### Phase 0 — one owner for scientific and persistence semantics

- [x] Move API-result, cycle, Test Run, evidence-count, and payload adapters
      from `apps/web/src/App.tsx` into DOM-free `packages/view-model` modules.
- [x] Make web and mobile consume the shared gate and Test Run semantics.
- [x] Add cross-client golden tests for failed-gate suppression, null
      preservation, evidence counting, provenance, and payload round trips.

### Phase 1 — coherent reviewed-run research loop

- [x] Add read-only Test Run detail/provenance and explicit run selection.
- [x] Evaluate Workbench from a selected reviewed run, persist/link the result,
      and show the same session result in Summary without semantic drift.

### Phase 2 — safe native evidence authoring

- [x] Add scalar draft editing, validation errors, and dirty-state protection.
- [x] Add import/export/duplicate/delete only with bounded reads, native
      confirmation, server-authoritative validation, and persistence readback.

### Phase 3 — decision-relevant native visualization

- [x] Share transformed chart series and accessible summaries, not rendering.
- [x] Add P-V, uncertainty, heat-term, sensitivity, and retention comparison
      views without implying CFD or inventing absent data.

### Phase 4 — reliability, accessibility, and simulator build proof

- [x] Add stale-response suppression, cancellation, explicit synthetic/stale
      states, and an isolated native acceptance harness.
- [x] Retain large-text captures, manual TalkBack observations, and explicit
      VoiceOver evidence limits; prove Android bundle/render/service-status and
      iOS bundle-request/nonempty-screenshot smoke paths without conflating them.
- [x] Define and verify a checksummed dual-platform Hermes export artifact with
      tool/source-state provenance while explicitly excluding installability and
      byte-identical reproducibility. Physical devices, EAS, telemetry, cloud
      sync, and store distribution stay excluded.
