#!/usr/bin/env bash
# Builds the shared custom Rust raster renderer, then generates browser bindings.
# Native build and Python manifest generation are separate; never bind a server here.
set -euo pipefail
cd "$(dirname "$0")/.."
rustup run nightly-2026-09-01 cargo build --locked --manifest-path crates/hydrocycle-twin/Cargo.toml --target wasm32-unknown-unknown --release --lib
wasm-bindgen crates/hydrocycle-twin/target/wasm32-unknown-unknown/release/hydrocycle_twin.wasm --target web --out-dir apps/web/public/twin-gpu --out-name hydrocycle_twin
