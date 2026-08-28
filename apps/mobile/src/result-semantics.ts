import type { ApiSimulationResult } from "./api";

export type ApiCycleTrace = ApiSimulationResult["motored_baseline"];

/**
 * Returns the reactive trace only when the feasibility gate passed.
 *
 * The model service already enforces this relationship, but the mobile
 * renderer keeps the same boundary at its trust edge. A stale or malformed
 * response must never make a failed gate look like a proposed reactive cycle.
 */
export function proposedCycleForDisplay(
  result: ApiSimulationResult,
): ApiCycleTrace | null {
  return result.gate.passed === true ? result.proposed_cycle : null;
}
