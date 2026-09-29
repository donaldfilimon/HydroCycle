#!/usr/bin/env bash
# Tests the custom renderer against Python's manifest, then builds the browser
# assets used by both web build modes. Native GPU/window smoke is opt-in because
# CI may have no interactive display. All services remain separately loopback-only.
set -euo pipefail
cd "$(dirname "$0")/.."
rustup run nightly-2026-09-01 cargo fmt --manifest-path crates/hydrocycle-twin/Cargo.toml --check
rustup run nightly-2026-09-01 cargo clippy --locked --manifest-path crates/hydrocycle-twin/Cargo.toml --all-targets -- -D warnings
rustup run nightly-2026-09-01 cargo test --locked --manifest-path crates/hydrocycle-twin/Cargo.toml
bash scripts/build-twin.sh
