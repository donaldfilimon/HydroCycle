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
   serves stale types to the app; Bun's `link:` means a *globally* linked
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
      coercing to `0`, so invariant 3 governs what is *sent*, not only shown.
- [x] `simulationRequest` moved into `packages/view-model`, so both clients
      submit byte-identical requests and cannot drift on the evidence-basis
      rules (when a user-entered total is `measured` vs `user_assumption`).
- [x] Test Runs screen — read-only list, synthetic runs excluded from the
      measured count.

### Verified against a live service, not just the gate
- Workbench: the shared mapper's request returns HTTP 200 with the edited
  speed (2400 rpm) and compression ratio (14) echoed in `input`, gate failing
  with no proposed cycle — invariant 1 correct.
- Test Runs: `GET /api/v1/test-runs` returns HTTP 200.

**Known gap:** that database had zero persisted runs, so the empty state is
what was actually observed. Populated run cards have never been rendered
against real data — only their types are checked. Worth a look before anyone
calls Test Runs proven.

### Two defects this gap actually hid (found 2026-08-27 by a parity audit)
Both shipped in `49f70e6`, both passed all 28 mobile tests and the bundle
export, and neither was type-detectable. They are the concrete cost of
verifying only the gate-failing path and an empty runs table:

1. **Red "Pass" bullet under a green PASSED badge.** `physics.py:702` sets
   `failures = [FailureCode.PASS]` when the gate *passes*. Web filters that
   sentinel (`App.tsx:164-167`, `failure !== "pass"`); mobile rendered it
   through the failure style. Invisible on the failing path.
2. **`valid` and `invalid` looked identical.** `statusTone` in
   `TestRunsScreen.tsx` tested for `"reviewed"`, which is not in the enum —
   `TestRunStatus` is `draft|needs_review|valid|invalid` — so both real
   terminal states fell through to muted grey. Web renders them green/red.

Lesson worth keeping: a green gate plus a successful bundle proved the app
*runs*, not that it renders *correctly*, and the one path never exercised is
where both defects lived.

## Slice 3b — converge Summary and Workbench requests (open decision)
Mobile Summary posts the raw `defaultSimulationInput` fixture; Workbench posts
`simulationRequest(inputs)`. They differ in seed, rpm, compression ratio, and
retention rate, so the two screens can show different results for what a user
reasonably reads as "the default case". Converging them means deciding whether
Summary is a fixture preview (keep as-is) or a live default-parameters view
(switch to the shared mapper). Needs Donald's call, not a silent change.

## Slice 4 — Test Runs write path (not started)
Create/patch/delete/import stay on web deliberately: V1 is data-conservative
and destructive edits should not be one mis-tap away. Import additionally
needs `File`/`FormData`/`URL` polyfills under React Native.

## Out of scope / unresolved
- Physical device + app-store distribution. Requires relaxing hard invariant 7
  (`127.0.0.1` binding). Needs an explicit decision from Donald; do not assume.
- Charts. The web client renders cycle traces; mobile shows scalars and gate
  status only. Invariant 4 still forbids any CFD-style visual.
