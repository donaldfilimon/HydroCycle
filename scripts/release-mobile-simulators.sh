#!/usr/bin/env bash
set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIRECTORY="$REPOSITORY_ROOT/apps/mobile"
VERSION="$(node -p "require('$MOBILE_DIRECTORY/package.json').version")"

source_state() {
  {
    git -C "$REPOSITORY_ROOT" status --porcelain=v1 -z
    git -C "$REPOSITORY_ROOT" ls-files -co --exclude-standard -z |
      LC_ALL=C sort -z |
      while IFS= read -r -d '' source_file; do
        source_path="$REPOSITORY_ROOT/$source_file"
        source_mode="$(stat -f '%Lp' "$source_path" 2>/dev/null || true)"
        if [[ -L "$source_path" ]]; then
          source_hash="$(readlink "$source_path" | shasum -a 256 | cut -d ' ' -f 1)"
          printf '%s\0%s\0%s\0' "$source_mode" "$source_hash" "$source_file"
        elif [[ -f "$source_path" ]]; then
          source_hash="$(shasum -a 256 "$source_path" | cut -d ' ' -f 1)"
          printf '%s\0%s\0%s\0' "$source_mode" "$source_hash" "$source_file"
        fi
      done
  } | shasum -a 256 | cut -d ' ' -f 1
}

SOURCE_STATE="$(source_state)"
if [[ $# -ne 0 ]]; then
  printf 'Usage: %s\n' "$0" >&2
  exit 64
fi
OUTPUT_DIRECTORY="$REPOSITORY_ROOT/dist/hydrocycle-mobile-bundle-export-$VERSION"
ARCHIVE="$OUTPUT_DIRECTORY.tar.gz"
DIST_DIRECTORY="$REPOSITORY_ROOT/dist"
mkdir -p "$DIST_DIRECTORY"
WORK_DIRECTORY="$(mktemp -d "$DIST_DIRECTORY/.hydrocycle-mobile-export.XXXXXX")"
BUILD_OUTPUT_DIRECTORY="$WORK_DIRECTORY/output"
BUILD_ARCHIVE="$WORK_DIRECTORY/$(basename "$ARCHIVE")"
BUILD_CHECKSUM="$BUILD_ARCHIVE.sha256"
STAGING_DIRECTORY="$MOBILE_DIRECTORY/.expo-release-staging"
PREVIOUS_OUTPUT_DIRECTORY="$WORK_DIRECTORY/previous-output"
PREVIOUS_ARCHIVE="$WORK_DIRECTORY/previous.tar.gz"
PREVIOUS_CHECKSUM="$WORK_DIRECTORY/previous.tar.gz.sha256"
SUCCESS=0
INSTALL_STARTED=0

cleanup() {
  trap - EXIT INT TERM
  if [[ "$SUCCESS" -ne 1 ]]; then
    if [[ "$INSTALL_STARTED" -eq 1 ]]; then
      rm -rf "$OUTPUT_DIRECTORY" "$ARCHIVE" "$ARCHIVE.sha256"
    fi
    if [[ -e "$PREVIOUS_OUTPUT_DIRECTORY" ]]; then
      rm -rf "$OUTPUT_DIRECTORY"
      mv "$PREVIOUS_OUTPUT_DIRECTORY" "$OUTPUT_DIRECTORY"
    fi
    [[ ! -e "$PREVIOUS_ARCHIVE" ]] || mv -f "$PREVIOUS_ARCHIVE" "$ARCHIVE"
    [[ ! -e "$PREVIOUS_CHECKSUM" ]] || mv -f "$PREVIOUS_CHECKSUM" "$ARCHIVE.sha256"
  fi
  rm -rf "$STAGING_DIRECTORY"
  rm -rf "$WORK_DIRECTORY"
}
trap cleanup EXIT INT TERM

rm -rf "$STAGING_DIRECTORY"
mkdir -p "$BUILD_OUTPUT_DIRECTORY" "$STAGING_DIRECTORY"

(
  cd "$MOBILE_DIRECTORY"
  export EXPO_NO_TELEMETRY=1
  bun install --frozen-lockfile
  CI=1 bunx expo install --check
  for platform in ios android; do
    CI=1 bunx expo export \
      --platform "$platform" \
      --output-dir "$STAGING_DIRECTORY/$platform" >/dev/null
  done
)

cp -R "$STAGING_DIRECTORY/ios" "$BUILD_OUTPUT_DIRECTORY/ios"
cp -R "$STAGING_DIRECTORY/android" "$BUILD_OUTPUT_DIRECTORY/android"

cp "$MOBILE_DIRECTORY/app.json" "$BUILD_OUTPUT_DIRECTORY/app.json"
cp "$MOBILE_DIRECTORY/package.json" "$BUILD_OUTPUT_DIRECTORY/package.json"
cp "$MOBILE_DIRECTORY/bun.lock" "$BUILD_OUTPUT_DIRECTORY/bun.lock"

cat >"$BUILD_OUTPUT_DIRECTORY/RELEASE.txt" <<EOF
HydroCycle mobile bundle-export audit artifact $VERSION

Contains lockfile-pinned iOS and Android Hermes exports plus app metadata.
This proves both JavaScript bundles compile. It is not directly installable or
loadable by Expo Go and is not an iOS .app, Android APK, physical-device,
TestFlight, Play Store, or App Store build.

Toolchain:
  Bun $(bun --version)
  Node $(node --version)
  Expo $(cd "$MOBILE_DIRECTORY" && bunx expo --version)
  Git $(git -C "$REPOSITORY_ROOT" rev-parse HEAD)
  Source-state SHA-256 $SOURCE_STATE

The checksum verifies this artifact's integrity. Byte-identical output across repeated
Hermes exports is not claimed; Expo/Hermes changed bundle hashes in local
repeatability testing with unchanged source state.

Rebuild:
  bun run --cwd apps/mobile export:simulator-bundles
EOF

find "$BUILD_OUTPUT_DIRECTORY" -exec touch -t 198001010000 {} +
(
  cd "$BUILD_OUTPUT_DIRECTORY"
  COPYFILE_DISABLE=1 tar --uid 0 --gid 0 --uname root --gname root \
    -cf - RELEASE.txt app.json bun.lock package.json android ios |
    gzip -n >"$BUILD_ARCHIVE"
)
(
  cd "$WORK_DIRECTORY"
  shasum -a 256 "$(basename "$BUILD_ARCHIVE")" >"$(basename "$BUILD_CHECKSUM")"
  shasum -a 256 -c "$(basename "$BUILD_CHECKSUM")"
)

if [[ "$(source_state)" != "$SOURCE_STATE" ]]; then
  printf 'Source state changed during export; preserving the previous artifact.\n' >&2
  exit 1
fi

INSTALL_STARTED=1
[[ ! -e "$OUTPUT_DIRECTORY" ]] || mv "$OUTPUT_DIRECTORY" "$PREVIOUS_OUTPUT_DIRECTORY"
[[ ! -e "$ARCHIVE" ]] || mv "$ARCHIVE" "$PREVIOUS_ARCHIVE"
[[ ! -e "$ARCHIVE.sha256" ]] || mv "$ARCHIVE.sha256" "$PREVIOUS_CHECKSUM"
mv "$BUILD_OUTPUT_DIRECTORY" "$OUTPUT_DIRECTORY"
mv "$BUILD_ARCHIVE" "$ARCHIVE"
mv "$BUILD_CHECKSUM" "$ARCHIVE.sha256"
SUCCESS=1
printf 'Bundle-export artifact: %s\n' "$ARCHIVE"
printf 'Checksum: %s\n' "$ARCHIVE.sha256"
