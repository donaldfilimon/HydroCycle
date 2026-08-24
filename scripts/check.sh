#!/usr/bin/env bash
set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$REPOSITORY_ROOT"

bash scripts/check-model.sh
bash scripts/check-contracts.sh
bun run --cwd packages/contracts check
bun run --cwd apps/web format:check
bun run --cwd apps/web lint
bun run --cwd apps/web typecheck
bun run --cwd apps/web test
bun run --cwd apps/web build

printf 'HydroCycle full gate passed.\n'
