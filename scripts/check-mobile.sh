#!/usr/bin/env bash
set -euo pipefail

# `apps/mobile` is deliberately NOT a root workspace member: Metro resolves
# modules differently from Bun's workspace hoister, so the app keeps its own
# lockfile and node_modules (the same split `mlai` uses for its Expo app).
# That means this gate installs into the app directory before checking it.
#
# EXPO_NO_TELEMETRY is set because AGENTS.md hard invariant 7 forbids
# telemetry, and the Expo CLI reports usage by default.

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIRECTORY="$REPOSITORY_ROOT/apps/mobile"

export EXPO_NO_TELEMETRY=1

cd "$MOBILE_DIRECTORY"

if [[ ! -d node_modules ]]; then
  printf 'Installing apps/mobile dependencies...\n'
  bun install --frozen-lockfile
fi

bun run typecheck
bun run lint
bun run test

# Typecheck alone does NOT prove the app runs: TypeScript and Metro resolve
# modules differently, and a cross-package import can type-check cleanly while
# failing to bundle. Exporting a real Hermes bundle is the check that catches
# that, so it stays in the gate.
CI=1 bunx expo export --platform ios --output-dir .expo-export-check >/dev/null
rm -rf .expo-export-check

printf 'HydroCycle mobile checks passed.\n'
