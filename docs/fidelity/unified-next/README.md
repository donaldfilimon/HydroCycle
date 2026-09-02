# Unified Next visual fidelity ledger

Reviewed on 2026-09-02 against the accepted concepts in
`docs/design/unified-next/` and the legacy hierarchy references in
`docs/design/`.

## Captured implementation evidence

Each route is captured from the same local Next source at native desktop,
intermediate tablet, and Pixel 7 CSS dimensions:

- `summary-1536x1024.png`, `summary-1024x768.png`, and
  `summary-pixel-7.png`
- `workbench-1536x1024.png`, `workbench-1024x768.png`, and
  `workbench-pixel-7.png`
- `test-runs-1536x1024.png`, `test-runs-1024x768.png`, and
  `test-runs-pixel-7.png`

## Resolved comparisons

1. **Shell and brand:** the evolved code-native wave, obsidian navigation,
   monospace instrument labels, cobalt focus color, and compact status rail
   match the accepted system. The implementation uses SVG/CSS rather than
   raster engine decoration.
2. **Summary decision aperture:** gate, conclusion, provenance warning, energy
   horizon, four evidence domains, and route actions retain the approved
   hierarchy. The adjacent semantic energy table is intentionally more explicit
   than the concept so the chart-like chain is accessible without vision.
3. **Workbench instrument:** the dark three-rail desktop composition, central
   homogeneous cylinder, pressure/temperature/net-heat/P-V traces, frozen input
   set, and failed-gate phase are preserved. Displayed values come from the
   canonical contract or fixture rather than the artwork.
4. **Test Runs ledger:** desktop retains a dense sortable evidence table,
   selected-run detail, provenance, and the dark comparison deck. Mobile uses
   labeled run cards instead of forcing the desktop table beyond the viewport;
   comparison selection and all actions remain available.
5. **Advisor behavior:** desktop keeps the read-only evidence lens beside the
   active route. At mobile width it is an explicit disclosure so it cannot hide
   primary evidence on first load; opening it presents the approved bottom-sheet
   treatment. All accepted text is schema- and policy-validated before display.
6. **Responsive hierarchy:** the desktop rail becomes a fixed three-item mobile
   navigation, Workbench becomes a sequential instrument, and Summary stacks
   aperture, evidence chain, semantic table, domains, and actions without page
   overflow.
7. **Scientific semantics:** failed gates are visibly motored-only, missing
   values remain `Missing`, numeric zero remains numeric, water is described only
   as carrier/diluent/thermal load, and no flame fronts, CFD fields, or hardware
   control affordances were introduced.

## Intentional differences from concept artwork

- Illustrative concept numbers, run identifiers, dates, and small labels were
  replaced by current contract-backed data or deterministic fixtures.
- The mobile Test Runs concept shows a very wide ledger; the implementation
  uses semantic cards at the narrow breakpoint for legibility and keyboard/touch
  reach while retaining the full semantic table at tablet and desktop widths.
- The mobile advisor is closed on initial load. This prevents a fixed sheet from
  obscuring the decision aperture, operating point, or ledger and still matches
  the concept once the user invokes **Ask advisor**.
- The Workbench chamber is a restrained homogeneous single-zone wireframe. The
  implementation deliberately omits decorative flames, gradients that imply
  spatial physics, particle paths, and CFD-like contours.

## Above-the-fold copy check

- Summary: `SUMMARY`, `Evidence-Gated Feasibility`, `GATE FAILED`,
  `MOTORED BASELINE ONLY`, and the evidence-insufficiency conclusion match the
  approved meaning.
- Workbench: `WORKBENCH`, `0D SINGLE-ZONE`, the hydrogen/water truth statement,
  and `FAILED / MOTORED-ONLY` are visible without scrolling.
- Test Runs: `TEST RUNS / LEDGER`, filters, primary evidence actions, run count,
  and the first selected record are visible without scrolling.

No unresolved fidelity defect remains in the captured desktop, tablet, or
Pixel 7 reference set.
