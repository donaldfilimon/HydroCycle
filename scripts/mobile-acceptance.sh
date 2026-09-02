#!/usr/bin/env bash
set -euo pipefail

PLATFORM="${1:-ios}"
MODE="${2:-interactive}"
if [[ "$PLATFORM" != "ios" && "$PLATFORM" != "android" ]]; then
  printf 'Usage: %s [ios|android] [--smoke]\n' "$0" >&2
  exit 64
fi
if [[ "$MODE" != "interactive" && "$MODE" != "--smoke" ]]; then
  printf 'Usage: %s [ios|android] [--smoke]\n' "$0" >&2
  exit 64
fi

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODEL_DIRECTORY="$REPOSITORY_ROOT/services/model"
MOBILE_DIRECTORY="$REPOSITORY_ROOT/apps/mobile"
API_PORT="${HYDROCYCLE_API_PORT:-8000}"
METRO_PORT="${HYDROCYCLE_METRO_PORT:-8081}"
STATE_DIRECTORY="$(mktemp -d "${TMPDIR:-/tmp}/hydrocycle-mobile-acceptance.XXXXXX")"
API_PID=""
METRO_PID=""
IOS_SIMULATOR=""
IOS_BOOTED_BY_SCRIPT=0
APP_LAUNCHED=0
ADB=""

# shellcheck disable=SC2329
terminate_tree() {
  local parent_pid="$1"
  local child_pid
  while IFS= read -r child_pid; do
    [[ -z "$child_pid" ]] || terminate_tree "$child_pid"
  done < <(pgrep -P "$parent_pid" 2>/dev/null || true)
  kill "$parent_pid" 2>/dev/null || true
}

# shellcheck disable=SC2329
cleanup() {
  trap - EXIT INT TERM
  if [[ "$APP_LAUNCHED" -eq 1 && "$PLATFORM" == "ios" ]]; then
    xcrun simctl terminate "$IOS_SIMULATOR" host.exp.Exponent 2>/dev/null || true
  elif [[ "$APP_LAUNCHED" -eq 1 && -n "$ADB" ]]; then
    "$ADB" shell am force-stop host.exp.exponent 2>/dev/null || true
  fi
  if [[ "$IOS_BOOTED_BY_SCRIPT" -eq 1 ]]; then
    xcrun simctl shutdown "$IOS_SIMULATOR" 2>/dev/null || true
  fi
  [[ -z "$METRO_PID" ]] || terminate_tree "$METRO_PID"
  [[ -z "$API_PID" ]] || terminate_tree "$API_PID"
  [[ -z "$METRO_PID" ]] || wait "$METRO_PID" 2>/dev/null || true
  [[ -z "$API_PID" ]] || wait "$API_PID" 2>/dev/null || true
  if [[ "${HYDROCYCLE_KEEP_ACCEPTANCE_STATE:-0}" == "1" ]]; then
    printf 'Preserved acceptance state: %s\n' "$STATE_DIRECTORY" >&2
  else
    rm -rf "$STATE_DIRECTORY"
  fi
}
trap cleanup EXIT INT TERM

assert_loopback_listener() {
  local port="$1"
  local listeners
  listeners="$(lsof -nP -a -iTCP:"$port" -sTCP:LISTEN -Fn | grep '^n')"
  if [[ "$listeners" != "n127.0.0.1:$port" ]]; then
    printf 'Port %s is not exclusively bound to 127.0.0.1: %s\n' \
      "$port" "$listeners" >&2
    exit 1
  fi
}

for port in "$API_PORT" "$METRO_PORT"; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null; then
    printf 'Port %s is already in use; acceptance requires an isolated stack.\n' "$port" >&2
    exit 1
  fi
done

mkdir -p "$STATE_DIRECTORY/attachments"
(
  cd "$MODEL_DIRECTORY"
  export HYDROCYCLE_DATABASE_URL="sqlite+pysqlite:///$STATE_DIRECTORY/hydrocycle.db"
  export HYDROCYCLE_ATTACHMENTS_DIR="$STATE_DIRECTORY/attachments"
  export PYTHONUNBUFFERED=1
  exec uv run --frozen uvicorn hydrocycle.api:app \
    --host 127.0.0.1 \
    --port "$API_PORT"
) >"$STATE_DIRECTORY/api.log" 2>&1 &
API_PID=$!

for _ in {1..60}; do
  if curl --fail --silent "http://127.0.0.1:$API_PORT/api/v1/health" >/dev/null; then
    break
  fi
  sleep 1
done
curl --fail --silent "http://127.0.0.1:$API_PORT/api/v1/health" >/dev/null
assert_loopback_listener "$API_PORT"

