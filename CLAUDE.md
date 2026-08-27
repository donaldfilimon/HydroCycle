# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`AGENTS.md` is canonical for this project. Read it in full before changing
code, model behavior, imports, persistence, or visual design. It carries the
seven hard invariants (water contributes no chemical energy, failed gates
return motored baselines only, nulls stay null, single-zone 0D with no CFD
rendering, hardware read-only, reproducibility metadata on every persisted
result, `127.0.0.1` binding). This file does not repeat them; it covers
commands, architecture, and the workflow traps.

## Commands

Setup (Bun 1.4, Python 3.14, `uv`):

```bash
bun install
uv sync --project services/model --frozen
```

| Task | Command |
| --- | --- |
| Run both dev servers | `bun run dev` (web `127.0.0.1:5173`, API `127.0.0.1:8000`; either process exiting kills the other) |
| Full gate | `bun run check` |
| Python only | `bun run check:model` (ruff format + ruff + strict mypy + pytest) |
| Web only | `bun run check:web` (prettier + eslint `--max-warnings 0` + `tsc -b` + vitest + vite build) |
| Contract drift | `bun run contracts:check` |
| Regenerate contracts | `bun run contracts` |
| Browser acceptance | `bun run test:e2e` |
| Refresh fidelity captures | `bun run --cwd apps/web visual:capture` |

Single tests:

```bash
# Model: every script uses --frozen; match it or uv will resolve differently.
cd services/model && uv run --frozen pytest tests/test_physics.py -k retention
cd services/model && uv run --frozen pytest -m cantera        # Cantera-marked tests

# Web component tests
bun run --cwd apps/web test src/test/App.test.tsx

# One Playwright project (desktop 1536x1024 / tablet 1024x768 / mobile Pixel 7)
bun run --cwd apps/web test:e2e --project=chromium-desktop
```

`visual:capture` has no web server of its own: start `bun run dev` first, or
the script's `goto` against `:5173` fails. `test:e2e` does start its own stack
through `scripts/e2e-dev.sh`, which points `HYDROCYCLE_DATABASE_URL` and
`HYDROCYCLE_ATTACHMENTS_DIR` at a temp directory and deletes it on exit.

## The contracts boundary (most common gate failure)

`packages/contracts` is generated, committed, and diff-checked. Any change to
the FastAPI request/response schemas — including a Pydantic field description —
makes `scripts/check-contracts.sh` fail with `Generated contract drift
detected`. The fix is always `bun run contracts` plus committing the five
regenerated artifacts: `openapi.json`, `src/api.generated.ts`, and the three
`fixtures/simulation-input.*.json`.

Generation runs in-process (`services/model/scripts/export_openapi.py` calls
the app's schema builder). The running service deliberately serves no `/docs`,
`/redoc`, or `/openapi.json`, so never try to scrape the schema over HTTP.

## Architecture

The Python service is the single source of scientific truth. Types flow one
direction: `services/model` schemas → generated OpenAPI → typed browser client
→ `apps/web`. The web app never re-derives physics.

**`services/model/src/hydrocycle/`** — `physics.py` (~1.7k lines) is the staged
pipeline and the file most changes touch:

1. `_compute_loading` — measured total H2 *replaces* the derived
   dissolved + bubble estimate, never adds to it.
2. `_compute_retention` — measured decay series if present, otherwise a
   visible first-order assumption.
3. `_compute_gate` — mass/energy feasibility; returns a `FailureCode`.
4. `_motored_trace` / `_reactive_trace` — slider-crank volume, polytropic
   motored baseline, Cantera-backed sensible-energy steps with a Wiebe
   closure. The reactive trace is `null` when the gate fails.
5. `_propagate_uncertainty` — deterministic seeded Latin hypercube plus
   one-at-a-time sensitivities. Derived scalars additionally use a 32,768-sample
   dependency audit so linked equations aren't perturbed independently.

`run_simulation` / `evaluate_simulation` are the entry points; `__init__.py` is
the curated public surface. `api.py` builds every route inside
`create_app(database_url=..., attachments_dir=...)` — that parameterization is
how tests and e2e get isolated state, so add new stores the same way rather
than reaching for module globals. `imports.py` validates uploads before any
write; `exports.py` produces canonical JSON, reviewed CSV, and the CFD-boundary
document; `test_run_contracts.py` holds the Test Run / measurement documents;
`orm.py` + `alembic/versions` own persistence.

**`apps/web/src/`** — no router and no state library. `App.tsx` (~2k lines)
owns all state and passes it into the three screens; navigation is a `?view=`
query param plus `popstate`. The UI is fixture-first: it renders
`makeSimulationFixture(...)` from `fixtures.ts` immediately, then
`mergeApiResult(fallback, raw)` overlays live API values field by field, so
adding a result field means extending both `domain.ts` view types and the
mapper. Persisted runs from `GET /api/v1/test-runs` are prepended to
`demoRuns`; demo/synthetic runs are deliberately excluded from measurement
counts. Vite proxies `/api` to `127.0.0.1:8000`, which is why
`createHydroCycleClient()` defaults to an empty base URL.

`docs/design/*.png` are authoritative for layout, hierarchy, and interaction
only — their numbers, citations, and source names are not model inputs.
`docs/fidelity/` holds implementation captures and the review ledger.

<!-- machine-git-policy -->
## Git workflow (machine policy, 2026-08-27)

Work on the default branch in this canonical checkout. Do not create
branches or worktrees by default; they are for tasks that genuinely need
isolation, or when Donald asks. Any worktree or topic branch created here
must be merged back into this checkout's default branch, the worktree
removed, and the branch deleted, before pushing and before the task is
called done. Full policy: `~/.claude/CLAUDE.md` (*Git discipline*).
<!-- /machine-git-policy -->
