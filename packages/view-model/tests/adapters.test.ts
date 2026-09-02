import { describe, expect, it } from "vitest";

import {
  DEFAULT_INPUTS,
  hasRecordedMeasurements,
  makeSimulationFixture,
  mapApiSimulationResult,
  mapApiTestRun,
  mayContributeMeasurementEvidence,
  measurementDatasetCount,
  proposedCycleForDisplay,
  simulationRequest,
  testRunPatchPayload,
  testRunPayload,
  type ApiSimulationResult,
  type ApiTestRunDocument,
} from "../src";

function simulationResult(
  passed: boolean,
  proposedCycle: ApiSimulationResult["proposed_cycle"],
): ApiSimulationResult {
  return {
    gate: { passed },
    proposed_cycle: proposedCycle,
  } as ApiSimulationResult;
}

const trace = {
  crank_angle_deg: [-180, 0, 180],
  pressure_pa: [100_000, 2_000_000, 100_000],
  temperature_k: [300, 600, 300],
} as ApiSimulationResult["motored_baseline"];

function testRunDocument(): ApiTestRunDocument {
  return {
    id: "run-provenance-1",
    name: "Imported provenance run",
    status: "draft",
    operator: "Operator One",
    sample_id: "SAMPLE-42",
    notes: "Preserve this review note",
    is_demo_synthetic: false,
    provenance: {
      source: "canonical JSON import",
      method: "headspace GC method",
      ui_origin: "import endpoint",
      import_sha256: "a".repeat(64),
      source_test_run_id: "source-run-7",
      is_demo_synthetic: false,
    },
    measurements: {
      total_h2_mg_l: {
        value: 2.1,
        unit: "mg/L",
        standard_uncertainty: 0.08,
        distribution: "normal",
        source_id: "CAL-IDENTITY",
        basis: "measured",
      },
      retained_h2_mg_l: null,
      temperature_k: null,
      "bubble_distribution.csv": [
        { diameter_nm: 120, number_per_mL: 3_000_000 },
        { diameter_nm: 220, number_per_mL: 800_000 },
      ],
    },
    calibration_references: [
      {
        id: "CAL-IDENTITY",
        instrument: "GC fixture",
        method: "method text distinct from identity",
        applies_to: [],
        notes: "Preserve calibration metadata",
      },
      {
        id: "CAL-SECONDARY",
        instrument: "temperature fixture",
        method: "secondary method",
        applies_to: [],
      },
    ],
    comparisons: {
      items: [
        {
          id: "comparison-1",
          kind: "retention",
          label: "Measured/model comparison",
          measured_value: 0.7,
          modeled_value: 0.68,
          unit: "fraction",
        },
      ],
    },
    attachments: [],
    simulation_ids: ["b".repeat(64)],
    evidence: [
      {
        id: "evidence-1",
        created_at: "2026-08-24T12:00:00Z",
        kind: "measured",
        title: "Local headspace result",
        author_or_publisher: "HydroCycle fixture",
        publication_date: "2026-08-24",
        url: "https://example.com/method",
        method: "headspace GC",
        value_or_range: "2.1",
        unit: "mg/L",
        uncertainty: "0.08 mg/L standard uncertainty",
        applicability_note: "Applies to sample SAMPLE-42 only.",
      },
    ],
    created_at: "2026-08-24T12:00:00Z",
    updated_at: "2026-08-24T12:30:00Z",
  };
}

