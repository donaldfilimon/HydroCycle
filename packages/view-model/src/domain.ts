import type { components } from "@hydrocycle/contracts";

export type Screen = "summary" | "workbench" | "test-runs";

export type Scenario =
  "upstream_vaporized_carrier" | "hydrogen_fuel_with_water_injection";

export type EvidenceBasis =
  "measured" | "literature" | "user_assumption" | "derived" | "synthetic";

export type GateFailure =
  | "invalid_data"
  | "mass_balance_failed"
  | "insufficient_h2"
  | "preheat_deficit"
  | "outside_model_domain";

export interface Interval {
  low: number;
  high: number;
}

export interface TracePoint {
  x: number;
  value: number;
  low?: number;
  high?: number;
}

export interface EvidenceItem {
  id: string;
  basis: EvidenceBasis;
  title: string;
  detail: string;
  uncertainty: "low" | "moderate" | "high";
  applicability: string;
}

export interface EnergyTerms {
  hydrogenChemicalJ: number;
  sensibleHeatingJ: number;
  vaporizationJ: number;
  recoveredHeatJ: number;
  wallLossJ: number;
  targetIndicatedWorkJ: number;
}

export interface GateView {
  passed: boolean;
  failures: GateFailure[];
  hydrogenAvailableMg: number | null;
  hydrogenRequiredMg: number | null;
  hydrogenMarginMg: number;
  energyMarginJ: number;
  energyTerms: EnergyTerms;
  massBalanceResidualMg: number;
  domainWarnings: string[];
}

export interface LoadingView {
  mode: "measured_total" | "derived";
  dissolvedMgL: number | null;
  bubbleContainedMgL: number | null;
  initialTotalMgL: number | null;
  retainedMgL: number | null;
  releasedMgL: number | null;
  unaccountedMgL: number | null;
  retentionFraction: number | null;
  intervalMgL: Interval | null;
}

export interface CycleView {
  crankAngle: number[];
  volumeCm3: number[];
  pressureBar: number[];
  temperatureK: number[];
  heatReleaseJDeg: number[];
  wallHeatJDeg: number[];
  vaporizationJDeg: number[];
  h2Mg: number[];
  o2Mg: number[];
  n2Mg: number[];
  h2oVaporMg: number[];
  waterLiquidMg: number[];
  waterVaporMg: number[];
  pressureLower95Bar: number[] | null;
  pressureUpper95Bar: number[] | null;
  temperatureLower95K: number[] | null;
  temperatureUpper95K: number[] | null;
  acceptedUncertaintySamples: number | null;
  energyConservationResidualFraction: number;
  indicatedWorkJ: number;
  imepBar: number;
  upperBoundEfficiency: number | null;
  adiabaticTemperatureK: number | null;
  thermalNoxRisk: "low" | "moderate" | "high" | "not_applicable";
}

export interface SensitivityItem {
  label: string;
  normalized: number;
  direction: "positive" | "negative";
}

export interface SimulationView {
  id: string | null;
  fixture: "literature" | "artificial-pass" | "water-injection";
  label: string;
  scenario: Scenario;
  measuredTotalMgL: number | null;
  sampleVolumeMlPerCycle: number | null;
  loading: LoadingView;
  gate: GateView;
  motoredBaseline: CycleView;
  proposedCycle: CycleView | null;
  pressureInterval: Interval;
  sensitivities: SensitivityItem[];
  evidence: EvidenceItem[];
  diagnostics: string[];
  seed: number;
  modelVersion: string;
  resultHash: string;
}

export type TestRunStatus = "draft" | "needs_review" | "valid" | "invalid";

export interface TestRunMeasurementUncertainty {
  totalH2MgL: number | null;
  retainedH2MgL: number | null;
  retentionFraction: number | null;
  temperatureC: number | null;
  pressureKpa: number | null;
  elapsedS: number | null;
  bubbleDiameterNm: number | null;
  numberPerMl: number | null;
  releasedH2MgL: number | null;
  unaccountedH2MgL: number | null;
}

