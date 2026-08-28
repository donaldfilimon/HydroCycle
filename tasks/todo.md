# Todo

Granular slices for `## Improve massively and turn into Expo React Native app`
in `goals.md`. Each slice is done only when root `bun run check` is green.

## Slice 1 — `apps/mobile` scaffold reaching the local model service
- [ ] Root `workspaces` narrowed `apps/*` -> `apps/web` so `apps/mobile` stays
      lockfile-isolated (mirrors the `mlai` precedent, where Metro and the
      workspace hoister fight each other).
- [ ] `apps/mobile` Expo SDK 53 + RN 0.79 + React 19 app, own `bun.lock`,
      `@hydrocycle/contracts` consumed via `file:../../packages/contracts`.
- [ ] Platform-aware API base URL: `127.0.0.1:8000` (iOS sim) /
      `10.0.2.2:8000` (Android emulator). Both are host loopback.
- [ ] `EXPO_NO_TELEMETRY=1` in the app's own scripts; no EAS, no expo-updates.
- [ ] Summary screen rendering gate status + key scalars, fixture-first with a
      live-API overlay (same contract as `apps/web`).
- [ ] `check:mobile` (typecheck + lint + test) wired into `scripts/check.sh`.

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
