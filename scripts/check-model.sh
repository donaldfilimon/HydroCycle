#!/usr/bin/env bash
set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODEL_DIRECTORY="$REPOSITORY_ROOT/services/model"

cd "$MODEL_DIRECTORY"
uv sync --frozen
uv run --frozen ruff format --check src tests alembic scripts
uv run --frozen ruff check src tests alembic scripts
uv run --frozen mypy
uv run --frozen pytest
