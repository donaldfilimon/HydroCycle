# HydroCycle Expo mobile client — design

Date: 2026-08-27
Status: implemented; simulator-only distribution boundary retained

## Problem

HydroCycle's only client is `apps/web` (React 19 + Vite 7). The goal
"improve massively and turn into Expo React Native app" asks for a React
Native surface. The literal reading is a replacement; this design chooses an
additive `apps/mobile` instead, for reasons recorded below.

## The constraint that shapes everything

`AGENTS.md` hard invariant 7: bind network services to `127.0.0.1`, add no
telemetry or cloud sync. This is not incidental — it is the project's
local-only posture.

A mobile client can reach a loopback-bound service from exactly two places:

| Target | Reaches host loopback? | How |
| --- | --- | --- |
| iOS Simulator | yes | shares the host network namespace; `127.0.0.1` resolves to the host |
| Android emulator | yes | `10.0.2.2` is the emulator's alias for host loopback |
| Physical device (Wi-Fi) | **no** | would require binding beyond loopback |
| App Store / TestFlight build | **no** | same, plus store-side distribution |

Therefore **V1 mobile targets simulator and emulator only.** The service
keeps binding `127.0.0.1`. Physical-device support is deliberately deferred
rather than solved by quietly widening the bind address — that would trade a
documented invariant for a demo, which this project's own guidance forbids.

Expo's CLI also emits telemetry by default and its development server defaults
to advertising a LAN origin. `EXPO_NO_TELEMETRY=1` and `expo start --localhost`
are set in the app's scripts. Expo SDK 53 does not apply that host choice to
the underlying Metro socket, so `metro.config.js` additionally installs a
listener guard that supplies `127.0.0.1` whenever Node receives a TCP listen
call without a host. The root gate probes that guard, and simulator acceptance
also audits the live OS socket table. EAS Build / `expo-updates` are not used,
because they imply a cloud round-trip that invariant 7 rules out.

## Why additive, not a replacement

Replacing `apps/web` with an Expo + react-native-web universal app would mean
rewriting the Vite build, the Playwright fidelity suite, and the reviewed
captures in `docs/fidelity/` — with no functional gain today, since the web
app already works. The additive path leaves every existing gate intact and
lets the mobile client prove itself first. Unification stays available later;
it is a one-way door taken early otherwise.

## Architecture

Types keep flowing one direction, unchanged:

```
services/model (Pydantic)  ->  openapi.json  ->  @hydrocycle/contracts  ->  apps/web
                                                                       \->  apps/mobile
```

`apps/mobile` never re-derives physics. It calls the same endpoints through
the same generated client, so the model service stays the single source of
scientific truth.

**Workspace topology.** Root `workspaces` narrows from `apps/*` to `apps/web`
so `apps/mobile` is *not* hoisted into the root install. Metro resolves
modules differently from Bun's workspace hoister, and the `mlai` monorepo on
this machine already hit this: its root declares only `packages/*`, and each
app keeps its own lockfile. `apps/mobile` follows that precedent and consumes
contracts and the shared view model through explicit source aliases.

**API base URL.** `createHydroCycleClient(baseUrl)` already accepts an origin
(the web app passes the empty default and relies on Vite's `/api` proxy).
Mobile has no proxy, so it passes an explicit origin selected by platform.

**Fixture-first rendering.** Same contract as the web app: render the local
fixture immediately, then overlay live API values. The app is therefore
useful and honest with the service down, and never shows a fabricated number
as if it were measured.

## Invariant compliance

| Invariant | How this design holds it |
| --- | --- |
| 1. Failed gate -> motored baseline only | Server-side and at the mobile render boundary; a failed gate with an inconsistent non-null reactive trace is still rendered as motored-only |
| 2. Measured H2 replaces derived | Server-side; mobile displays, does not compute |
| 3. Nulls stay null | Mobile renders `null` as an explicit em-dash, never `0` |
| 4. Single-zone 0D, no CFD visuals | No flame-front, vector-field, or contour rendering. Scalars, traces, gate status only |
| 5. Hardware read-only | Read + simulate endpoints only; no actuator/command calls |
| 6. Reproducibility metadata | Rendered from the persisted result, not regenerated client-side |
| 7. `127.0.0.1`, no telemetry | Simulator/emulator only; API and Expo development server stay on loopback; `EXPO_NO_TELEMETRY=1`; no EAS, no expo-updates |

## Testing

`check:mobile` verifies the app-local frozen lockfile and Expo dependency
compatibility, probes actual hostless-listener behavior, runs typecheck, lint,
and unit/component tests, then exports a real iOS Hermes bundle. It joins
`scripts/check.sh`, so the mobile app is covered by the same root
`bun run check` gate as everything else. The slice is not done when the app
boots; it is done when the root gate is green.

## Implemented mobile flow

- Summary runs the canonical generated-contract fixture, then presents the
  feasibility conclusion, hydrogen-loading basis, and reproducibility
  metadata. Its offline state remains an explicitly synthetic preview.
- Workbench maps a focused small-screen input subset through the shared
  `simulationRequest` function and displays homogeneous scalar 0D pressure and
  temperature traces. A failed gate never displays a proposed trace.
- Test Runs lists persisted local records, distinguishes measured,
  unmeasured, and synthetic entries, and can add an empty draft without
  inventing measurements. Editing, validation, deletion, and native file
  import remain on the web client until complete small-screen review flows
  exist.

## Deferred and out of scope

- Physical-device and store distribution are blocked on invariant 7 and need
  an explicit future decision. They are not part of this implementation.
- Test Run editing, deletion, and native file import are deferred; partial
  write flows would weaken validation and destructive-action protections.
- Heat-term, P-V, and uncertainty-band chart parity are optional future mobile
  depth. The implemented pressure and temperature traces remain single-zone
  scalar views, never spatial or CFD output.
