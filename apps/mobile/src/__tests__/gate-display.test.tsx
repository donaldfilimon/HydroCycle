import { render, screen } from "@testing-library/react-native";

import { GateCard } from "../screens/SummaryScreen";

import type { components } from "@hydrocycle/contracts";

type ApiSimulationResult = components["schemas"]["SimulationResult"];

/**
 * `visibleFailureCodes` is unit-tested in `format.test.ts`; this pins that
 * GateCard actually routes through it. The bug this replaces shipped green —
 * typecheck, lint, and 28 tests all passed while a PASSED badge rendered a red
 * "Pass" bullet underneath it, because the service reports `failures: ["pass"]`
 * on success and live verification had only ever exercised the failing path.
 */

function gateResult(passed: boolean, failures: string[]): ApiSimulationResult {
  return {
    gate: {
      passed,
      failures,
      hydrogen_available: { value: 1, unit: "mg/cycle" },
      hydrogen_required: { value: 1, unit: "mg/cycle" },
      hydrogen_mass_margin_mg_per_cycle: 0,
    },
    proposed_cycle: null,
  } as unknown as ApiSimulationResult;
}

describe("GateCard failure bullets", () => {
  it("renders no failure bullet when the gate passes", () => {
    render(<GateCard result={gateResult(true, ["pass"])} />);

    expect(screen.getByText("PASSED")).toBeTruthy();
    expect(screen.queryByText(/•/)).toBeNull();
  });

  it("still renders real failure codes when the gate fails", () => {
    render(<GateCard result={gateResult(false, ["insufficient_h2"])} />);

    expect(screen.getByText("FAILED")).toBeTruthy();
    expect(screen.getByText(/Insufficient/i)).toBeTruthy();
  });

  it("drops only the sentinel, never a genuine code beside it", () => {
    render(<GateCard result={gateResult(false, ["pass", "preheat_deficit"])} />);

    expect(screen.getByText(/Preheat/i)).toBeTruthy();
    expect(screen.queryByText(/•\s*Pass$/)).toBeNull();
  });

  it("states the invariant-1 negative whenever no cycle is proposed", () => {
    render(<GateCard result={gateResult(true, ["pass"])} />);

    expect(
      screen.getByText(/No proposed reactive cycle — motored baseline only\./),
    ).toBeTruthy();
  });
});
