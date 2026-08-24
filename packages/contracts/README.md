# HydroCycle contracts

This workspace is the versioned boundary between the Python model service and
the React client. `openapi.json` and `src/api.generated.ts` are generated from
the FastAPI application and committed so API drift is reviewable.

- `src/client.ts` exposes an `openapi-fetch` client parameterized by the
  generated route types.
- `src/units.ts` defines canonical SI/API units and display metadata.
- `templates/` contains header-only canonical CSV import templates.
- `fixtures/` contains deterministic schema examples generated from Pydantic.

From the repository root, use `bun run contracts` to update generated files and
`bun run contracts:check` to verify that committed files match the backend.