describe("simulation result adapter", () => {
  it("suppresses a proposed cycle when the gate failed", () => {
    expect(proposedCycleForDisplay(simulationResult(false, trace))).toBeNull();
    expect(proposedCycleForDisplay(simulationResult(true, trace))).toBe(trace);
    expect(proposedCycleForDisplay(simulationResult(true, null))).toBeNull();
  });

  it("preserves absent scientific quantities as null instead of fixture zeros", () => {
    const cycle = {
      crank_angle_deg: [0],
      volume_m3: [0.0005],
      pressure_pa: [100_000],
      temperature_k: [300],
      cumulative_heat_release_j: [0],
      cumulative_wall_heat_loss_j: [0],
      cumulative_vaporization_heat_j: [0],
      h2_mg: [0],
      o2_mg: [0],
      n2_mg: [0],
      h2o_vapor_mg: [0],
      water_liquid_mg: [0],
      water_vapor_mg: [0],
      energy_conservation_residual_fraction: 0,
      pv_work_j: 0,
      imep_bar: 0,
      upper_bound_indicated_efficiency: null,
      adiabatic_flame_temperature_k: null,
      relative_thermal_nox_risk: "not_applicable",
    };
    const quantity = { value: null, standard_uncertainty: 0 };
    const raw = {
      result_id: "null-result",
      input: { scenario: "upstream_vaporized_carrier", sample: {} },
      loading: {
        mode: "measured_total",
        total_h2_mg_l: quantity,
        dissolved_h2_mg_l: quantity,
        bubble_contained_h2_mg_l: quantity,
      },
      retention: {
        initial_total_h2_mg_l: quantity,
        retained_at_intake_mg_l: quantity,
        released_h2_mg_l: quantity,
        unaccounted_h2_mg_l: quantity,
        retained_fraction: quantity,
      },
      gate: {
        passed: false,
        failures: ["invalid_data"],
        hydrogen_required: quantity,
        hydrogen_available: quantity,
        hydrogen_mass_margin_mg_per_cycle: 0,
        energy_terms: {
          usable_energy_margin_j: 0,
          hydrogen_chemical_energy_j: 0,
          water_sensible_heating_j: 0,
          water_phase_change_j: 0,
          heat_recovery_j: 0,
          estimated_wall_loss_j: 0,
          target_indicated_work_j: 0,
        },
        mass_balance: { residual_h2_mg_per_cycle: 0 },
        domain_warnings: [],
      },
      motored_baseline: cycle,
      proposed_cycle: null,
      uncertainty: { sensitivities: [] },
      evidence: [],
      diagnostics: [],
      reproducibility: { random_seed: 42, model_version: "test" },
    } as unknown as ApiSimulationResult;

    const mapped = mapApiSimulationResult(
      makeSimulationFixture("literature", DEFAULT_INPUTS),
      raw,
    );

    expect(mapped.loading.initialTotalMgL).toBeNull();
    expect(mapped.loading.dissolvedMgL).toBeNull();
    expect(mapped.loading.retainedMgL).toBeNull();
    expect(mapped.loading.intervalMgL).toBeNull();
    expect(mapped.gate.hydrogenAvailableMg).toBeNull();
    expect(mapped.motoredBaseline.upperBoundEfficiency).toBeNull();
  });
});

describe("Test Run adapter", () => {
  it("preserves null measurements and counts only populated datasets", () => {
    const document = testRunDocument();
    const view = mapApiTestRun(document);

    expect(view.retainedH2MgL).toBeNull();
    expect(view.temperatureC).toBeNull();
    expect(measurementDatasetCount(document.measurements)).toBe(2);
    expect(view.measurementDatasetCount).toBe(2);
    expect(hasRecordedMeasurements(document)).toBe(true);
    expect(
      hasRecordedMeasurements({
        ...document,
        measurements: {
          total_h2_mg_l: null,
          "bubble_distribution.csv": [],
        },
      }),
    ).toBe(false);
  });

  it("round-trips identity and provenance through create and PATCH payloads", () => {
    const view = mapApiTestRun(testRunDocument());

    expect(view.sampleId).toBe("SAMPLE-42");
    expect(view.calibrationReference).toBe("CAL-IDENTITY");
    expect(view.provenance.import_sha256).toBe("a".repeat(64));
    expect(view.calibrationReferences).toHaveLength(2);
    expect(view.comparisons.items).toHaveLength(1);
    expect(view.testRunEvidence).toHaveLength(1);
    expect(view.bubbleDistribution).toEqual([
      { diameterNm: 120, numberPerMl: 3_000_000 },
      { diameterNm: 220, numberPerMl: 800_000 },
    ]);

    const createPayload = testRunPayload(view);
    expect(createPayload.sample_id).toBe("SAMPLE-42");
    expect(createPayload.calibration_references?.[0]?.id).toBe("CAL-IDENTITY");
    expect(createPayload.calibration_references).toHaveLength(2);
    expect(createPayload.provenance?.import_sha256).toBe("a".repeat(64));
    expect(createPayload.provenance?.source_test_run_id).toBe("source-run-7");
    expect(createPayload.comparisons?.items).toHaveLength(1);
    expect(createPayload.evidence).toHaveLength(1);
    expect(
      createPayload.measurements?.["bubble_distribution.csv"],
    ).toHaveLength(2);
    expect(createPayload.measurements?.retained_h2_mg_l).toBeNull();

    const patchPayload = testRunPatchPayload(view);
    expect(patchPayload.expected_updated_at).toBe(view.timestamp);
    expect(patchPayload.sample_id).toBe("SAMPLE-42");
    expect(patchPayload.provenance?.source).toBe("canonical JSON import");
    expect(patchPayload.measurements?.retained_h2_mg_l).toBeNull();
    expect(patchPayload.measurements?.retention_fraction).toBeNull();
    expect(patchPayload).not.toHaveProperty("comparisons");
    expect(patchPayload).not.toHaveProperty("evidence");
  });

  it("does not materialize a derived retention fraction as measured evidence", () => {
    const document = testRunDocument();
    document.measurements.retained_h2_mg_l = {
      value: 1.05,
      unit: "mg/L",
      standard_uncertainty: 0.1,
      distribution: "normal",
      source_id: "CAL-IDENTITY",
      basis: "measured",
    };
    document.measurements.retention_fraction = null;

    const view = mapApiTestRun(document);

    expect(view.retentionFraction).toBe(0.5);
    expect(
      testRunPatchPayload(view).measurements?.retention_fraction,
    ).toBeNull();
  });

  it("preserves unsupported and independently recorded measurement evidence", () => {
    const document = testRunDocument();
    document.measurements.headspace_gc_mg_l = {
      value: 2.2,
      unit: "mg/L",
      standard_uncertainty: 0.12,
      distribution: "triangular",
      source_id: "CAL-IDENTITY",
      basis: "measured",
    };
    document.measurements.retention_fraction = {
      value: 0.48,
      unit: "fraction",
      standard_uncertainty: 0.03,
      distribution: "normal",
      source_id: "CAL-IDENTITY",
      basis: "measured",
    };
    document.measurements.scalar_measurements = [
      {
        name: "custom_signal",
        method: "custom calibrated signal",
        calibration_reference_id: "CAL-IDENTITY",
        value: {
          value: 4.2,
          unit: "a.u.",
          standard_uncertainty: 0.2,
          distribution: "normal",
          source_id: "CAL-IDENTITY",
          basis: "measured",
        },
      },
    ];

    const payload = testRunPatchPayload(mapApiTestRun(document));

    expect(payload.measurements?.headspace_gc_mg_l).toEqual(
      document.measurements.headspace_gc_mg_l,
    );
    expect(payload.measurements?.retention_fraction).toEqual(
      document.measurements.retention_fraction,
    );
    expect(payload.measurements?.scalar_measurements).toEqual(
      document.measurements.scalar_measurements,
    );
    expect(payload.measurements?.total_h2_mg_l).toEqual(
      document.measurements.total_h2_mg_l,
    );
  });

  it("keeps the prior calibration when an operator adds a new reference", () => {
    const run = {
      ...mapApiTestRun(testRunDocument()),
      calibrationReference: "CAL-NEW",
    };

    const payload = testRunPatchPayload(run);

    expect(payload.calibration_references?.map(({ id }) => id)).toEqual([
      "CAL-NEW",
      "CAL-IDENTITY",
      "CAL-SECONDARY",
    ]);
    expect(payload.measurements?.total_h2_mg_l?.source_id).toBe("CAL-IDENTITY");
  });

  it("preserves the ledger when the single calibration field is blank", () => {
    const run = {
      ...mapApiTestRun(testRunDocument()),
      calibrationReference: null,
    };

    expect(testRunPatchPayload(run).calibration_references).toEqual(
      run.calibrationReferences,
    );
  });

  it("reorders an existing calibration selection without duplicating it", () => {
    const run = {
      ...mapApiTestRun(testRunDocument()),
      calibrationReference: "CAL-SECONDARY",
    };

    expect(
      testRunPatchPayload(run).calibration_references?.map(({ id }) => id),
    ).toEqual(["CAL-SECONDARY", "CAL-IDENTITY"]);
  });
});

