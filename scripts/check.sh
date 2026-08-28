#!/usr/bin/env bash
set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$REPOSITORY_ROOT"

bash scripts/check-model.sh
bash scripts/check-contracts.sh
bun run --cwd packages/contracts check
bun run check:web
bash scripts/check-mobile.sh

printf 'HydroCycle full gate passed.\n'
