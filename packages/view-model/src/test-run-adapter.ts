import type { components } from "@hydrocycle/contracts";

import type { TestRunView } from "./domain";

export type ApiTestRunDocument = components["schemas"]["TestRunDocument"];
export type ApiTestRunCreate = components["schemas"]["TestRunCreate"];
export type ApiTestRunPatch = components["schemas"]["TestRunPatch"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function recordString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function measuredScalar(value: unknown): number | null {
  return isRecord(value) ? finiteNumber(value.value) : null;
}

function measuredStandardUncertainty(value: unknown): number | null {
  return isRecord(value) ? finiteNumber(value.standard_uncertainty) : null;
}

const scalarMeasurementKeys = [
  "headspace_gc_mg_l",
  "total_h2_mg_l",
  "retained_h2_mg_l",
  "retention_fraction",
  "released_h2_mg_l",
  "unaccounted_h2_mg_l",
  "temperature_k",
  "pressure_pa_abs",
  "elapsed_s",
  "bubble_diameter_nm",
  "number_per_ml",
] as const;

const seriesMeasurementKeys = [
  "hydrogen_decay.csv",
  "bubble_distribution.csv",
  "pressure_trace.csv",
] as const;

export function measurementDatasetCount(
  measurements: ApiTestRunDocument["measurements"],
): number {
  const scalarCount = scalarMeasurementKeys.reduce(
    (count, key) =>
      count + (measuredScalar(measurements[key]) === null ? 0 : 1),
    0,
  );
  const seriesCount = seriesMeasurementKeys.reduce(
    (count, key) =>
      count +
      (Array.isArray(measurements[key]) && measurements[key].length > 0
        ? 1
        : 0),
    0,
  );
  return scalarCount + seriesCount;
}

function mapHydrogenSeries(value: unknown): TestRunView["hydrogenDecaySeries"] {
  if (!Array.isArray(value)) return null;
  const points = value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const timeS = finiteNumber(item.time_s);
    const totalH2MgL = finiteNumber(item.total_h2_mg_L);
    const uncertaintyMgL = finiteNumber(item.uncertainty_mg_L);
    return timeS === null || totalH2MgL === null || uncertaintyMgL === null
      ? []
      : [{ timeS, totalH2MgL, uncertaintyMgL }];
  });
  return points.length > 0 ? points : null;
}

function mapBubbleDistribution(
  value: unknown,
): TestRunView["bubbleDistribution"] {
  if (!Array.isArray(value)) return null;
  const points = value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const diameterNm = finiteNumber(item.diameter_nm);
    const numberPerMl = finiteNumber(item.number_per_mL);
    return diameterNm === null || numberPerMl === null
      ? []
      : [{ diameterNm, numberPerMl }];
  });
  return points.length > 0 ? points : null;
}

function mapPressureSeries(value: unknown): TestRunView["pressureTrace"] {
  if (!Array.isArray(value)) return null;
  const points = value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const crankAngleDeg = finiteNumber(item.crank_angle_deg);
    const pressureBar = finiteNumber(item.pressure_bar);
    const uncertaintyBar = finiteNumber(item.uncertainty_bar);
    return crankAngleDeg === null ||
      pressureBar === null ||
      uncertaintyBar === null
      ? []
      : [{ crankAngleDeg, pressureBar, uncertaintyBar }];
  });
  return points.length > 0 ? points : null;
}

export function hasRecordedMeasurements(run: ApiTestRunDocument): boolean {
  return measurementDatasetCount(run.measurements) > 0;
}