describe("selected Test Run measurement eligibility", () => {
  const reviewed = mapApiTestRun({
    ...testRunDocument(),
    status: "valid",
  });

  it("accepts reviewed persisted literature evidence with a supported loading dataset", () => {
    expect(mayContributeMeasurementEvidence("literature", reviewed)).toBe(true);
  });

  it("accepts only bubble-distribution diagnostics from a run awaiting review", () => {
    const diagnostic = {
      ...reviewed,
      status: "needs_review" as const,
      totalH2MgL: null,
      hydrogenDecaySeries: null,
    };

    expect(mayContributeMeasurementEvidence("literature", diagnostic)).toBe(
      true,
    );
    const request = simulationRequest(DEFAULT_INPUTS, diagnostic);
    expect(request.sample?.measured_total_h2_mg_l).toMatchObject({
      value: null,
      basis: "user_assumption",
    });
    expect(request.bubble_population?.bins?.[0]?.diameter_nm).toMatchObject({
      basis: "user_assumption",
      standard_uncertainty: 24,
    });
  });

  it.each([
    ["non-literature fixture", "artificial-pass", reviewed],
    ["volatile run", "literature", { ...reviewed, persisted: false }],
    ["synthetic run", "literature", { ...reviewed, synthetic: true }],
    ["draft run", "literature", { ...reviewed, status: "draft" }],
    [
      "run awaiting review",
      "literature",
      { ...reviewed, status: "needs_review" },
    ],
    ["invalid run", "literature", { ...reviewed, status: "invalid" }],
    [
      "run without supported loading evidence",
      "literature",
      {
        ...reviewed,
        totalH2MgL: null,
        hydrogenDecaySeries: null,
        bubbleDistribution: null,
      },
    ],
  ] as const)("rejects a %s", (_label, fixture, run) => {
    expect(mayContributeMeasurementEvidence(fixture, run)).toBe(false);
  });
});