export interface TestRunView {
  id: string;
  name: string;
  status: TestRunStatus;
  synthetic: boolean;
  timestamp: string;
  totalH2MgL: number | null;
  retainedH2MgL: number | null;
  retentionFraction: number | null;
  operator: string | null;
  sampleId: string | null;
  method: string | null;
  calibrationReference: string | null;
  provenance: components["schemas"]["TestRunProvenance"];
  calibrationReferences: components["schemas"]["CalibrationReference"][];
  comparisons: components["schemas"]["ComparisonCollection"];
  testRunEvidence: components["schemas"]["EvidenceInput"][];
  temperatureC: number | null;
  pressureKpa: number | null;
  elapsedS: number | null;
  bubbleDiameterNm: number | null;
  numberPerMl: number | null;
  reviewNotes: string | null;
  releasedH2MgL: number | null;
  unaccountedH2MgL: number | null;
  standardUncertainty: TestRunMeasurementUncertainty;
  hydrogenDecaySeries: HydrogenDecayPoint[] | null;
  bubbleDistribution: BubbleDistributionPoint[] | null;
  pressureTrace: PressureTracePoint[] | null;
  attachmentHashes: string[];
  simulationIds: string[];
  measurementDatasetCount: number;
  persisted: boolean;
  /** Original typed ledger retained so edits do not erase unsupported evidence. */
  sourceMeasurements?: components["schemas"]["TestRunMeasurements"];
}

export interface HydrogenDecayPoint {
  timeS: number;
  totalH2MgL: number;
  uncertaintyMgL: number;
}

export interface BubbleDistributionPoint {
  diameterNm: number;
  numberPerMl: number;
}

export interface PressureTracePoint {
  crankAngleDeg: number;
  pressureBar: number;
  uncertaintyBar: number;
}

export interface WorkbenchInputs {
  fixture: SimulationView["fixture"];
  scenario: Scenario;
  waterTemperatureC: number;
  systemPressureBar: number;
  hydrogenHeadspaceMoleFraction: number;
  henryModelRelativeUncertainty: number;
  measuredTotalMgL: number | null;
  carrierVolumeMlPerCycle: number;
  bubbleDiameterNm: number;
  bubbleCountPerMl: number;
  bubbleModelRelativeUncertainty: number;
  retentionFraction: number;
  displacementL: number;
  compressionRatio: number;
  speedRpm: number;
  equivalenceRatio: number;
  sparkTimingDeg: number;
  recoveredHeatJ: number;
  measuredTotalUncertaintyMgL: number;
  measuredTotalSourceId: string;
  retentionStandardUncertainty: number;
  recoveredHeatUncertaintyJ: number;
  recoveredHeatSourceId: string;
  seed: number;
  cycleSamples: number;
}

export const DEFAULT_INPUTS: WorkbenchInputs = {
  fixture: "literature",
  scenario: "upstream_vaporized_carrier",
  waterTemperatureC: 25,
  systemPressureBar: 1,
  hydrogenHeadspaceMoleFraction: 1,
  henryModelRelativeUncertainty: 0.15,
  measuredTotalMgL: null,
  carrierVolumeMlPerCycle: 0.5,
  bubbleDiameterNm: 180,
  bubbleCountPerMl: 1_000_000,
  bubbleModelRelativeUncertainty: 0.75,
  retentionFraction: 0.72,
  displacementL: 0.5,
  compressionRatio: 10,
  speedRpm: 1500,
  equivalenceRatio: 1,
  sparkTimingDeg: -10,
  recoveredHeatJ: 0,
  measuredTotalUncertaintyMgL: 0,
  measuredTotalSourceId: "",
  retentionStandardUncertainty: 0.15,
  recoveredHeatUncertaintyJ: 0,
  recoveredHeatSourceId: "",
  seed: 42_617,
  cycleSamples: 64,
};
