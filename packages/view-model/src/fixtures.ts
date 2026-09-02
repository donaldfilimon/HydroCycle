import type {
  CycleView,
  EvidenceItem,
  SimulationView,
  TestRunView,
  TracePoint,
  WorkbenchInputs,
} from "./domain";

const WATER_VAPORIZATION_J_PER_G = 2_440;
const H2_LHV_J_PER_MG = 120;

const degrees = Array.from({ length: 73 }, (_, index) => -180 + index * 5);

function volumeAtAngle(angleDeg: number, displacementCm3 = 500, ratio = 10) {
  const clearance = displacementCm3 / (ratio - 1);
  const normalized = (1 - Math.cos((angleDeg * Math.PI) / 180)) / 2;
  return clearance + displacementCm3 * normalized;
}

function motoredPressure(angleDeg: number, volumeCm3: number) {
  const bdc = volumeAtAngle(-180);
  const compression = angleDeg <= 0;
  const exponent = compression ? 1.34 : 1.28;
  return Math.max(0.95, (bdc / volumeCm3) ** exponent);
}

function makeCycle(reactive: boolean): CycleView {
  const volumeCm3 = degrees.map((angle) => volumeAtAngle(angle));
  const pressureBar = degrees.map((angle, index) => {
    const motored = motoredPressure(angle, volumeCm3[index] ?? 500);
    if (!reactive) return motored;
    const combustion = 36 * Math.exp(-(((angle - 12) / 24) ** 2));
    return motored + combustion;
  });
  const temperatureK = degrees.map((angle, index) => {
    const motored = 298 * (pressureBar[index] ?? 1) ** 0.22;
    return reactive
      ? motored + 820 * Math.exp(-(((angle - 20) / 42) ** 2))
      : motored;
  });
  const heatReleaseJDeg = degrees.map((angle) =>
    reactive ? 32 * Math.exp(-(((angle - 8) / 22) ** 2)) : 0,
  );
  const wallHeatJDeg = degrees.map((angle) =>
    reactive ? -6 * Math.exp(-(((angle - 25) / 48) ** 2)) : -0.5,
  );
  const vaporizationJDeg = degrees.map((angle) =>
    reactive ? -3.2 * Math.exp(-(((angle + 5) / 40) ** 2)) : 0,
  );

  return {
    crankAngle: [...degrees],
    volumeCm3,
    pressureBar,
    temperatureK,
    heatReleaseJDeg,
    wallHeatJDeg,
    vaporizationJDeg,
    h2Mg: degrees.map(() => (reactive ? 18.5 : 0)),
    o2Mg: degrees.map((angle) =>
      Math.max(
        0,
        121 - (reactive ? 95 * Math.max(0, Math.min(1, (angle + 10) / 60)) : 0),
      ),
    ),
    n2Mg: degrees.map(() => 401),
    h2oVaporMg: degrees.map((angle) =>
      reactive ? 166 * Math.max(0, Math.min(1, (angle + 10) / 60)) : 0,
    ),
    waterLiquidMg: degrees.map(
      (angle) => 500 * Math.max(0, Math.min(1, (120 - angle) / 220)),
    ),
    waterVaporMg: degrees.map(
      (angle) => 500 * (1 - Math.max(0, Math.min(1, (120 - angle) / 220))),
    ),
    pressureLower95Bar: null,
    pressureUpper95Bar: null,
    temperatureLower95K: null,
    temperatureUpper95K: null,
    acceptedUncertaintySamples: null,
    energyConservationResidualFraction: reactive ? 0.0031 : 0,
    indicatedWorkJ: reactive ? 628 : 0,
    imepBar: reactive ? 12.6 : 0,
    upperBoundEfficiency: reactive ? 0.34 : 0,
    adiabaticTemperatureK: reactive ? 2_180 : 780,
    thermalNoxRisk: reactive ? "moderate" : "low",
  };
}