export function mapApiTestRun(document: ApiTestRunDocument): TestRunView {
  const measurements = document.measurements;
  const provenance = document.provenance;
  const totalH2MgL = measuredScalar(measurements.total_h2_mg_l);
  const retainedH2MgL = measuredScalar(measurements.retained_h2_mg_l);
  const temperatureK = measuredScalar(measurements.temperature_k);
  const pressurePa = measuredScalar(measurements.pressure_pa_abs);
  const pressureUncertaintyPa = measuredStandardUncertainty(
    measurements.pressure_pa_abs,
  );
  const firstCalibration = document.calibration_references[0];
  const calibrationReference = isRecord(firstCalibration)
    ? (recordString(firstCalibration.id) ??
      recordString(firstCalibration.method))
    : null;

  return {
    id: document.id,
    name: document.name,
    status: document.status,
    synthetic: document.is_demo_synthetic,
    timestamp: document.updated_at,
    totalH2MgL,
    retainedH2MgL,
    retentionFraction:
      measuredScalar(measurements.retention_fraction) ??
      (totalH2MgL !== null && totalH2MgL !== 0 && retainedH2MgL !== null
        ? retainedH2MgL / totalH2MgL
        : null),
    operator: document.operator,
    sampleId: document.sample_id,
    method: recordString(provenance.method),
    calibrationReference,
    provenance,
    calibrationReferences: document.calibration_references,
    comparisons: document.comparisons,
    testRunEvidence: document.evidence.map((evidence) => ({
      kind: evidence.kind,
      title: evidence.title,
      author_or_publisher: evidence.author_or_publisher,
      publication_date: evidence.publication_date,
      ...(evidence.url !== undefined ? { url: evidence.url } : {}),
      ...(evidence.local_attachment !== undefined
        ? { local_attachment: evidence.local_attachment }
        : {}),
      method: evidence.method,
      value_or_range: evidence.value_or_range,
      unit: evidence.unit,
      uncertainty: evidence.uncertainty,
      applicability_note: evidence.applicability_note,
    })),
    temperatureC: temperatureK === null ? null : temperatureK - 273.15,
    pressureKpa: pressurePa === null ? null : pressurePa / 1_000,
    elapsedS: measuredScalar(measurements.elapsed_s),
    bubbleDiameterNm: measuredScalar(measurements.bubble_diameter_nm),
    numberPerMl: measuredScalar(measurements.number_per_ml),
    reviewNotes: document.notes,
    releasedH2MgL: measuredScalar(measurements.released_h2_mg_l),
    unaccountedH2MgL: measuredScalar(measurements.unaccounted_h2_mg_l),
    standardUncertainty: {
      totalH2MgL: measuredStandardUncertainty(measurements.total_h2_mg_l),
      retainedH2MgL: measuredStandardUncertainty(measurements.retained_h2_mg_l),
      retentionFraction: measuredStandardUncertainty(
        measurements.retention_fraction,
      ),
      temperatureC: measuredStandardUncertainty(measurements.temperature_k),
      pressureKpa:
        pressureUncertaintyPa === null ? null : pressureUncertaintyPa / 1_000,
      elapsedS: measuredStandardUncertainty(measurements.elapsed_s),
      bubbleDiameterNm: measuredStandardUncertainty(
        measurements.bubble_diameter_nm,
      ),
      numberPerMl: measuredStandardUncertainty(measurements.number_per_ml),
      releasedH2MgL: measuredStandardUncertainty(measurements.released_h2_mg_l),
      unaccountedH2MgL: measuredStandardUncertainty(
        measurements.unaccounted_h2_mg_l,
      ),
    },
    hydrogenDecaySeries: mapHydrogenSeries(measurements["hydrogen_decay.csv"]),
    bubbleDistribution: mapBubbleDistribution(
      measurements["bubble_distribution.csv"],
    ),
    pressureTrace: mapPressureSeries(measurements["pressure_trace.csv"]),
    attachmentHashes: document.attachments.map(
      (attachment) => attachment.sha256,
    ),
    simulationIds: document.simulation_ids,
    measurementDatasetCount: measurementDatasetCount(measurements),
    persisted: true,
    sourceMeasurements: measurements,
  };
}

