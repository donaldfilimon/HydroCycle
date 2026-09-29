# HydroCycle P1 digital twin specification (Blender 5.2.2 LTS)

> Recorded verbatim from Donald's message of 2026-09-29. Reconciliation with this repository
> (module paths, invariant 4, the Rust/WebGPU twin) is in
> `docs/superpowers/specs/2026-09-29-hydrocycle-p1-design.md`, which takes precedence where
> they differ.

Binding contract for every module under `blender/`. Data definitions live in
`blender/twin_contract.py`; this document says how to build to them.

Status shown everywhere: **CONCEPT, UNVALIDATED**. The twin draws what the model computes. It
never computes physics a model run provides, and it never makes the hypothesis look better
than the numbers.

## 1. Division of labour

| Concern | Lives in | Rule |
|---|---|---|
| Physics, ledgers, uncertainty | `hcmodel` (Python, float64) | single source of truth |
| Numbers in the scene | `blender/data_bake.py` writes `HC_DATA_*` objects | the only entry point |
| Geometry, motion, plots | Geometry Nodes groups named `HC_*` | fully procedural |
| Kinematics | Geometry Nodes, from the same slider-crank formula | verified against `hcmodel.geometry` |
| Exact values and text metadata | custom properties on objects | read by the inspector panel |
| Interaction | `blender/hc_panel.py` sidebar panel | runs `hcmodel`, re-bakes, switches views |

Geometry Nodes are single precision. Anything that must be exact is stored as a custom property
(float64) and shown from there.

## 2. Build rules

1. All geometry of a component comes from one Geometry Nodes group on one object named
   `<ID> <name>`, for example `RSV-101 Water reservoir`. Object origin stays at the world origin;
   the group places geometry in world coordinates from `COMPONENTS[ID]["pos"]`.
2. Use `gn_lib.TwinG`. Every component group calls `std()` first and `finish(geo, part, std,
   explode_direction)` last, so explode and section behave the same everywhere. Drive the
   standard inputs with `gn_lib.drive_standard(obj, mod, controls)`.
3. Every vertex carries the integer attribute `hc_part`. Component IDs, engine sub-parts,
   stream IDs and proxy IDs are in the contract.
4. Dimensions are group inputs with the contract value as default, in metres, labelled with the
   unit, for example `Body Diameter (m)`. No magic numbers inside node trees for anything a
   reader would call a dimension.
5. Idempotent: building twice leaves one copy. Remove by name before creating.
6. Never cache a Python reference to `mod.properties.inputs.<id>`; look it up on each access
   (`gn_lib.set_input`, `gn_lib.get_input`). Blender 5.2.2 has crashed on a stale reference.
7. After setting a modifier input or a custom property from Python call `update_tag()`.
8. Join Strings evaluates its newest link first. Use `G.concat`, which links in reverse, and
   keep a `text_ok` probe attribute in every group that draws text.
9. Headless commands always use `-b --factory-startup --disable-autoexec`. Blender's exit code
   ignores Python errors: print an explicit PASS or FAIL marker and read it.
10. Materials are created by `views.build_materials()` with names starting `HC_`. Parts refer
    to materials by name and must not create their own.

## 3. Honest visualisation rules

1. Bubble, droplet, vapour and hydrogen markers are proxies. Whenever proxies are visible the
   scene shows `VISUALIZATION NOT TO SCALE` next to them. Proxy count is a display choice and
   never feeds a number.
2. Water liquid, aerosol, water vapour and hydrogen each have their own visual channel and
   colour. They are never merged into one cloud.
3. The ultrasonic chamber shows aerosol leaving. It shows no vapour, because the model creates
   none there.
4. The reaction zone in the cylinder is drawn only when the baked `x_burned` at the current
   crank angle is above zero. At the P0 reference state the model does not ignite, so the
   cylinder shows compression and expansion of a wet charge with no flame.
5. Pressure-containing items are envelopes. Each carries the note `CONCEPT ENVELOPE, UNRATED`.
   Nothing in the scene states or implies a rating, a relief setting, a supply size, an ignition
   timing for hardware, or a safe concentration.
6. While `is_fixture = 1` every analytics panel and the banner show
   `TEST FIXTURE, NOT A MODEL RUN`.
