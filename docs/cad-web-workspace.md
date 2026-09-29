# HydroCycle browser CAD workspace

This adds `/cad` to the existing web app. Summary, Workbench, Test Runs,
contracts, and the Python thermodynamic solver are unchanged.

The route embeds `public/hydrocycle-cad.html` in an isolated iframe and uses
`runtimeConfigFromEnvironment().basePath`, including the GitHub Pages prefix.
The document also works independently, without external scripts, styles,
fonts, network requests, accounts, telemetry, or Blender.

## What is implemented

- Eight named concept stages, selectable from the assembly tree or markers.
- Perspective orbit, pan, zoom, presets, component focus, and keyboard control.
- Real mesh cutaways, visibility filtering, and exploded assembly coordinates.
- Parameterized slider-crank geometry with synchronized volume readouts.
- Explicitly symbolic, fixed nanobubble and aerosol glyphs, not trajectories.
- Validated JSON parameter import/export and actual visible-mesh OBJ export.
- Native WebGL rendering and a shared-mesh Canvas 3D fallback.
- Responsive desktop/mobile controls and resize-aware camera framing.

## Scientific boundary

This is a concept-mesh workstation, not a solid-modeling CAD kernel or a
fabrication release. Envelope dimensions do not establish pressure ratings.
The geometry is not evidence for hydrogen loading, vaporization, engine power,
or the feasibility of the proposed process.

Hydrogen mass, molecular vapor fraction, and shaft power remain `null` in
exports. The current solver is not called or replaced. No actuator, ignition,
or other hardware-control path exists.

The P0 reference is 500 cubic centimeters displacement, compression ratio 10,
86 mm bore, and rod/crank ratio 3.5. Stroke is derived from displacement and
bore rather than copied from rounded drawings. At minus 10 degrees the
geometric volume is about 60.431 cubic centimeters; the legacy 59.354 value
is retained as a discrepancy, not silently fitted away.

## Verification

Run the dependency-free checks against the exact published document:

```sh
node --test scripts/test-cad-model.cjs
```

There are 14 checks covering kinematic invariants, units, finite geometry,
cutaways, exploded coordinates, input validation, unknown physical values,
JSON round trips, and real OBJ geometry with visibility filtering.

`apps/web/src/test/cad-document.test.ts` adds six checks to the existing
Vitest suite. The regular repository gate should still run before deployment:

```sh
bun run check
```

This change was exercised offline with Playwright/Chromium at 1536 by 960 and
390 by 844, including the sandboxed iframe, controls, invalid imports, and
actual JSON/OBJ downloads. No JavaScript runtime errors were observed.
The validation environment exposed Canvas 3D but not WebGL. GPU rendering,
full Next builds, existing-route regressions, and live-domain publication
were not validated there.

## Publishing and maintenance

The portable document intentionally retains its embedded formatting. Its
geometry script has the stable id `hydrocycle-model-source`, so tests execute
the actual shipped geometry code rather than a separate duplicate.

Source commits do not themselves prove a successful deployment. GitHub Pages
is gated by the existing CI workflow. The original Sites project requires
its own publication step; its hosting configuration is not changed here.
