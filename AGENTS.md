# HydroCycle engineering guidance

This is the canonical project guide; `CLAUDE.md` adds detailed architecture.

HydroCycle is a local-only evidence-gated simulator. Hydrogen is the fuel;
water is a carrier, diluent, phase-change load, and possible thermal working
fluid. Never describe water as contributing chemical energy.

## Repository layout

- `apps/web`: Next.js 16 App Router + React 19 + strict TypeScript, managed
  with Bun 1.4. Local mode uses the gateway; hosted mode is fixture-only.
- `apps/mobile`: Expo SDK 53 + React Native client. Not a root workspace
  member; it keeps its own lockfile because Metro and Bun resolve differently.
- `apps/site`: fixture-only hosted preview. Outside the root gate.
- `services/model`: Python 3.14 + FastAPI + Cantera 3.2, managed with uv.
- `services/gateway`: Bun proxy and read-only advisor; browser requests use
  `/gateway` through Next rewrites, not the model service directly.
- `packages/advisor`: shared advisor schemas, not an inference runtime.
- `packages/contracts`: generated API contracts and canonical import templates.
- `packages/view-model`: presentation types and demo fixtures shared by the
  web and mobile clients.
- `docs/design`: approved visual references. They define layout and hierarchy,
  but their illustrative numeric values are not scientific fixtures.

## Hard invariants

1. A failed feasibility gate returns a motored baseline and sensitivities, but
   no proposed reactive cycle.
2. Measured total hydrogen replaces derived dissolved-plus-bubble loading; it
   must never be double counted.
3. Missing measurements remain `null`, never numeric zero.
4. The 0D model is homogeneous and single-zone. Do not render flame fronts,
   velocity fields, particle trajectories, or CFD contours.
5. V1 is read-only with respect to hardware. Do not add actuator, ignition,
   injector, throttle, or command endpoints.
6. Every persisted result records schema, solver, Python, Cantera, mechanism,
   and random-seed metadata.
7. Bind network services to `127.0.0.1`; add no telemetry or cloud sync.

## Verification

- Root gate: `bun run check` (`scripts/check.sh`), also used by CI. Runs model,
  generated-contract drift, contracts, view-model, advisor, gateway, web, mobile.
  Root `bun run test` is narrower: it omits gateway, advisor, mobile, and e2e.
- The gate installs dependencies: model uses `uv sync --frozen`; mobile uses
  its own `bun install --frozen-lockfile`, Expo compatibility and loopback checks,
  TypeScript, ESLint, Jest, then actual iOS and Android bundle exports.
  Root `bun run setup` does not install mobile. Do not add it to root workspaces.
- Web check builds both local and hosted modes and inspects the hosted artifact.
  `bun run build:pages` exports `apps/web/out` under `/HydroCycle`; it is not
  an `apps/site` build. Neither root check nor Pages CI covers `apps/site`.
- Focused web test from root:
  `bun run --cwd apps/web test src/test/unified-data-source.test.ts` (Vitest).
- Focused model test from `services/model`:
  `uv run --frozen pytest tests/test_physics.py -k retention`.
- Focused mobile test from `apps/mobile`:
  `bun run test src/__tests__/contracts.test.ts` (Jest, not Vitest).
- Browser acceptance is separate: `bun run test:e2e`; desktop only:
  `bun run --cwd apps/web test:e2e --project=chromium-desktop`.
  Playwright starts its own stack with temporary DB/attachments; it does not
  reuse a running dev server. Projects select the Chrome channel.
- `bun run --cwd apps/web visual:capture` instead needs `bun run dev` already
  running. Compare Summary, Workbench, Test Runs at 1536x1024 and a mobile
  viewport with `docs/design`; illustrative numbers are not scientific fixtures.

## Boundary traps

- Schemas flow from Python through generated contracts to view-model and clients;
  clients must not re-derive physics. Regenerate with `bun run contracts` after
  schema changes, including field descriptions; verify `bun run contracts:check`.
  Generation is in-process: the server exposes no `/docs` or `/openapi.json`.
- New model routes also need the gateway allowlist in `services/gateway/src/proxy.ts`.
- `bun run dev` starts web `:5173`, gateway `:8787`, model `:8000`, all on loopback;
  one exiting shuts down the others. Hosted builds have no live API rewrite.

<!-- machine-git-policy -->
## Git workflow (machine policy, 2026-08-27)

Work on the default branch in this canonical checkout. Do not create
branches or worktrees by default; they are for tasks that genuinely need
isolation, or when Donald asks. Any worktree or topic branch created here
must be merged back into this checkout's default branch, the worktree
removed, and the branch deleted, before pushing and before the task is
called done. Full policy: `~/.claude/CLAUDE.md` (*Git discipline*).
<!-- /machine-git-policy -->
