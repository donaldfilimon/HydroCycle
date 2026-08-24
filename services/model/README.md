# HydroCycle model service

The model service evaluates hydrogen loading and retention, applies a strict
mass-and-energy feasibility gate, and only then evaluates a homogeneous,
single-zone 0D reactive cycle. A failed gate always returns the motored
baseline and sensitivities with `proposed_cycle: null`.

Run the local-only service:

```bash
uv sync
uv run alembic upgrade head
uv run hydrocycle-model
```

The default bind address is `127.0.0.1:8000`. Runtime SQLite data and imported
attachments are stored beneath the repository's ignored `data/` directory.
Only `/api/v1/*` routes are served; interactive documentation and network
OpenAPI routes are disabled. Test-run scalar measurements require explicit
units, positive standard uncertainty, distribution, measured source ID, and
calibration provenance. Measured retention-series ordinates carry the same
provenance-bearing uncertainty contract and enter seeded propagation directly.
Canonical simulation imports are rerun and compared exactly before regenerated
output is persisted.

Verify this service:

```bash
uv run ruff format --check .
uv run ruff check .
uv run mypy src
uv run pytest
```
