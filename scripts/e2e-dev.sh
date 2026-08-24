#!/usr/bin/env bash
set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
E2E_STATE_DIRECTORY="$(mktemp -d "${TMPDIR:-/tmp}/hydrocycle-e2e.XXXXXX")"

cleanup() {
  trap - EXIT INT TERM
  if [[ -n "${DEV_PID:-}" ]]; then
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
  fi
  case "$E2E_STATE_DIRECTORY" in
    "${TMPDIR:-/tmp}"/hydrocycle-e2e.*) rm -rf "$E2E_STATE_DIRECTORY" ;;
  esac
}
trap cleanup EXIT INT TERM

export HYDROCYCLE_DATABASE_URL="sqlite+pysqlite:///$E2E_STATE_DIRECTORY/hydrocycle.db"
export HYDROCYCLE_ATTACHMENTS_DIR="$E2E_STATE_DIRECTORY/attachments"

bash "$REPOSITORY_ROOT/scripts/dev.sh" &
DEV_PID=$!
wait "$DEV_PID"
