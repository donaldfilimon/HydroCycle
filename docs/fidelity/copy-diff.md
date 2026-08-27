# Above-the-fold copy review

This review protects the accepted information hierarchy while enforcing the
scientific contract. A concept label is retained when it is factual and
product-defining. Illustrative concept data is replaced by calculated,
source-ledger, literature-preset, or explicitly synthetic content.

## Shared shell

| Locked intent | Implemented copy | Result |
| --- | --- | --- |
| Product identity | `HydroCycle` | Exact |
| Primary views | `Summary`, `Workbench`, `Test Runs` | Exact |
| Persistent safety framing | `Simulation only — not validated for engine control.` and gate status text | Preserved with model-specific wording |

## Summary

| Locked intent | Implemented copy | Result |
| --- | --- | --- |
| Lead with the conclusion | Dynamic direct conclusion driven by `gate.passed` | Preserved; no hard-coded outcome |
| Show the decisive gate | `Feasibility gate` with `Pass` or `Failed` | Preserved |
| Explain suppression | `Energy and hydrogen gap prevents combustion evaluation. The proposed reactive trace is null.` | Scientific clarification |
| Lead into analysis | `Open in Workbench` | Preserved |
| Make evidence quality visible | `Evidence quality`, split into `Selected Test Run measurements`, `Global literature ledger`, and `Current model assumptions` | Preserved and scope-clarified |
| Separate loading, retention, and cycle questions | Model-answer rows for loading, retention, and cycle | Preserved with API-derived answers |

## Workbench

| Locked intent | Implemented copy | Result |
| --- | --- | --- |
| Gate dominates the screen | `Mass & energy gate` ribbon, required/available H2, energy burden, and stable failure codes | Preserved and strengthened |
| Expose model inputs | `Model parameters` rail with scenario, loading, retention, engine, combustion, heat recovery, and uncertainty groups | Preserved |
| Identify visual scope | `Single-zone state — schematic, not CFD.` | Exact locked model label |
| Keep energy accounting visible | `Energy balance` with combustion, pressure-volume work, wall loss, and vaporization terms | Preserved |
| Suppress impossible output | `Proposed reactive trace is null because the feasibility gate failed.` | Scientific clarification |
| Preserve evidence hierarchy | `Measured`, `Literature`, and `Assumptions` tabs | Preserved |
| Avoid calibrated emissions claims | Relative `Thermal-NOx risk` only | Scientific substitution |

## Test Runs

| Locked intent | Implemented copy | Result |
| --- | --- | --- |
| Operator workspace | Run list, selected run provenance, status, measurements, comparison, and review fields | Preserved |
| Comparison theater | `Measured vs. modeled` | Exact |
| Prevent synthetic-data ambiguity | `Demo / synthetic` and `Synthetic measured demo` | Explicitly strengthened |
| Keep data quality visible | `Data quality` checks and run state (`draft`, `needs review`, `valid`, `invalid`) | Preserved |
| Preserve future DAQ boundary | `Live DAQ connector` and `Read-only interface reserved for a later validated phase.` | Exact locked boundary |
| Prevent CFD overclaim | `Single-zone schematic, not CFD.` | Preserved |

## Leakage audit

- No illustrative measurement, test date, calibration name, operator name,
  source name, citation, threshold, or synthetic run value from the concepts is
  present in model fixtures or UI defaults.
- The default 0.5 L single-cylinder geometry is labeled synthetic.
- The ambient-pressure comparison preset is labeled literature, not measured.
- The artificial pass preset is visibly synthetic and exists only to prove the
  gated reactive-cycle path is reachable.
- Measured total-H2 fields remain nullable and replace the derived total when
  populated.
- All rendered scientific values originate from the API response, a named
  literature preset, or a visibly synthetic demonstration fixture.