export function testRunPayload(run: TestRunView): ApiTestRunCreate {
  const measurementSource =
    run.calibrationReference ?? "ui-unreviewed-operator-entry";
  const measuredValue = (
    value: number | null,
    standardUncertainty: number | null,
    unit: string,
    label: string,
    existing: components["schemas"]["MeasuredValue"] | null | undefined,
  ) => {
    if (value === null) return null;
    if (standardUncertainty === null || standardUncertainty <= 0) {
      throw new Error(`${label} requires a positive standard uncertainty.`);
    }
    return {
      ...existing,
      value,
      unit,
      standard_uncertainty: standardUncertainty,
      distribution: existing?.distribution ?? ("normal" as const),
      source_id: existing?.source_id ?? measurementSource,
      basis: existing?.basis ?? ("measured" as const),
    };
  };
  const sourceMeasurements = run.sourceMeasurements ?? {};
  const selectedCalibration = run.calibrationReference
    ? run.calibrationReferences.find(
        (reference) => reference.id === run.calibrationReference,
      )
    : null;
  const calibrationReferences = !run.calibrationReference
    ? run.calibrationReferences
    : selectedCalibration
      ? [
          selectedCalibration,
          ...run.calibrationReferences.filter(
            (reference) => reference.id !== selectedCalibration.id,
          ),
        ]
      : [
          {
            id: run.calibrationReference,
            instrument: "operator-specified local instrument",
            method: run.method ?? "unspecified measurement method",
            applies_to: [
              ...(run.hydrogenDecaySeries
                ? ["hydrogen_decay.csv" as const]
                : []),
              ...(run.bubbleDistribution
                ? ["bubble_distribution.csv" as const]
                : []),
              ...(run.pressureTrace ? ["pressure_trace.csv" as const] : []),
            ],
          },
          ...run.calibrationReferences,
        ];

  return {
    name: run.name,
    status: run.status,
    operator: run.operator,
    sample_id: run.sampleId,
    notes: run.reviewNotes,
    is_demo_synthetic: run.synthetic,
    provenance: {
      ...run.provenance,
      method: run.method,
      ui_origin: run.provenance.ui_origin ?? "HydroCycle Test Runs",
      is_demo_synthetic: run.synthetic,
    },
    measurements: {
      ...sourceMeasurements,
      total_h2_mg_l: measuredValue(
        run.totalH2MgL,
        run.standardUncertainty.totalH2MgL,
        "mg/L",
        "Total H₂",
        sourceMeasurements.total_h2_mg_l,
      ),
      retained_h2_mg_l: measuredValue(
        run.retainedH2MgL,
        run.standardUncertainty.retainedH2MgL,
        "mg/L",
        "Retained H₂",
        sourceMeasurements.retained_h2_mg_l,
      ),
      // Preserve an independently recorded fraction, but never materialize the
      // display-only fraction derived from the two measured masses.
      retention_fraction: sourceMeasurements.retention_fraction ?? null,
      released_h2_mg_l: measuredValue(
        run.releasedH2MgL,
        run.standardUncertainty.releasedH2MgL,
        "mg/L",
        "Released H₂",
        sourceMeasurements.released_h2_mg_l,
      ),
      unaccounted_h2_mg_l: measuredValue(
        run.unaccountedH2MgL,
        run.standardUncertainty.unaccountedH2MgL,
        "mg/L",
        "Unaccounted H₂",
        sourceMeasurements.unaccounted_h2_mg_l,
      ),
      temperature_k: measuredValue(
        run.temperatureC === null ? null : run.temperatureC + 273.15,
        run.standardUncertainty.temperatureC,
        "K",
        "Temperature",
        sourceMeasurements.temperature_k,
      ),
      pressure_pa_abs: measuredValue(
        run.pressureKpa === null ? null : run.pressureKpa * 1_000,
        run.standardUncertainty.pressureKpa === null
          ? null
          : run.standardUncertainty.pressureKpa * 1_000,
        "Pa",
        "Pressure",
        sourceMeasurements.pressure_pa_abs,
      ),
      elapsed_s: measuredValue(
        run.elapsedS,
        run.standardUncertainty.elapsedS,
        "s",
        "Elapsed time",
        sourceMeasurements.elapsed_s,
      ),
      bubble_diameter_nm: measuredValue(
        run.bubbleDiameterNm,
        run.standardUncertainty.bubbleDiameterNm,
        "nm",
        "Bubble diameter",
        sourceMeasurements.bubble_diameter_nm,
      ),
      number_per_ml: measuredValue(
        run.numberPerMl,
        run.standardUncertainty.numberPerMl,
        "1/mL",
        "Bubble number concentration",
        sourceMeasurements.number_per_ml,
      ),
      "hydrogen_decay.csv":
        run.hydrogenDecaySeries?.map((point) => ({
          time_s: point.timeS,
          total_h2_mg_L: point.totalH2MgL,
          uncertainty_mg_L: point.uncertaintyMgL,
        })) ?? null,
      "bubble_distribution.csv":
        run.bubbleDistribution?.map((point) => ({
          diameter_nm: point.diameterNm,
          number_per_mL: point.numberPerMl,
        })) ?? null,
      "pressure_trace.csv":
        run.pressureTrace?.map((point) => ({
          crank_angle_deg: point.crankAngleDeg,
          pressure_bar: point.pressureBar,
          uncertainty_bar: point.uncertaintyBar,
        })) ?? null,
    },
    calibration_references: calibrationReferences,
    comparisons: run.comparisons,
    evidence: run.testRunEvidence,
  };
}

export function testRunPatchPayload(run: TestRunView): ApiTestRunPatch {
  const payload = testRunPayload(run);
  return {
    expected_updated_at: run.timestamp,
    name: run.name,
    status: run.status,
    operator: run.operator,
    sample_id: run.sampleId,
    notes: run.reviewNotes,
    is_demo_synthetic: run.synthetic,
    provenance: payload.provenance ?? run.provenance,
    measurements: payload.measurements ?? {},
    calibration_references: payload.calibration_references ?? [],
  };
}