const evidence: EvidenceItem[] = [
  {
    id: "nist-henry-298",
    basis: "literature",
    title: "NIST Henry-law reference at 298.15 K",
    detail: "0.00078 mol H₂ per kg water per bar; about 1.57 mg H₂/L at 1 bar.",
    uncertainty: "moderate",
    applicability:
      "Dissolved-gas reference only. It is not a measurement of this sample.",
  },
  {
    id: "retention-assumption",
    basis: "user_assumption",
    title: "First-order retention estimate",
    detail: "72% retained at the intake in this default comparison.",
    uncertainty: "high",
    applicability:
      "Replace with a measured decay series before treating retention as evidence.",
  },
  {
    id: "geometry-synthetic",
    basis: "user_assumption",
    title: "Synthetic 0.5 L single-cylinder geometry",
    detail: "10:1 compression ratio and 1,500 rpm nominal operating point.",
    uncertainty: "moderate",
    applicability: "Demonstration geometry; no physical engine is asserted.",
  },
];

function hashFor(fixture: string, seed: number) {
  return `demo-${fixture}-${seed.toString(16).padStart(8, "0")}`;
}

export function makeSimulationFixture(
  fixture: SimulationView["fixture"],
  inputs: WorkbenchInputs,
): SimulationView {
  const literatureTotal = 1.57;
  const initialTotalMgL =
    fixture === "artificial-pass"
      ? (inputs.measuredTotalMgL ?? 62_000)
      : fixture === "water-injection"
        ? 1.9
        : (inputs.measuredTotalMgL ?? literatureTotal);
  const retainedMgL = initialTotalMgL * inputs.retentionFraction;
  const availableMg = retainedMgL * (inputs.carrierVolumeMlPerCycle / 1_000);
  const requiredMg = fixture === "water-injection" ? 0 : 17.1;
  const suppliedSeparateH2Mg = fixture === "water-injection" ? 18.5 : 0;
  const totalAvailableMg = availableMg + suppliedSeparateH2Mg;
  const waterG = inputs.carrierVolumeMlPerCycle;
  const hydrogenChemicalJ = totalAvailableMg * H2_LHV_J_PER_MG;
  const vaporizationJ =
    inputs.scenario === "upstream_vaporized_carrier"
      ? waterG * WATER_VAPORIZATION_J_PER_G
      : waterG * 0.2 * WATER_VAPORIZATION_J_PER_G;
  const sensibleHeatingJ = waterG * 4.18 * 75;
  const targetIndicatedWorkJ = 520;
  const energyMarginJ =
    hydrogenChemicalJ +
    inputs.recoveredHeatJ -
    vaporizationJ -
    sensibleHeatingJ -
    targetIndicatedWorkJ;
  const passed = totalAvailableMg >= requiredMg && energyMarginJ >= 0;
  const failures = [
    ...(totalAvailableMg < requiredMg ? (["insufficient_h2"] as const) : []),
    ...(energyMarginJ < 0 ? (["preheat_deficit"] as const) : []),
  ];

  return {
    id: null,
    fixture,
    label:
      fixture === "artificial-pass"
        ? "Artificial pass fixture — synthetic only"
        : fixture === "water-injection"
          ? "Separate H₂ fuel + water injection comparison"
          : "Ambient dissolved-H₂ literature preset",
    scenario:
      fixture === "water-injection"
        ? "hydrogen_fuel_with_water_injection"
        : inputs.scenario,
    measuredTotalMgL: inputs.measuredTotalMgL,
    sampleVolumeMlPerCycle: inputs.carrierVolumeMlPerCycle,
    loading: {
      mode: inputs.measuredTotalMgL === null ? "derived" : "measured_total",
      dissolvedMgL: inputs.measuredTotalMgL === null ? literatureTotal : 0,
      bubbleContainedMgL: inputs.measuredTotalMgL === null ? 0.03 : 0,
      initialTotalMgL,
      retainedMgL,
      releasedMgL: initialTotalMgL - retainedMgL,
      unaccountedMgL: 0,
      retentionFraction: inputs.retentionFraction,
      intervalMgL: {
        low: initialTotalMgL * 0.78,
        high: initialTotalMgL * 1.22,
      },
    },
    gate: {
      passed,
      failures,
      hydrogenAvailableMg: totalAvailableMg,
      hydrogenRequiredMg: requiredMg,
      hydrogenMarginMg: totalAvailableMg - requiredMg,
      energyMarginJ,
      energyTerms: {
        hydrogenChemicalJ,
        sensibleHeatingJ,
        vaporizationJ,
        recoveredHeatJ: inputs.recoveredHeatJ,
        wallLossJ: passed ? 170 : 0,
        targetIndicatedWorkJ,
      },
      massBalanceResidualMg: 0,
      domainWarnings: [],
    },
    motoredBaseline: makeCycle(false),
    proposedCycle: passed ? makeCycle(true) : null,
    pressureInterval: { low: 0.92, high: 1.08 },
    sensitivities: [
      {
        label: "Total H₂ loading",
        normalized: 1,
        direction: "positive",
      },
      {
        label: "Retention at intake",
        normalized: 0.73,
        direction: "positive",
      },
      {
        label: "Carrier volume",
        normalized: 0.61,
        direction: "negative",
      },
      {
        label: "Recovered heat",
        normalized: 0.44,
        direction: "positive",
      },
    ],
    evidence: evidence.map((item) => ({ ...item })),
    diagnostics: [
      "Frontend fixture is deterministic and clearly synthetic.",
      "Run the local model service for authoritative Cantera-backed results.",
    ],
    seed: inputs.seed,
    modelVersion: "frontend-fixture-v1",
    resultHash: hashFor(fixture, inputs.seed),
  };
}

