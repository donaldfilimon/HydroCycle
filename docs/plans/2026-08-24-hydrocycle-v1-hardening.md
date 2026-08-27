# HydroCycle v1 continuation hardening plan

## Context

HydroCycle v1 was accepted and committed on `main` at
`0ef9db03fee4d3115a4b8bca189182186d6fdcb3`. This continuation implements the
four non-blocking improvements identified by the independent final verifier.
The original evidence-gated scientific and hardware-safety contract remains
the binding product specification.

## Completion status — 2026-08-27

All four tasks are implemented and committed on the canonical local `main`.
Task 1 landed in `b0bbe25`; Tasks 2–4 landed in `39a84c2` and add
deterministic multi-metric comparisons, scope-correct Summary evidence counts,
and Starlette's supported `httpx2`
test-client path. This complete local tree passes `bun run check` (78 model/API,
6 contract, and 26 frontend tests plus formatting, lint, type checking,
generated-contract drift, and production build) and `bun run test:e2e` (17
desktop, tablet, and mobile tests). The API contract did not change, so the
generated OpenAPI and TypeScript artifacts remain current without regeneration.

The implementation remains local-only: no remote, push, merge, deployment,
publication, or hardware-control surface was added. The final independent
whole-tree review is tracked separately from these implementation gates.

## Global Constraints

- Keep the application local-only. Add no remote, deployment, analytics,
  account, cloud-sync, or external-transmission feature.
- Preserve the core flow: `measurements -> loading/retention -> feasibility
  gate -> bounded 0D cycle -> comparison/export`.
- Preserve the fail-closed rule: any failed feasibility gate returns the
  motored baseline and sensitivities with `proposed_cycle: null`.
- Water contributes no chemical energy. Bubble size/count remain diagnostic
  evidence and never establish authoritative total hydrogen.
- Missing measurements remain `null`; never manufacture a measured value.
- Preserve deterministic results, seeded uncertainty, reproducibility
  metadata, versioned `/api/v1` routes, bounded imports, and generated-contract
  drift checks.
- Preserve the read-only future DAQ boundary. Add no `ControlSink`, actuator,
  ignition, injector, throttle, or hardware-command interface.
- Preserve accessible keyboard operation, focus visibility, reduced motion,
  non-color status, responsive layouts, and the uniform cylinder label
  `Single-zone state — schematic, not CFD.`
- Use test-driven changes with focused tests plus the repository gate. Test
  output must be pristine; do not suppress warnings to make it appear clean.
- Keep the finished work on this repository's canonical local `main`. The
  repository has no remote; do not add one, push, publish, or deploy it as part
  of this continuation.

## Task 1: Complete unsaved-change protection

**Status:** Complete.

Extend the existing dirty Test Run guard to every action that can discard the
current editor state:

- Product-brand/home navigation.
- Primary `Summary`, `Workbench`, and `Test Runs` navigation.
- `New run`.
- `Import run`.
- Selecting another run (preserve the existing behavior).
- Browser unload (preserve the existing behavior).

Actions that do not discard editor state, such as evaluating or exporting the
current run, must not prompt. Use one shared guard path so wording and behavior
cannot drift. A clean editor proceeds without a prompt. For dirty state,
Cancel preserves the current view, selected run, and edited values; Confirm
performs the requested action exactly once.

Add component coverage for each action family and browser coverage for at least
one top-level navigation action plus Import or New Run. Retain keyboard and
accessible-dialog behavior.

Run focused frontend tests, then `bun run check:web` and the relevant Playwright
project. Commit the task.

## Task 2: Persist all compatible comparison metrics

**Status:** Complete.

Replace the single prioritized generated comparison with a deterministic
collection containing every compatible measured/model metric for a linked
simulation:

- `total_h2`: prefer authoritative `total_h2_mg_l`; otherwise use
  `headspace_gc_mg_l`, compared with modeled total loading.
- `retained_h2`: compare `retained_h2_mg_l` with modeled retained H2 at intake.
- `retention_fraction`: compare the measured fraction with the modeled fraction.
- `peak_pressure`: compare the measured pressure-series peak with the proposed
  reactive trace, or with the motored trace when reaction is suppressed.

Use deterministic IDs of the form `simulation:{result_id}:{metric}`. Re-linking
the same simulation is idempotent. Replace legacy generated records for that
result, preserve operator/imported comparisons and their order, and append
generated metrics in the order listed above. If no compatible measurement
exists, persist exactly one `modeled_total_h2` record with `measured_value:
null`; do not invent evidence. Retain units, result ID, model version, seed, and
the pressure trace's schematic/not-hardware-predictive note.

Verify GET and canonical JSON export parity, scalar-only runs, series runs,
mixed-metric runs, legacy replacement, and repeated linking. Regenerate
contracts only if the public schema changes. Run focused API tests and
`bun run check:model`, then commit the task.

## Task 3: Distinguish selected measurements from the global source ledger

**Status:** Complete.

Make Summary evidence counts describe their actual scopes instead of presenting
the global scientific source ledger as if it were selected Test Run evidence.

The Summary evidence area must visibly distinguish:

- `Selected Test Run measurements`: count each populated scalar measurement and
  each present canonical series as one dataset, not one row. When no eligible
  persisted Test Run is selected, show zero and say so explicitly.
- `Global literature ledger`: count literature records from the model result.
- `Current model assumptions`: count user-assumption records from the model
  result.

Synthetic/demo runs remain visibly labeled and must not be described as Donald's
measurements. Selecting and validating a reviewed run, then returning to
Summary, must update the selected-measurement count without changing scientific
model results. Preserve responsive and screen-reader behavior.

Add unit coverage for zero, scalar-plus-series counting, and selected-run
transitions, plus a browser assertion on the reviewed-run flow. Run focused
frontend tests, `bun run check:web`, and relevant Playwright coverage, then
commit the task.

## Task 4: Remove the test-client deprecation warning safely

**Status:** Complete.

Eliminate the Starlette warning that says its `httpx`-backed `TestClient` path
is deprecated. Use a supported client/dependency path or refactor the API test
fixture as needed. Do not filter, ignore, capture, or otherwise suppress the
warning. Preserve synchronous test readability unless the supported replacement
requires async tests, and do not alter production API behavior.

The focused API tests and `bun run check:model` must complete with no warning
summary or deprecation output. Update `pyproject.toml` and `uv.lock` when the
supported dependency boundary changes. Commit the task.

## Final Acceptance

- `bun run check` passes with pristine output.
- `bun run test:e2e` passes all desktop, tablet, and mobile projects.
- Generated OpenAPI/TypeScript contracts have no drift.
- Scientific reference, gate suppression, deterministic uncertainty, import,
  export, comparison, and no-hardware-command invariants remain green.
- The complete canonical tree receives a broad whole-tree review against this
  plan and the original v1 contract.
- Local `main` contains Task 1 at `b0bbe25` and the Tasks 2–4 closeout at
  `39a84c2`; no remote, push, deployment, or publication occurs.
