#!/usr/bin/env bash
set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODEL_DIRECTORY="$REPOSITORY_ROOT/services/model"
CONTRACT_DIRECTORY="$REPOSITORY_ROOT/packages/contracts"
OUTPUT_DIRECTORY="${1:-$CONTRACT_DIRECTORY}"

mkdir -p "$OUTPUT_DIRECTORY/src" "$OUTPUT_DIRECTORY/fixtures"

(
  cd "$MODEL_DIRECTORY"
  uv run --frozen python scripts/export_openapi.py "$OUTPUT_DIRECTORY/openapi.json"
  uv run --frozen python "$CONTRACT_DIRECTORY/scripts/export_fixtures.py" \
    "$OUTPUT_DIRECTORY/fixtures"
)

(
  cd "$CONTRACT_DIRECTORY"
  bun run openapi-typescript "$OUTPUT_DIRECTORY/openapi.json" \
    -o "$OUTPUT_DIRECTORY/src/api.generated.ts"
)

printf 'Generated OpenAPI, TypeScript route types, and schema fixtures in %s\n' \
  "$OUTPUT_DIRECTORY"
