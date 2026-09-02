#!/usr/bin/env bash
set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODEL_DIRECTORY="$REPOSITORY_ROOT/services/model"
WEB_DIRECTORY="$REPOSITORY_ROOT/apps/web"
GATEWAY_DIRECTORY="$REPOSITORY_ROOT/services/gateway"
API_PORT="8000"
GATEWAY_PORT="8787"
WEB_PORT="5173"
API_PID=""
GATEWAY_PID=""
WEB_PID=""

cleanup() {
  trap - EXIT INT TERM
  if [[ -n "$WEB_PID" ]]; then
    kill "$WEB_PID" 2>/dev/null || true
  fi
  if [[ -n "$API_PID" ]]; then
    kill "$API_PID" 2>/dev/null || true
  fi
  if [[ -n "$GATEWAY_PID" ]]; then
    kill "$GATEWAY_PID" 2>/dev/null || true
  fi
  if [[ -n "$WEB_PID" ]]; then
    wait "$WEB_PID" 2>/dev/null || true
  fi
  if [[ -n "$API_PID" ]]; then
    wait "$API_PID" 2>/dev/null || true
  fi
  if [[ -n "$GATEWAY_PID" ]]; then
    wait "$GATEWAY_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

(
  cd "$MODEL_DIRECTORY"
  exec uv run --frozen uvicorn hydrocycle.api:app \
    --host 127.0.0.1 \
    --port "$API_PORT" \
    --reload
) &
API_PID=$!

(
  cd "$GATEWAY_DIRECTORY"
  exec bun run start
) &
GATEWAY_PID=$!

(
  cd "$WEB_DIRECTORY"
  exec bun run dev
) &
WEB_PID=$!

printf 'HydroCycle API: http://127.0.0.1:%s\n' "$API_PORT"
printf 'HydroCycle gateway: http://127.0.0.1:%s\n' "$GATEWAY_PORT"
printf 'HydroCycle web: http://127.0.0.1:%s\n' "$WEB_PORT"

while kill -0 "$API_PID" 2>/dev/null && kill -0 "$GATEWAY_PID" 2>/dev/null && kill -0 "$WEB_PID" 2>/dev/null; do
  sleep 1
done

set +e
if ! kill -0 "$API_PID" 2>/dev/null; then
  wait "$API_PID"
  EXIT_STATUS=$?
elif ! kill -0 "$GATEWAY_PID" 2>/dev/null; then
  wait "$GATEWAY_PID"
  EXIT_STATUS=$?
else
  wait "$WEB_PID"
  EXIT_STATUS=$?
fi
set -e

exit "$EXIT_STATUS"
