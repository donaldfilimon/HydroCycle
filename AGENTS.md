# HydroCycle engineering guidance

HydroCycle is a local-only evidence-gated simulator. Hydrogen is the fuel;
water is a carrier, diluent, phase-change load, and possible thermal working
fluid. Never describe water as contributing chemical energy.

## Repository layout

- `apps/web`: React 19 + Vite 7 + strict TypeScript, managed with Bun.
- `services/model`: Python 3.14 + FastAPI + Cantera 3.2, managed with uv.
- `packages/contracts`: generated API contracts and canonical import templates.
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

Run `bun run check` from the repository root. Before visual handoff, compare
native 1536x1024 screenshots of Summary, Workbench, and Test Runs against the
approved images in `docs/design`, and exercise a mobile viewport.