export const demoRuns: TestRunView[] = [
  {
    id: "synthetic-003",
    name: "Synthetic-003",
    status: "needs_review",
    synthetic: true,
    updatedAt: "2026-08-22T15:18:00Z",
    timestamp: "2026-08-22T15:18:00Z",
    totalH2MgL: 2.04,
    retainedH2MgL: 1.49,
    retentionFraction: 0.73,
    operator: "Demo operator",
    sampleId: "DEMO-SAMPLE-003",
    method: "Synthetic headspace-GC series",
    calibrationReference: "DEMO-CAL-003",
    provenance: {
      source: "bundled demo fixture",
      method: "Synthetic headspace-GC series",
      ui_origin: "HydroCycle demo data",
      import_sha256: null,
      source_test_run_id: null,
      is_demo_synthetic: true,
    },
    calibrationReferences: [
      {
        id: "DEMO-CAL-003",
        instrument: "synthetic demo instrument",
        method: "Synthetic headspace-GC series",
        applies_to: ["hydrogen_decay.csv"],
      },
    ],
    comparisons: { items: [] },
    testRunEvidence: [],
    temperatureC: 24.1,
    pressureKpa: 100.8,
    elapsedS: 1_800,
    bubbleDiameterNm: 210,
    numberPerMl: 860_000,
    reviewNotes:
      "Synthetic example: replicate measurement is intentionally absent.",
    releasedH2MgL: 0.48,
    unaccountedH2MgL: 0.07,
    standardUncertainty: {
      totalH2MgL: 0.08,
      retainedH2MgL: 0.07,
      retentionFraction: 0.04,
      temperatureC: 0.2,
      pressureKpa: 0.3,
      elapsedS: 1,
      bubbleDiameterNm: 15,
      numberPerMl: 60_000,
      releasedH2MgL: 0.05,
      unaccountedH2MgL: 0.03,
    },
    hydrogenDecaySeries: Array.from({ length: 11 }, (_, index) => ({
      timeS: index * 180,
      totalH2MgL: 2.04 * Math.exp(-(index * 180) / 5_700),
      uncertaintyMgL: 0.08,
    })),
    bubbleDistribution: null,
    pressureTrace: null,
    attachmentHashes: [],
    simulationIds: [],
    measurementDatasetCount: 0,
    persisted: false,
  },
  {
    id: "synthetic-002",
    name: "Synthetic-002",
    status: "valid",
    synthetic: true,
    updatedAt: "2026-08-21T18:44:00Z",
    timestamp: "2026-08-21T18:44:00Z",
    totalH2MgL: 1.81,
    retainedH2MgL: 1.21,
    retentionFraction: 0.67,
    operator: "Demo operator",
    sampleId: "DEMO-SAMPLE-002",
    method: "Synthetic headspace-GC series",
    calibrationReference: "DEMO-CAL-002",
    provenance: {
      source: "bundled demo fixture",
      method: "Synthetic headspace-GC series",
      ui_origin: "HydroCycle demo data",
      import_sha256: null,
      source_test_run_id: null,
      is_demo_synthetic: true,
    },
    calibrationReferences: [
      {
        id: "DEMO-CAL-002",
        instrument: "synthetic demo instrument",
        method: "Synthetic headspace-GC series",
        applies_to: ["hydrogen_decay.csv"],
      },
    ],
    comparisons: { items: [] },
    testRunEvidence: [],
    temperatureC: 25.0,
    pressureKpa: 101.1,
    elapsedS: 1_500,
    bubbleDiameterNm: 170,
    numberPerMl: 720_000,
    reviewNotes: "Synthetic reviewed example.",
    releasedH2MgL: 0.55,
    unaccountedH2MgL: 0.05,
    standardUncertainty: {
      totalH2MgL: 0.07,
      retainedH2MgL: 0.06,
      retentionFraction: 0.04,
      temperatureC: 0.2,
      pressureKpa: 0.3,
      elapsedS: 1,
      bubbleDiameterNm: 12,
      numberPerMl: 50_000,
      releasedH2MgL: 0.05,
      unaccountedH2MgL: 0.03,
    },
    hydrogenDecaySeries: Array.from({ length: 9 }, (_, index) => ({
      timeS: index * 187.5,
      totalH2MgL: 1.81 * Math.exp(-(index * 187.5) / 3_750),
      uncertaintyMgL: 0.07,
    })),
    bubbleDistribution: null,
    pressureTrace: null,
    attachmentHashes: [],
    simulationIds: [],
    measurementDatasetCount: 0,
    persisted: false,
  },
  {
    id: "synthetic-001",
    name: "Synthetic-001",
    status: "invalid",
    synthetic: true,
    updatedAt: "2026-08-20T13:02:00Z",
    timestamp: "2026-08-20T13:02:00Z",
    totalH2MgL: 1.62,
    retainedH2MgL: null,
    retentionFraction: null,
    operator: "Demo operator",
    sampleId: "DEMO-SAMPLE-001",
    method: null,
    calibrationReference: null,
    provenance: {
      source: "bundled demo fixture",
      method: null,
      ui_origin: "HydroCycle demo data",
      import_sha256: null,
      source_test_run_id: null,
      is_demo_synthetic: true,
    },
    calibrationReferences: [],
    comparisons: { items: [] },
    testRunEvidence: [],
    temperatureC: 25.3,
    pressureKpa: 101.0,
    elapsedS: null,
    bubbleDiameterNm: null,
    numberPerMl: null,
    reviewNotes:
      "Synthetic invalid example: missing calibration and retention series.",
    releasedH2MgL: null,
    unaccountedH2MgL: null,
    standardUncertainty: {
      totalH2MgL: 0.08,
      retainedH2MgL: null,
      retentionFraction: null,
      temperatureC: 0.2,
      pressureKpa: 0.3,
      elapsedS: null,
      bubbleDiameterNm: null,
      numberPerMl: null,
      releasedH2MgL: null,
      unaccountedH2MgL: null,
    },
    hydrogenDecaySeries: null,
    bubbleDistribution: null,
    pressureTrace: null,
    attachmentHashes: [],
    simulationIds: [],
    measurementDatasetCount: 0,
    persisted: false,
  },
];

export function makeRetentionTrace(run: TestRunView): {
  measured: TracePoint[];
  modeled: TracePoint[];
} {
  const measured = (run.hydrogenDecaySeries ?? []).map((point) => ({
    x: point.timeS,
    value: point.totalH2MgL,
    low: Math.max(0, point.totalH2MgL - 1.96 * point.uncertaintyMgL),
    high: point.totalH2MgL + 1.96 * point.uncertaintyMgL,
  }));
  if (
    run.totalH2MgL === null ||
    run.retainedH2MgL === null ||
    run.elapsedS === null ||
    run.elapsedS <= 0 ||
    run.totalH2MgL <= 0 ||
    run.retainedH2MgL <= 0 ||
    run.retainedH2MgL > run.totalH2MgL
  ) {
    return { measured, modeled: [] };
  }
  const initial = run.totalH2MgL;
  const retained = run.retainedH2MgL;
  const duration = run.elapsedS;
  const decay = -Math.log(retained / initial);
  const modeled = Array.from({ length: 31 }, (_, index) => {
    const x = (duration * index) / 30;
    return {
      x,
      value:
        decay === 0 ? initial : initial * Math.exp((-x * decay) / duration),
    };
  });
  return { measured, modeled };
}
