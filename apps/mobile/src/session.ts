import type { WorkbenchInputs } from "@hydrocycle/view-model";

import type { ApiSimulationResult } from "./api";

export interface SimulationSession {
  result: ApiSimulationResult;
  source: "canonical_fixture" | "workbench";
  linkedTestRunId: string | null;
  inputs: WorkbenchInputs | null;
}
