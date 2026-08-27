# Goals

## Improve massively and turn into Expo React Native app
status: todo
- Captured verbatim from `/goal improve massively and turn into expo react native app`. Recorded as intent only — no implementation started, no architecture decision made.
- Current architecture per `AGENTS.md`/`CLAUDE.md`: `apps/web` is React 19 + Vite 7 + strict TypeScript on Bun, talking to `services/model` (Python 3.14 + FastAPI + Cantera 3.2, uv-managed) bound to `127.0.0.1` only, no telemetry/cloud sync. There is no Expo/React Native surface today.
- Open questions before implementation:
  - **127.0.0.1 binding vs. mobile client.** The model service's hard invariant is loopback-only binding with no cloud sync. Vite's dev proxy makes same-machine web access work; an Expo app (especially on a physical device or app-store build) cannot reach a loopback-bound service the same way. Does this goal imply relaxing that invariant, running the model service differently for mobile, or keeping mobile as a same-machine/simulator-only client?
  - **Additive vs. replacement scope.** Is this a new `apps/mobile` alongside the existing `apps/web`, or a full replacement of the Vite web app with Expo/React Native? Neither `AGENTS.md` nor `README` currently documents a mobile target either way.
  - **"Local-only, no telemetry" under app-store distribution.** The project's local-only, privacy-first posture doesn't obviously survive being shipped through the App Store/Play Store distribution model (code signing, store review, potential store-side analytics). Needs an explicit decision.
  - **"Improve massively" has no concrete acceptance criteria.** No specific features, metrics, or scope were named. Needs to be broken into concrete, checkable slices (in `tasks/todo.md`) before any work starts, per the goal-ledger contract's "green ≠ done" rule.
  - Does a React Native rewrite conflict with any of the seven hard invariants (single-zone 0D with no CFD rendering, hardware read-only V1, reproducibility metadata, nulls stay null, etc.)? Preliminary read: no direct conflict, but the loopback-binding and no-telemetry invariants are the ones most in tension with a mobile/store distribution model and need explicit resolution first.
