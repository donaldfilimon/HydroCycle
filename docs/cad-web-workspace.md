# HydroCycle browser CAD workspace

`/cad` embeds the self-contained `public/hydrocycle-cad.html` document in a
sandbox with scripts and downloads permitted. The standalone workspace needs
no network, external libraries, Blender, or model service. The route honors
the GitHub Pages base path; a root-path fixture-only Sites export is also available.

## Inspection and geometry

Eight selectable process stages are grouped into conditioning/metrology,
transfer, mechanism, and recovery. Stage buttons, component markers, assembly
selection, and the inspector share selection state. The inspector lists named
subcomponents and their scientific boundary.

Perspective and orthographic projections support orbit, pan, zoom, camera
presets, focus/restore, isolation, visibility, and fit from mesh bounds.
Sections remove mesh sectors and can rotate through 360 degrees. Exploding
separates stages and lifts removable covers; conceptual connections disappear
when exploded or when stages are hidden. These are open concept mesh sections,
not watertight solid CAD or manufacturing drawings.

The engine has a crank pin, connecting rod, wrist pin, piston rings, cylinder
supports, removable head, and illustrative chamber volume. The rod meets the
wrist-pin center; the piston crown offset is included in the chamber envelope.
Playback rebuilds only engine geometry. TDC/BDC and quarter-turn controls,
three display speeds, and the volume plot work at desktop and mobile sizes.
Playback is opt-in, stops when the document is hidden, and offers no operating
speed, ignition timing, or hardware controls.

Fixed nanobubble and aerosol glyphs always carry **VISUALIZATION NOT TO SCALE**.
They do not move along paths; their count and size do not establish concentration,
mass, vapor fraction, or CFD output. Water is carrier and thermal load;
hydrogen is fuel. No pressure rating, gas-source sizing, combustible-mixture
recipe, or actuator endpoint is supplied.

## Evidence and read-only results

Mass, energy, provenance, and validation panels begin with unknown values.
**Open model result** accepts an existing HydroCycle `SimulationResult` JSON
object, either directly or under a `result` property. It does not call a solver.
Canonical Test Run bundles containing multiple simulations must first have the
chosen simulation's `result` extracted; the workspace never silently chooses one.

The importer checks schema version, reproducibility fields, array lengths,
finite values, angle ordering, and the failed-gate/proposed-cycle invariant.
Files are bounded to 5 MB and traces to 10,000 samples. It displays only the
saved motored baseline, with an independent sample scrubber and P–V cursor.
Unit conversions are for display only. No pressure or energy is re-derived.
Model results are not represented as measurements or hardware validation.

CAD geometry and result geometry are independent. Editing geometry cannot
alter a saved result, and the result plot explicitly says so. Missing ledger
values remain `null` internally and `Unknown` on screen; actual zero remains
zero. Imported content is rendered as text, not HTML. Invalid imports preserve
the previous accepted result. Clearing a result restores unknowns.

## Files and compatibility

Parameter JSON remains `hydrocycle-cad/1`; old files without `sectionAngle`
default to zero. New files include the orientation. Unknown hydrogen mass,
vapor fraction, and shaft power remain null. Parameter exports do not include
imported results and cannot accidentally turn model output into measurements.

OBJ exports contain real visible triangles in millimeters, respect isolation
and visibility, and exclude symbolic samples. They remain NOT FOR FABRICATION.
The volume calculation preserves the P0 500 cm³ / 86 mm / 10:1 / 3.5 reference
and the documented discrepancy with the legacy minus-ten-degree value.

## Verification commands

- `bun run test:cad`: 20 dependency-free tests executing the shipped model script.
- `bun run test:cad:browser`: 10 Chromium scenarios at 1536×1024 and 390×844,
  WebGL and forced Canvas fallback, stage synchronization, motion/inspection,
  accessibility scans, downloads, imports, and null/invalid result handling.
- `bun run test:e2e`: complete application browser suite, including sandboxed
  `/cad` route interaction/download checks at desktop and mobile widths.
- `bun run check`: full repository gate, now including the CAD model tests.
- `bun run build:sites:static`: root-path fixture-only static Next export.

Screenshots are written under `apps/web/test-results`. Chromium viewport tests
are not native Safari/iPhone or physical-device acceptance. Publication is a
separate action; source commits and local builds do not establish a live update.
