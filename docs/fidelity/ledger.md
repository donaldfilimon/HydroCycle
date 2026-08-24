# Visual fidelity ledger

This ledger compares the accepted 1536x1024 concepts in `docs/design` with
the code-native implementation captures in `docs/fidelity/implementation`.
The concepts are authoritative for layout, hierarchy, interaction density,
and visual character only. Their illustrative measurements, citations, dates,
source names, thresholds, and run data are intentionally excluded from the
scientific model.

## Capture evidence

| Screen | Accepted concept SHA-256 | Desktop implementation SHA-256 | Mobile implementation SHA-256 |
| --- | --- | --- | --- |
| Summary | `4ea76107ed4164734cb28570d2761c23b1647db06563e093d93a7f804d6a3432` | `7700f2632a2039153d249a39113002cf332406d66e0e2f1dee33e2ec8475861a` | `6810f47d34f8e491d811e282e5e5cea489866e8593a305d7743db029e50545af` |
| Workbench | `efc87670a9c76f45b1003c272a988b8c125d05465ffc29efcab56fe4c8a5a219` | `39d4627c39ea27ad94cf38b8cb9514bc3b9cfdc2a19b1af12121ab1742ce0791` | `2febc8b72ece8cc1b0240544d0963fc1e2db4007e1daef0b5586deceadc02d13` |
| Test Runs | `4dcc608d34442439ef9f96fa5774ad27633df209de5c739d0049a9b7f5548936` | `a419c6b2e01142cf136ae64988fe2db481e1228c3163fc167c3daf29f209f5ea` | `7743831ab6f73f68df12192c40016476e9a818e9f624b4dbd7f7159829e24518` |

Desktop captures are exactly 1536x1024. Mobile captures are 390x844. The
capture script resets scroll position before every screen and uses the real
React implementation; no accepted concept image is loaded by the application.

## Review

| Area | Accepted intent | Implementation evidence | Result |
| --- | --- | --- | --- |
| Shell | Light audit shell, restrained chrome, three primary destinations | Shared top navigation, local-service state, safety notice, and persistent mobile gate status | Pass |
| Typography | Condensed technical labels paired with readable body text | Code-native typographic scale and uppercase metadata labels preserve hierarchy without raster text | Pass |
| Palette | Warm light workspace surrounding a dark technical theater, with red/amber/green state accents | Shared tokens reproduce the paper, graphite, blue, cyan, warning, failure, and pass families | Pass |
| Gate hierarchy | Feasibility result dominates each engineering decision | Summary leads with conclusion and gap; Workbench opens with a full-width gate ribbon; mobile retains gate state | Pass |
| Dark theater | High-density, cinematic technical core framed by audit rails | Summary energy pathway, Workbench cylinder/ledger/equations, and Test Runs comparison all occupy the visual center | Pass |
| Cylinder geometry | Layered cylinder cutaway linked to cycle state | React/SVG slider-crank piston, uniform single-zone fill, water-phase indication, and linked numeric readouts | Pass; intentionally schematic rather than photoreal |
| Model labeling | Avoid spatial/CFD implication | Visible “Single-zone state — schematic, not CFD.” label and semantic figure description | Pass |
| Plots | Compact scientific plots with synchronized cursors | Shared SVG chart system covers pressure, temperature, heat terms, retention/residuals, and P-V; keyboard cursor and tables are available | Pass |
| Evidence rails | Provenance and quality remain visible beside conclusions | Desktop evidence/quality rails, accessible tablet drawer, measured/literature/assumption tabs, and applicability notes | Pass |
| Control density | Workbench exposes inspectable parameters without generic card replacement | Scenario, loading, retention, geometry, combustion, heat recovery, uncertainty, and solver groups retain the accepted compact rail | Pass |
| Warning/status bands | Failures must be explicit and non-color-only | Icons, text, failure codes, suppressed-trace copy, data-quality state, and safety reference accompany color | Pass |
| Test-run provenance | Runs, calibration, status, and quality dominate the operator view | Three-column run list, selected provenance editor, measured/model comparison, quality checks, and disabled DAQ boundary | Pass |
| Responsive behavior | Desktop three-column; tablet evidence drawer; mobile sequential panels with persistent gate | CSS breakpoints collapse panels without horizontal overflow; tablet evidence control becomes a modal drawer; mobile gate remains fixed in the shell | Pass |
| Reduced motion | No continuous decorative motion; offer stepped state changes | `prefers-reduced-motion` disables interpolation/continuous playback behavior and uses stepped state presentation | Pass |
| Keyboard and focus | Full operation without a pointer | Roving tabs, visible focus, chart arrow keys, modal focus trap/return, skip link, confirmation dialog, and semantic controls | Pass |
| Screen-reader alternatives | Charts and schematic must be understandable without sight | Figure descriptions, live status, headings/landmarks, chart data tables, and non-color status text | Pass |

## Intentional deviations

- Scientific values are calculated by the local API or are explicitly labeled
  literature/synthetic fixtures. No illustrative concept number is copied.
- Evidence names and dates come from the model source ledger, not the concept
  artwork.
- The accepted cylinder’s cinematic depth is translated into layered SVG with
  a uniform 0D zone. No flame front, particle field, velocity field, contour,
  or other spatial-CFD implication is reproduced.
- Dense labels reflow rather than shrink below readable size. At mobile width,
  the screens become sequential panels instead of preserving desktop columns.
- The local-service notice is implementation state, not an invented scientific
  badge; it reports whether the localhost API is connected.

## Rejection checks

The reviewed captures contain no screenshot-backed UI, concept-number
leakage, hardware-control affordance, generated spatial field, missing 0D
label, mobile horizontal overflow, unreadable primary plot label, or generic
replacement dashboard. The browser suite separately verifies reduced-motion,
keyboard paths, focus containment/return, responsive operation, and complete
fail/pass/import/export workflows.
