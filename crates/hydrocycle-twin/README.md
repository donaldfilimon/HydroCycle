# HydroCycle custom GPU renderer

A shared Rust mesh renderer for browser WebGPU and native winit/Metal (or the
platform wgpu backend). This is rasterization with depth testing and directional
lighting, not ray tracing, CFD or a reactive-cycle solver. Meshes are four shared
primitive buffers (box, cylinder, low-poly sphere, section cylinder) with bounded
instanced draws. Total scene budget is 1,000 instances. Static particle glyphs
are deliberately oversized illustrations, not simulated trajectories, number
density or metrology results.

The Python-authored `packages/contracts/fixtures/twin-reference.json` supplies all
stage envelopes, connections, finite variants, bore and sampled slider-crank pin
coordinates. The renderer selects a frame; it does not derive thermodynamics or
kinematics. Engine pin coordinates share a uniform 0.007 scene-unit/mm scale.
Scene envelopes, piston thickness, housings, fittings and mounting geometry are
conceptual visual additions, not fabrication dimensions or pressure ratings.

## Build

From the repository root, with the installed Rust nightly and wasm-bindgen
0.2.129:

```sh
./scripts/build-twin.sh
rustup run nightly-2026-09-01 cargo test --locked --manifest-path crates/hydrocycle-twin/Cargo.toml
rustup run nightly-2026-09-01 cargo run --locked --manifest-path crates/hydrocycle-twin/Cargo.toml -- packages/contracts/fixtures/twin-reference.json
```

Append `--smoke` after the manifest path for a bounded three-submission native
GPU startup check with a nonzero exit on initialization or rendering failure.

Native controls: left drag orbits, wheel zooms, Space pauses/plays at illustrative
30 degrees/second, S sections, E explodes, 1–5 select variants. This rate is a
visual timeline and is not engine RPM. Native starts paused. The browser provides
accessible controls, stage isolation, pan and timeline separately.

## Browser API

```js
import init, { TwinRenderer } from '/twin-gpu/hydrocycle_twin.js';
await init();
const renderer = await TwinRenderer.create(canvas, JSON.stringify(manifest));
renderer.configure(JSON.stringify({
  frame_index: 0, variant: 'aerosol-carrier',
  section: true, explode: 0,
  focus_stage: 'ENG-601', // Omit or null to target the complete scene.
  yaw: 0.55, pitch: 0.45, distance: 24, pan_x: 0, pan_y: 0,
  // Omit visible_stages to show every stage in the selected variant.
}));
renderer.resize(canvas.width, canvas.height);
renderer.render();
renderer.instance_count();
renderer.free(); // on unmount; do not call methods after freeing
```

`create`, `configure` and `render` throw actionable JavaScript errors. Browser
initialization requires WebGPU in a secure context (loopback is acceptable). There
is no silent WebGL downgrade. Resize clamps dimensions to the device texture
limit. Surface lost/outdated events trigger reconfiguration; timeouts skip a
frame. Out-of-memory and unrecoverable surface errors propagate to the host UI.

API references: [wgpu 26.0.1](https://docs.rs/wgpu/26.0.1/wgpu/),
[winit ApplicationHandler](https://docs.rs/winit/0.30.13/winit/application/trait.ApplicationHandler.html),
[wasm-bindgen](https://wasm-bindgen.github.io/wasm-bindgen/).

Camera focus follows the selected stage through exploded layouts and retains pan
offsets. Lighting writes through an sRGB surface view on both browser and native
targets, applying display encoding once after linear shading.
