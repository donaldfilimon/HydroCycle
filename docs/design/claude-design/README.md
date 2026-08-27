# Claude Design handoff — Summary screen

A [Claude Design](https://claude.ai/design) artifact exported from the
`Repo setup checkpoint` project and committed here for reference.

## What this is

`HydroCycle - Summary.dc.html` is a **static recreation of the Summary screen as it
already ships** — not a proposed redesign. The originating session was run with the
"Start from code" skill, whose first job is to reproduce the existing UI pixel-for-pixel
before designing anything new. The session ended at that recreation step, so no new
design was ever produced.

Every element in the file maps to live code:

| Region of the artifact | Source of truth |
| --- | --- |
| Topbar, nav, safety strip, mobile gate | `apps/web/src/components/AppShell.tsx` |
| Metric tiles, feasibility gate | `apps/web/src/screens/SummaryScreen.tsx`, `components/GateStatus.tsx` |
| Energy flow, log scale, gap callout | `apps/web/src/screens/SummaryScreen.tsx` |
| Cylinder schematic SVG | `apps/web/src/components/CylinderSchematic.tsx` |
| Decision rail, evidence ledger | `apps/web/src/screens/SummaryScreen.tsx` |
| Sensitivity bars | `apps/web/src/components/Charts.tsx` |
| Every colour, radius, and spacing value | `apps/web/src/styles.css` |

**Treat the React source as authoritative.** This file is a snapshot; the app is the
product. If the two disagree, the app is right and this file is stale.

## How it differs from the running app

The artifact is a flat prototype, so a few things are frozen rather than computed:

- Values from the default fixture are inlined as literals (`1.57 mg H₂/L`,
  `2,440 kJ/L`, required/available ratio `30,254.78`) instead of being derived from
  `fixtures.ts` and the gate calculation.
- The cylinder schematic's geometry is fixed at the piston position and `576 K` zone
  temperature that the fixture produces. The real component recomputes paths from
  `angleDeg` and re-derives the fill hue from `temperatureK`.
- Icons come from the Lucide UMD CDN build rather than `lucide-react`.
- Only the non-water-injection branch is represented. The
  `hydrogen_fuel_with_water_injection` scenario relabels three metric tiles and four
  energy-flow stages; none of those alternate strings appear here.
- Static-demo chrome is absent — no `.demo-strip`, no `staticDemo` button states, no
  workbench `.topbar-safety` span.

It exposes two authoring knobs, wired through the Design Components runtime rather than
the app's state: `gatePassed` (pass/fail gate) and `uncertaintyVisible` (interval rows).

## Opening it

Open `HydroCycle - Summary.dc.html` directly in a browser. `support.js` is the Design
Components runtime and bootstraps React, ReactDOM, and Babel from unpkg, so an internet
connection is required; Google Fonts and the Lucide CDN are fetched the same way.

The stylesheet link was repointed on commit from the exported copy to
`../../../apps/web/src/styles.css` — the artifact renders against the app's live
stylesheet, so styling changes can never silently drift out of this snapshot. The
export shipped its own duplicate of `styles.css`, already behind upstream by the
`.demo-strip` and `.static-demo-unavailable` rules; that copy was dropped rather than
committed.

## Scope

Only the Summary screen was recreated. Workbench and Test Runs were never built in the
design session — see the PNG references in the parent `docs/design/` directory for those.

`github.md` records the upstream sync state the artifact was built against.