(
  cd "$MOBILE_DIRECTORY"
  export EXPO_NO_TELEMETRY=1
  exec bunx expo start --localhost --port "$METRO_PORT"
) >"$STATE_DIRECTORY/metro.log" 2>&1 &
METRO_PID=$!

for _ in {1..90}; do
  if curl --fail --silent "http://127.0.0.1:$METRO_PORT/status" >/dev/null; then
    break
  fi
  sleep 1
done
curl --fail --silent "http://127.0.0.1:$METRO_PORT/status" >/dev/null
assert_loopback_listener "$METRO_PORT"

if [[ "$PLATFORM" == "ios" ]]; then
  IOS_SIMULATOR="${HYDROCYCLE_IOS_SIMULATOR:-iPhone 17 Pro Max}"
  if ! xcrun simctl list devices booted | grep -Fq "$IOS_SIMULATOR ("; then
    IOS_BOOTED_BY_SCRIPT=1
  fi
  xcrun simctl boot "$IOS_SIMULATOR" 2>/dev/null || true
  xcrun simctl bootstatus "$IOS_SIMULATOR" -b
  if ! xcrun simctl listapps "$IOS_SIMULATOR" | grep -q 'host.exp.Exponent'; then
    printf 'Expo Go is not installed on %s.\n' "$IOS_SIMULATOR" >&2
    exit 1
  fi
  xcrun simctl terminate "$IOS_SIMULATOR" host.exp.Exponent 2>/dev/null || true
  xcrun simctl openurl "$IOS_SIMULATOR" "exp://127.0.0.1:$METRO_PORT"
  APP_LAUNCHED=1
else
  if [[ -n "${ANDROID_SDK_ROOT:-}" ]]; then
    ADB="$ANDROID_SDK_ROOT/platform-tools/adb"
  elif command -v adb >/dev/null 2>&1; then
    ADB="$(command -v adb)"
  else
    ADB="$HOME/Library/Android/sdk/platform-tools/adb"
  fi
  if [[ ! -x "$ADB" ]] || ! "$ADB" get-state >/dev/null 2>&1; then
    printf 'Start an Android emulator before running Android acceptance.\n' >&2
    exit 1
  fi
  if ! "$ADB" shell pm list packages host.exp.exponent | grep -q host.exp.exponent; then
    printf 'Expo Go is not installed on the active Android emulator.\n' >&2
    exit 1
  fi
  "$ADB" shell am force-stop host.exp.exponent
  "$ADB" shell am start \
    -n host.exp.exponent/.LauncherActivity \
    -a android.intent.action.VIEW \
    -c android.intent.category.BROWSABLE \
    -d "exp://10.0.2.2:$METRO_PORT" >/dev/null
  APP_LAUNCHED=1
fi

if [[ "$MODE" == "--smoke" ]]; then
  BUNDLE_LABEL="Android"
  [[ "$PLATFORM" != "ios" ]] || BUNDLE_LABEL="iOS"
  for _ in {1..45}; do
    if grep -Eiq "$BUNDLE_LABEL Bundled" "$STATE_DIRECTORY/metro.log"; then
      break
    fi
    sleep 1
  done
  if ! grep -Eiq "$BUNDLE_LABEL Bundled" "$STATE_DIRECTORY/metro.log"; then
    printf 'Metro did not serve the current %s bundle after the deep link.\n' \
      "$PLATFORM" >&2
    exit 1
  fi
  if [[ "$PLATFORM" == "ios" ]]; then
    xcrun simctl io "$IOS_SIMULATOR" screenshot "$STATE_DIRECTORY/ios.png" >/dev/null
    test -s "$STATE_DIRECTORY/ios.png"
  else
    "$ADB" exec-out uiautomator dump /dev/tty >"$STATE_DIRECTORY/android.xml"
    if ! grep -q 'text="HydroCycle"' "$STATE_DIRECTORY/android.xml" ||
      ! grep -q 'text="Canonical contract fixture' "$STATE_DIRECTORY/android.xml" ||
      ! grep -q 'text="Model service online' "$STATE_DIRECTORY/android.xml"; then
      printf 'HydroCycle did not appear in the Android accessibility tree.\n' >&2
      exit 1
    fi
  fi
  printf 'Isolated %s native smoke passed.\n' "$PLATFORM"
  exit 0
fi

printf 'Isolated %s acceptance stack is running.\n' "$PLATFORM"
printf 'API: http://127.0.0.1:%s\n' "$API_PORT"
printf 'State: %s (removed on exit)\n' "$STATE_DIRECTORY"
printf 'Press Ctrl-C after completing the native checks.\n'
while kill -0 "$METRO_PID" 2>/dev/null && kill -0 "$API_PID" 2>/dev/null; do
  sleep 1
done
printf 'Acceptance stack exited because a required service stopped.\n' >&2
exit 1
