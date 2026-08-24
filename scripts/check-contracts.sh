#!/usr/bin/env bash
set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACT_DIRECTORY="$REPOSITORY_ROOT/packages/contracts"
TEMPORARY_DIRECTORY="$(mktemp -d "${TMPDIR:-/tmp}/hydrocycle-contracts.XXXXXX")"

cleanup() {
  rm -rf "$TEMPORARY_DIRECTORY"
}
trap cleanup EXIT INT TERM

bash "$REPOSITORY_ROOT/scripts/generate-contracts.sh" "$TEMPORARY_DIRECTORY"

ARTIFACTS=(
  "openapi.json"
  "src/api.generated.ts"
  "fixtures/simulation-input.default.json"
  "fixtures/simulation-input.measured-total.json"
  "fixtures/simulation-input.water-injection.json"
)

for artifact in "${ARTIFACTS[@]}"; do
  if ! cmp -s "$CONTRACT_DIRECTORY/$artifact" "$TEMPORARY_DIRECTORY/$artifact"; then
    printf 'Generated contract drift detected: %s\n' "$artifact" >&2
    diff -u "$CONTRACT_DIRECTORY/$artifact" "$TEMPORARY_DIRECTORY/$artifact" || true
    printf 'Run `bun run contracts` and commit the generated changes.\n' >&2
    exit 1
  fi
done

printf 'Contract generation is deterministic and committed artifacts are current.\n'
