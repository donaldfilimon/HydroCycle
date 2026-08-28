# HydroCycle Sites production evidence — 2026-08-27

## Outcome

HydroCycle's fixture-only web preview is publicly available at
<https://hydrocycle-simulator.underswitch.chatgpt.site/>.

The hosted surface is an exploration and communication artifact. It exposes
the Summary, Workbench, and Test Runs user interfaces with deterministic,
synthetic fixtures. It does not run the local Python/Cantera model service,
persist evidence to the local SQLite store, import files, or control hardware.
The UI labels those boundaries directly.

## Source and hosting state

- Sites reported the project active and public with the production URL above.
- Sites version 5 was saved from pushed commit `528c917` and its production
  deployment completed successfully at the canonical URL above.
- Version 5 replaces version 4 after an independent production check found a
  missing favicon and a provider-specific `GitHub Pages` status label. The new
  source adds explicit icon assets and uses provider-neutral hosted-preview
  wording.
- Direct requests to the production root, `/favicon.svg`, and `/favicon.ico`
  returned HTTP 200.

## Live browser acceptance

The production URL was exercised directly in the in-app browser on Summary,
Workbench, and Test Runs.

- Page title: `HydroCycle`.
- Summary rendered the failed feasibility gate, suppressed reactive trace,
  single-zone schematic, water-as-thermal-load language, and evidence counts.
- Workbench retained the motored baseline while showing the proposed reactive
  trace as null; local-only equations and source-ledger links were replaced by
  explicit local-application notices.
- Test Runs identified every seeded record as demo/synthetic, kept Save and
  import persistence unavailable, and exposed no hardware command affordance.
- `Load demo fixture` completed in the browser and reported that no model
  service computation was performed.
- A fresh browser load after the version 5 deployment reported zero console
  warnings and zero errors, linked `/favicon.svg`, and displayed `Hosted
  preview: static fixtures only`.
- At 1536x1024, the three screens retained the hierarchy of the approved images
  in `docs/design` with the additional hosted-fixture disclosure.
- At 390x844, Summary, Workbench, and Test Runs each had a document scroll
  width equal to the 390-pixel client width; no page-level horizontal overflow
  was present. The stacked layouts matched the checked implementation captures
  in `docs/fidelity/implementation`.

No blocking runtime or visual defect remains in the checked production surface.
This was a targeted production acceptance pass, not a claim that every browser,
operating system, or assistive technology combination was retested against the
hosted origin.

## Repository and CI evidence

The final published source and gated repository revision was `528c917`.

Local verification:

- `bun run setup` passed with the frozen root lockfile and frozen uv lock.
- `bun run check` passed.
- Model service: 78 tests passed.
- Generated OpenAPI, TypeScript route types, and schema fixtures were
  deterministic and current.
- Contracts: 6 tests passed, plus formatting and strict type checking.
- Shared view model: 5 tests passed, plus formatting and strict type checking.
- Web: 23 tests passed, plus formatting, ESLint, strict type checking, and the
  Vite production build.
- Mobile: 22 Jest tests passed, plus type checking, ESLint, and the mobile
  bundle check.

Hosted CI verification:

- GitHub Actions run
  [33130124525](https://github.com/donaldfilimon/HydroCycle/actions/runs/33130124525)
  passed at exact published revision `528c917`, including the full gate and all
  17 Playwright scenarios across desktop, tablet, and mobile projects.
- The Playwright artifact was uploaded by that run.
- An earlier CI failure was a frozen root-lockfile mismatch, not an
  application-test failure. Commit `94d3404` refreshed the lock after the
  workspace split; the final exact-revision run above passed from a clean Linux
  checkout.

## Acceptance boundary

This closes publication and hosted-fixture acceptance only. It does not close
the separate Expo/mobile goal in `tasks/goals.md`, and it does not change the
project's local-only model-service, no-telemetry, single-zone, or hardware
read-only invariants.
