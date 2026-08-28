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
- The latest saved Sites version was version 4, sourced from commit `75f535d`.
- The Site-facing source under `apps/site` and `apps/web` is unchanged between
  `75f535d` and the audited repository head `94d3404`; intervening changes are
  mobile-client, design-handoff, workspace-lock, and documentation work.
- Sites exposes a current production URL and latest saved version number, but
  its site metadata response does not bind the live URL to a version ID. This
  report therefore records those as separate provider facts rather than
  asserting an unavailable live-version mapping.
- A direct request to the production URL returned HTTP 200 and remained on the
  canonical HTTPS URL.

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
- Browser console inspection reported zero warnings and zero errors.
- At 1536x1024, the three screens retained the hierarchy of the approved images
  in `docs/design` with the additional hosted-fixture disclosure.
- At 390x844, Summary, Workbench, and Test Runs each had a document scroll
  width equal to the 390-pixel client width; no page-level horizontal overflow
  was present. The stacked layouts matched the checked implementation captures
  in `docs/fidelity/implementation`.

No blocking runtime or visual defect was found. This was a targeted production
acceptance pass, not a claim that every browser, operating system, or assistive
technology combination was retested against the hosted origin.

## Repository and CI evidence

The application state covered by the full gate was `94d3404`. Before this
report was committed, `main` gained only Playwright-log ignore cleanup and
merge-history reconciliation; no application source changed after the gate.

Local verification:

- `bun run setup` passed with the frozen root lockfile and frozen uv lock.
- `bun run check` passed.
- Model service: 78 tests passed.
- Generated OpenAPI, TypeScript route types, and schema fixtures were
  deterministic and current.
- Contracts: 6 tests passed, plus formatting and strict type checking.
- Web: 27 tests passed, plus formatting, ESLint, strict type checking, and the
  Vite production build.
- Mobile: 21 Jest tests passed, plus type checking, ESLint, and the mobile
  bundle check.

Hosted CI verification:

- GitHub Actions run
  [33128883520](https://github.com/donaldfilimon/HydroCycle/actions/runs/33128883520)
  passed the full gate and all 17 Playwright scenarios across desktop, tablet,
  and mobile projects.
- The Playwright artifact was uploaded by that run.
- The immediately preceding CI failure was a frozen root-lockfile mismatch,
  not an application-test failure. Commit `94d3404` refreshed the lock after
  the workspace split; the replacement run above passed from a clean Linux
  checkout.

## Acceptance boundary

This closes publication and hosted-fixture acceptance only. It does not close
the separate Expo/mobile goal in `tasks/goals.md`, and it does not change the
project's local-only model-service, no-telemetry, single-zone, or hardware
read-only invariants.
