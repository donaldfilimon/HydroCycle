import {
  proposedCycleForDisplay,
  type ApiSimulationResult,
} from "@hydrocycle/view-model";

function result(
  passed: boolean,
  proposedCycle: ApiSimulationResult["proposed_cycle"],
): ApiSimulationResult {
  return {
    gate: { passed },
    proposed_cycle: proposedCycle,
  } as ApiSimulationResult;
}

describe("invariant 1: failed gates are motored-only", () => {
  const trace = {
    crank_angle_deg: [-180, 0, 180],
    pressure_pa: [100_000, 2_000_000, 100_000],
    temperature_k: [300, 600, 300],
  } as ApiSimulationResult["motored_baseline"];

  it("withholds a reactive trace from an inconsistent failed response", () => {
    expect(proposedCycleForDisplay(result(false, trace))).toBeNull();
  });

  it("returns a reactive trace only after a passing gate", () => {
    expect(proposedCycleForDisplay(result(true, trace))).toBe(trace);
  });

  it("preserves a missing reactive trace as null", () => {
    expect(proposedCycleForDisplay(result(true, null))).toBeNull();
  });
});