7. The model status banner reads the baked status code. It can show VALIDATED only if the model
   package says so, and the package cannot say so without measured validation data.
8. The legacy volume curve stays on the volume plot beside the slider-crank curve, labelled
   `legacy display fixture (infinite rod)`.

## 4. Modules

| File | Delivers |
|---|---|
| `views.py` | materials, world, lights, `HC_CONTROLS`, ten cameras `HC_VIEW_<NAME>`, `apply_view(name)`, collection tree |
| `parts_deck.py` | HC-BASE-001, RSV-101, FLT-102, PMP-103, NBG-104, CND-105, BQA-231, MTR-106, DAT-801, water and bubble proxies |
| `parts_usc.py` | USC-401 with acoustic-field representation and aerosol, SEP-402, HC-IF-601 boundary |
| `parts_engine.py` | ENG-601 (crankcase, block, liner, head, piston, rod, crank, valves, spark event, charge), EXH-701, CON-702 |
| `streams.py` | one tube per stream in `STREAMS`, flow markers, highlight, component tags |
| `schematic.py` | PROCESS view: block diagram of the chain with stream state labels |
| `plots.py` | line plots reading `HC_DATA_trace`: pressure, temperature, volume with legacy curve, P-V, heat release, water phase, hydrogen, work; time cursor synced to the frame; run B overlay |
| `charts.py` | bars and tables: bubble and droplet distributions, hydrogen inventory, uncertainty bands, energy and mass ledgers, efficiencies, sensitivity, gates, stream phase fractions, status banner |
| `hc_panel.py` | sidebar panel: status, run controls, views, explode and section, component inspector, ledgers, gates |
| `build_twin.py` | builds everything into a fresh scene and saves `HydroCycle_P1.blend` |
| `verify_twin.py` | measures the evaluated scene against the contract and the model |
| `render_twin.py` | stills of all ten views |

Each parts module exposes `build(controls) -> list[bpy.types.Object]` and a headless self-test
`python <module>.py` (run through Blender) that prints `<MODULE>_PASS` or `<MODULE>_FAIL`.

## 5. Verification every module must pass

- Envelope: for each component, `gn_lib.part_bounds` of the evaluated mesh matches
  `COMPONENTS[ID]["size"]` and `pos` within 0.5 mm (P0 geometry) or 2 mm (P1 geometry).
- Standard inputs: explode moves the part by `explode_distance` along its direction; section
  removes faces in front of the plane and nothing behind it.
- Engine: wrist-pin height and cylinder volume from the evaluated mesh match
  `hcmodel.geometry.Geometry` at 24 crank angles within 0.01 mm and 1e-4 relative; compression
  ratio measured from the mesh at TDC and BDC equals the geometric value within 1e-4.
- Data: every plotted value read back from the evaluated plot geometry equals the baked array
  within float32 rounding. The time cursor sits at the current crank angle.
- Text: `text_ok` probe equals 1 in every group that draws text.
- Honesty: a test that the reaction zone has zero vertices when `x_burned` is zero, that the
  ultrasonic stage has no vapour proxy, and that the fixture label is present when
  `is_fixture = 1`.

## 6. Known differences from the P0 CAD package, kept visible

- P0's 3D engine stack-up does not close at top dead centre: with the P0 crank-centre height
  the piston crown would pass about 37.7 mm through the P0 deck plane. P1 derives the deck
  height from crank centre + throw + rod + pin-to-crown + clearance height. `verify_twin.py`
  reports both deck heights.
- P0 places the engine on the conditioning deck in the STEP file, while its own blueprints show
  a conditioning-only deck and a separately reviewed test article. P1 follows the STEP
  position and marks HC-IF-601 as the boundary. Owner decision pending.
- P0's BOM tags differ from the P1 brief (DAT-701 or DAQ-701 against DAT-801; GRD-401 against
  USC-401; HC-ENG-801 to 808 against ENG-601). P1 uses the brief's tags and records the P0 tag
  in the component note.
- P0 has an external hydrogen supply stub and a hydrogen port on the cylinder head. In the P1
  hypothesis hydrogen enters through NBG-104. P1 draws only an unsized boundary stub at
  NBG-104.
