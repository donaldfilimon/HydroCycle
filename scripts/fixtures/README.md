# CAD adapter test fixture

`cad-model-result.json` is a synthetic model result generated from
`SimulationInput()` with uncertainty propagation disabled, using the existing
Python `run_simulation` entry point on 2026-09-29. It retains model metadata,
feasibility accounting, and every twentieth motored sample plus the final sample.
Unused result fields are omitted. The result ID is a test label.

It is test data, not an apparatus measurement, calibrated result, or evidence
that the CAD reference geometry is feasible. The CAD document does not bundle
or automatically load it. Production imports use the same SimulationResult
fields and preserve missing ledger quantities as null.
