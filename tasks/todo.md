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

## Slice 2 — extract the shared view model (not started)
`apps/web/src/domain.ts` (246 lines) and `fixtures.ts` (455 lines) are already
verified free of DOM references, so both are portable as-is. Today `apps/mobile`
speaks raw `components["schemas"]` types instead, which is honest but thinner
than the web view model. Extracting them into a shared package would remove
that asymmetry — deferred because it touches every `apps/web` import site and
should not ride along with the scaffold slice.

## Slice 3 — screen parity (not started)
Workbench and Test Runs. Test Runs needs import/export, which depends on
`File`/`FormData`/`URL` APIs that need React Native polyfills — scope that
separately.

## Out of scope / unresolved
- Physical device + app-store distribution. Requires relaxing hard invariant 7
  (`127.0.0.1` binding). Needs an explicit decision from Donald; do not assume.
