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
- Captured verbatim from `/goal improve massively and turn into expo react native app`. Recorded as intent only — no implementation started, no architecture decision made.

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
Workbench and Test Runs do not exist on mobile yet (slice 3), the web view
model is still not shared (slice 2), and physical-device support remains
blocked on hard invariant 7 and unresolved. Nothing here is a "turn the app
into React Native" completion claim.
- Current architecture per `AGENTS.md`/`CLAUDE.md`: `apps/web` is React 19 + Vite 7 + strict TypeScript on Bun, talking to `services/model` (Python 3.14 + FastAPI + Cantera 3.2, uv-managed) bound to `127.0.0.1` only, no telemetry/cloud sync. There is no Expo/React Native surface today.
- Open questions before implementation:
  - **127.0.0.1 binding vs. mobile client.** The model service's hard invariant is loopback-only binding with no cloud sync. Vite's dev proxy makes same-machine web access work; an Expo app (especially on a physical device or app-store build) cannot reach a loopback-bound service the same way. Does this goal imply relaxing that invariant, running the model service differently for mobile, or keeping mobile as a same-machine/simulator-only client?
  - **Additive vs. replacement scope.** Is this a new `apps/mobile` alongside the existing `apps/web`, or a full replacement of the Vite web app with Expo/React Native? Neither `AGENTS.md` nor `README` currently documents a mobile target either way.
  - **"Local-only, no telemetry" under app-store distribution.** The project's local-only, privacy-first posture doesn't obviously survive being shipped through the App Store/Play Store distribution model (code signing, store review, potential store-side analytics). Needs an explicit decision.
  - **"Improve massively" has no concrete acceptance criteria.** No specific features, metrics, or scope were named. Needs to be broken into concrete, checkable slices (in `tasks/todo.md`) before any work starts, per the goal-ledger contract's "green ≠ done" rule.
  - Does a React Native rewrite conflict with any of the seven hard invariants (single-zone 0D with no CFD rendering, hardware read-only V1, reproducibility metadata, nulls stay null, etc.)? Preliminary read: no direct conflict, but the loopback-binding and no-telemetry invariants are the ones most in tension with a mobile/store distribution model and need explicit resolution first.
