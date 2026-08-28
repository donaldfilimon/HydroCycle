repo: donaldfilimon/HydroCycle
branch: main
path: apps/web

## Last sync

date: 2026-08-27T23:37:56Z
commit: 36b6e79ddd414ba4baf1559abb5f5ac7b4296ef7
apps/web tree: 0e523488da15d3b978e46d2d31c049619c4c783f

### Verified in this sync

- Compared `HydroCycle - Summary.dc.html` against `apps/web/src` element by element.
  The artifact is a faithful recreation of the shipped Summary screen; no UI delta was
  found, so no application code was changed.
- The exported copy of `apps/web/src/styles.css` was behind upstream blob
  `9141806cc723eccd19f3555333ea92194a3fb0db` by two rule blocks (`.demo-strip`,
  `.static-demo-unavailable`). Rather than commit a stale duplicate, the artifact's
  stylesheet link now resolves to the live file at `../../../apps/web/src/styles.css`.
- Workbench and Test Runs remain unbuilt as Design Components.

## Screen map

| Artifact | Repo files |
| --- | --- |
| `HydroCycle - Summary.dc.html` | `apps/web/src/screens/SummaryScreen.tsx`, `apps/web/src/components/{AppShell,Brand,GateStatus,CylinderSchematic,Charts}.tsx`, `packages/view-model/src/fixtures.ts`, `apps/web/src/styles.css` |
| _(not built)_ Workbench | `apps/web/src/screens/WorkbenchScreen.tsx`, `apps/web/src/components/{Charts,CylinderSchematic,GateStatus,FormField}.tsx`, `apps/web/src/styles.css` |
| _(not built)_ Test Runs | `apps/web/src/screens/TestRunsScreen.tsx`, `apps/web/src/components/AppShell.tsx`, `apps/web/src/styles.css` |
