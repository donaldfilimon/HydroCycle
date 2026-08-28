import { AlertTriangle, Check, FileJson, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  createTestRun,
  deleteTestRun,
  downloadTestRunExport,
  getHealth,
  getTestRunsRaw,
  importTestRun,
  patchTestRun,
  postSimulationRaw,
  type ApiHealth,
  type ApiSimulationInput,
  type ApiSimulationResult,
  type ApiTestRunCreate,
  type ApiTestRunDocument,
  type ApiTestRunPatch,
} from "./api";
import { AppShell } from "./components/AppShell";
import type {
  Screen,
  SimulationView,
  TestRunView,
  WorkbenchInputs,
} from "@hydrocycle/view-model";
import {
  DEFAULT_INPUTS,
  demoRuns,
  makeSimulationFixture,
} from "@hydrocycle/view-model";
import { SummaryScreen } from "./screens/SummaryScreen";
import { TestRunsScreen } from "./screens/TestRunsScreen";
import { WorkbenchScreen } from "./screens/WorkbenchScreen";

const validScreens = new Set<Screen>(["summary", "workbench", "test-runs"]);
const STATIC_DEMO = import.meta.env.VITE_STATIC_DEMO === "true";

interface AppProps {
  staticDemo?: boolean;
}

function initialScreen(): Screen {
  const query = new URLSearchParams(window.location.search).get("view");
  return query && validScreens.has(query as Screen)
    ? (query as Screen)
    : "summary";
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);
  return [reduced, setReduced] as const;
}

function simulationRequest(
  inputs: WorkbenchInputs,
  sourceRun: TestRunView | null = null,
): ApiSimulationInput {
  const quantity = (
    value: number | null,
    unit: string,
    basis:
      | "measured"
      | "literature"
      | "user_assumption"
      | "synthetic" = "user_assumption",
    uncertainty = value === null ? 0 : Math.abs(value) * 0.05,
    sourceId: string | null = null,
    distributionOverride?: "normal" | "lognormal" | "uniform" | "triangular",
  ) => ({
    value,
    unit,
    standard_uncertainty: uncertainty,
    distribution:
      value === null || uncertainty === 0
        ? ("fixed" as const)
        : (distributionOverride ?? ("normal" as const)),
    source_id: sourceId,
    basis,
  });

  const elapsedS = 3_600;
  const retainedFraction = Math.max(
    1e-9,
    Math.min(1, inputs.retentionFraction),
  );
  const firstOrderRate = -Math.log(retainedFraction) / elapsedS;
  const waterInjectionScenario =
    inputs.scenario === "hydrogen_fuel_with_water_injection";

  const request: ApiSimulationInput = {
    schema_version: "1.0.0",
    scenario: waterInjectionScenario
      ? "hydrogen_with_water_injection"
      : "upstream_vaporized_carrier",
    sample: {
      water_volume_l: quantity(
        1,
        "L",
        "user_assumption",
        0.01,
        "sample-water-volume-assumption",
      ),
      carrier_volume_ml_per_cycle: quantity(
        inputs.carrierVolumeMlPerCycle,
        "mL/cycle",
        "user_assumption",
        Math.abs(inputs.carrierVolumeMlPerCycle) * 0.05,
        "carrier-delivery-volume-assumption",
      ),
      measured_total_h2_mg_l: quantity(
        inputs.measuredTotalMgL,
        "mg/L",
        inputs.fixture === "artificial-pass"
          ? "synthetic"
          : inputs.measuredTotalMgL !== null && inputs.measuredTotalSourceId
            ? "measured"
            : "user_assumption",
        inputs.measuredTotalUncertaintyMgL,
        inputs.measuredTotalSourceId ||
          (inputs.measuredTotalMgL === null
            ? null
            : "user-entered-total-h2-unreviewed"),
      ),
      separate_h2_mg_per_cycle: quantity(
        waterInjectionScenario ? 18.5 : 0,
        "mg/cycle",
        "synthetic",
        waterInjectionScenario ? 0.5 : 0,
        "synthetic-separate-h2-comparison",
      ),
      water_injection_mg_per_cycle: quantity(
        waterInjectionScenario ? inputs.carrierVolumeMlPerCycle * 1_000 : 0,
        "mg/cycle",
        "synthetic",
        waterInjectionScenario
          ? Math.abs(inputs.carrierVolumeMlPerCycle * 1_000) * 0.05
          : 0,
        "synthetic-water-injection-comparison",
      ),
    },
    environment: {
      water_temperature_k: quantity(
        inputs.waterTemperatureC + 273.15,
        "K",
        "user_assumption",
        0.25,
        "sample-temperature",
      ),
      water_pressure_bar: quantity(
        inputs.systemPressureBar,
        "bar",
        "user_assumption",
        0.01,
        "sample-pressure",
      ),
      hydrogen_headspace_mole_fraction: quantity(
        inputs.hydrogenHeadspaceMoleFraction,
        "1",
        "user_assumption",
        0,
        "pure-h2-headspace-assumption",
      ),
      henry_loading_scale: quantity(
        1,
        "1",
        "user_assumption",
        inputs.henryModelRelativeUncertainty,
        "henry-reference-and-temperature-model-uncertainty",
      ),
      intake_temperature_k: quantity(
        300,
        "K",
        "user_assumption",
        1,
        "intake-temperature-assumption",
      ),
      intake_pressure_bar: quantity(
        1,
        "bar",
        "user_assumption",
        0.01,
        "intake-pressure-assumption",
      ),
    },
    bubble_population: {
      bins: [
        {
          diameter_nm: quantity(
            inputs.bubbleDiameterNm,
            "nm",
            "user_assumption",
            inputs.bubbleDiameterNm * 0.2,
            "bubble-sizing-diagnostic",
            "lognormal",
          ),
          number_per_ml: quantity(
            inputs.bubbleCountPerMl,
            "1/mL",
            "user_assumption",
            inputs.bubbleCountPerMl * 0.5,
            "bubble-sizing-diagnostic",
            "lognormal",
          ),
        },
      ],
      surface_tension_n_m: quantity(
        0.07197,
        "N/m",
        "literature",
        0.002,
        "water-surface-tension-298K",
      ),
      hydrogen_content_scale: quantity(
        1,
        "1",
        "user_assumption",
        inputs.bubbleModelRelativeUncertainty,
        "bubble-gas-identity-and-content-uncertainty",
        "lognormal",
      ),
      method:
        "bubble-sizing diagnostic only; gas identity requires orthogonal confirmation",
    },
    retention: {
      measured_time_series: [],
      elapsed_time_s: quantity(
        elapsedS,
        "s",
        "user_assumption",
        5,
        "elapsed-time-assumption",
      ),
      first_order_rate_constant_per_s: quantity(
        firstOrderRate,
        "1/s",
        "user_assumption",
        firstOrderRate *
          (inputs.retentionStandardUncertainty /
            Math.max(1e-9, inputs.retentionFraction)),
        "retention-visible-assumption",
      ),
      handling_loss_fraction: quantity(
        0,
        "1",
        "user_assumption",
        0,
        "no-handling-loss-assumption",
      ),
      intake_delivery_fraction: quantity(
        1,
        "1",
        "user_assumption",
        0,
        "complete-intake-delivery-assumption",
      ),
      reported_released_fraction: quantity(
        null,
        "1",
        "user_assumption",
        0,
        "unmeasured-release-fraction",
      ),
      release_method: "passive transfer to intake; visible user assumption",
    },
    engine: {
      displacement_l: quantity(
        inputs.displacementL,
        "L",
        "synthetic",
        0.001,
        "synthetic-engine-displacement",
      ),
      compression_ratio: quantity(
        inputs.compressionRatio,
        "1",
        "synthetic",
        0.05,
        "synthetic-engine-compression-ratio",
      ),
      speed_rpm: quantity(
        inputs.speedRpm,
        "rpm",
        "synthetic",
        10,
        "synthetic-engine-speed",
      ),
    },
    combustion: {
      target_equivalence_ratio: quantity(
        inputs.equivalenceRatio,
        "1",
        "synthetic",
        0.03,
        "synthetic-equivalence-ratio",
      ),
      combustion_start_deg_atdc: quantity(
        inputs.sparkTimingDeg,
        "deg",
        "user_assumption",
        2,
        "combustion-start-assumption",
      ),
    },
    heat_recovery: {
      recovered_heat_j_per_cycle: quantity(
        inputs.recoveredHeatJ,
        "J/cycle",
        inputs.fixture === "artificial-pass"
          ? "synthetic"
          : inputs.recoveredHeatJ > 0 && inputs.recoveredHeatSourceId
            ? "measured"
            : "user_assumption",
        inputs.recoveredHeatUncertaintyJ,
        inputs.recoveredHeatSourceId ||
          (inputs.recoveredHeatJ > 0
            ? "user-entered-heat-recovery-unreviewed"
            : "no-measured-heat-recovery"),
      ),
    },
    uncertainty: {
      enabled: true,
      analytical_samples: 200,
      cycle_samples: inputs.cycleSamples,
      seed: inputs.seed,
    },
  };

  if (!sourceRun) return request;

  const decaySeries = sourceRun.hydrogenDecaySeries ?? [];
  const firstDecayPoint = decaySeries[0];
  const finalDecayPoint = decaySeries[decaySeries.length - 1];
  const measuredTotal =
    sourceRun.totalH2MgL ?? firstDecayPoint?.totalH2MgL ?? null;
  const measuredTotalUncertainty =
    sourceRun.standardUncertainty.totalH2MgL ??
    firstDecayPoint?.uncertaintyMgL ??
    0;
  const sourceId =
    sourceRun.calibrationReference ??
    sourceRun.provenance.import_sha256 ??
    `test-run:${sourceRun.id}`;
  const firstPointIsAuthoritativeTotal =
    firstDecayPoint !== undefined &&
    measuredTotal === firstDecayPoint.totalH2MgL &&
    measuredTotalUncertainty === firstDecayPoint.uncertaintyMgL;
  const measuredTotalSourceId = firstPointIsAuthoritativeTotal
    ? `${sourceId}:decay:0`
    : `${sourceId}:total-h2`;

  request.sample = {
    ...request.sample,
    measured_total_h2_mg_l: quantity(
      measuredTotal,
      "mg/L",
      "measured",
      measuredTotalUncertainty,
      measuredTotalSourceId,
    ),
  };

  const measuredElapsed =
    sourceRun.elapsedS ?? finalDecayPoint?.timeS ?? elapsedS;
  const measuredElapsedUncertainty =
    sourceRun.elapsedS === null
      ? 0
      : (sourceRun.standardUncertainty.elapsedS ?? 0);
  const releasedFraction =
    sourceRun.releasedH2MgL !== null &&
    measuredTotal !== null &&
    measuredTotal > 0
      ? sourceRun.releasedH2MgL / measuredTotal
      : null;
  const releasedFractionUncertainty =
    releasedFraction === null ||
    sourceRun.releasedH2MgL === null ||
    measuredTotal === null ||
    measuredTotal <= 0
      ? 0
      : Math.sqrt(
          ((sourceRun.standardUncertainty.releasedH2MgL ?? 0) /
            measuredTotal) **
            2 +
            ((sourceRun.releasedH2MgL * measuredTotalUncertainty) /
              measuredTotal ** 2) **
              2,
        );
  if (
    decaySeries.length > 0 ||
    sourceRun.elapsedS !== null ||
    releasedFraction !== null
  ) {
    request.retention = {
      ...request.retention,
      ...(decaySeries.length > 0
        ? {
            measured_time_series: decaySeries.map((point, index) => ({
              time_s: point.timeS,
              total_h2_mg_l: quantity(
                point.totalH2MgL,
                "mg/L",
                "measured",
                point.uncertaintyMgL,
                `${sourceId}:decay:${index}`,
              ),
            })),
          }
        : {}),
      ...(sourceRun.elapsedS !== null || finalDecayPoint
        ? {
            elapsed_time_s: quantity(
              measuredElapsed,
              "s",
              "measured",
              measuredElapsedUncertainty,
              sourceId,
            ),
          }
        : {}),
      ...(releasedFraction !== null
        ? {
            reported_released_fraction: quantity(
              releasedFraction,
              "1",
              "measured",
              releasedFractionUncertainty,
              sourceId,
            ),
          }
        : {}),
      release_method:
        decaySeries.length > 0
          ? "selected local Test Run measurement overlay; measured decay and mass ledger take precedence"
          : "selected local Test Run mass-ledger overlay; first-order retention remains an explicit assumption",
    };
  }

  if (sourceRun.temperatureC !== null) {
    request.environment = {
      ...request.environment,
      water_temperature_k: quantity(
        sourceRun.temperatureC + 273.15,
        "K",
        "measured",
        sourceRun.standardUncertainty.temperatureC ?? 0,
        sourceId,
      ),
    };
  }
  if (sourceRun.pressureKpa !== null) {
    request.environment = {
      ...request.environment,
      water_pressure_bar: quantity(
        sourceRun.pressureKpa / 100,
        "bar",
        "measured",
        (sourceRun.standardUncertainty.pressureKpa ?? 0) / 100,
        sourceId,
      ),
    };
  }
  if (sourceRun.bubbleDistribution?.length) {
    request.bubble_population = {
      ...request.bubble_population,
      bins: sourceRun.bubbleDistribution.map((point) => ({
        diameter_nm: quantity(
          point.diameterNm,
          "nm",
          "user_assumption",
          point.diameterNm * 0.2,
          `${sourceId}:bubble-bin-uncertainty-assumption`,
          "lognormal",
        ),
        number_per_ml: quantity(
          point.numberPerMl,
          "1/mL",
          "user_assumption",
          point.numberPerMl * 0.5,
          `${sourceId}:bubble-bin-uncertainty-assumption`,
          "lognormal",
        ),
      })),
      method: `${sourceRun.method ?? "selected Test Run bubble-distribution import"}; measured bin values with explicit 20% diameter and 50% count uncertainty assumptions; diagnostic only, not total-H₂ authority`,
    };
  } else if (
    sourceRun.bubbleDiameterNm !== null &&
    sourceRun.numberPerMl !== null
  ) {
    request.bubble_population = {
      ...request.bubble_population,
      bins: [
        {
          diameter_nm: quantity(
            sourceRun.bubbleDiameterNm,
            "nm",
            "measured",
            sourceRun.standardUncertainty.bubbleDiameterNm ?? 0,
            sourceId,
          ),
          number_per_ml: quantity(
            sourceRun.numberPerMl,
            "1/mL",
            "measured",
            sourceRun.standardUncertainty.numberPerMl ?? 0,
            sourceId,
          ),
        },
      ],
      method: `${sourceRun.method ?? "selected Test Run bubble sizing"}; diagnostic only, not total-H₂ authority`,
    };
  }

  return request;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type ApiCycleTrace = ApiSimulationResult["motored_baseline"];

function quantityValue(quantity: { value: number | null }, fallback: number) {
  return quantity.value ?? fallback;
}

function heatRate(cumulative: number[], angle: number[]) {
  return cumulative.map((value, index) => {
    if (index === 0) return 0;
    const previousValue = cumulative[index - 1] ?? value;
    const deltaAngle = (angle[index] ?? 0) - (angle[index - 1] ?? 0);
    return deltaAngle === 0 ? 0 : (value - previousValue) / deltaAngle;
  });
}

function mapCycleTrace(
  trace: ApiCycleTrace,
  fallback: SimulationView["motoredBaseline"],
): SimulationView["motoredBaseline"] {
  return {
    crankAngle: trace.crank_angle_deg,
    volumeCm3: trace.volume_m3.map((value) => value * 1e6),
    pressureBar: trace.pressure_pa.map((value) => value / 1e5),
    temperatureK: trace.temperature_k,
    heatReleaseJDeg: heatRate(
      trace.cumulative_heat_release_j,
      trace.crank_angle_deg,
    ),
    wallHeatJDeg: heatRate(
      trace.cumulative_wall_heat_loss_j,
      trace.crank_angle_deg,
    ).map((value) => -Math.abs(value)),
    vaporizationJDeg: heatRate(
      trace.cumulative_vaporization_heat_j,
      trace.crank_angle_deg,
    ).map((value) => -Math.abs(value)),
    h2Mg: trace.h2_mg,
    o2Mg: trace.o2_mg,
    n2Mg: trace.n2_mg,
    h2oVaporMg: trace.h2o_vapor_mg,
    waterLiquidMg: trace.water_liquid_mg,
    waterVaporMg: trace.water_vapor_mg,
    pressureLower95Bar:
      trace.uncertainty?.pressure_lower_95_pa.map((value) => value / 1e5) ??
      null,
    pressureUpper95Bar:
      trace.uncertainty?.pressure_upper_95_pa.map((value) => value / 1e5) ??
      null,
    temperatureLower95K: trace.uncertainty?.temperature_lower_95_k ?? null,
    temperatureUpper95K: trace.uncertainty?.temperature_upper_95_k ?? null,
    acceptedUncertaintySamples:
      trace.uncertainty?.accepted_cycle_samples ?? null,
    energyConservationResidualFraction:
      trace.energy_conservation_residual_fraction,
    indicatedWorkJ: trace.pv_work_j,
    imepBar: trace.imep_bar,
    upperBoundEfficiency:
      trace.upper_bound_indicated_efficiency ?? fallback.upperBoundEfficiency,
    adiabaticTemperatureK:
      trace.adiabatic_flame_temperature_k ?? Math.max(...trace.temperature_k),
    thermalNoxRisk: trace.relative_thermal_nox_risk,
  };
}

function humanizeParameter(parameter: string) {
  return parameter
    .replace(/^.*\./, "")
    .replaceAll("_", " ")
    .replace(/\bh2\b/i, "H₂")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function mergeApiResult(
  fallback: SimulationView,
  raw: ApiSimulationResult,
): SimulationView {
  const total = quantityValue(
    raw.loading.total_h2_mg_l,
    fallback.loading.initialTotalMgL,
  );
  const totalUncertainty = raw.loading.total_h2_mg_l.standard_uncertainty;
  const carrierVolumeMl = quantityValue(
    raw.input.sample?.carrier_volume_ml_per_cycle ?? { value: null },
    fallback.sampleVolumeMlPerCycle,
  );
  const motoredBaseline = mapCycleTrace(
    raw.motored_baseline,
    fallback.motoredBaseline,
  );
  const proposedCycle = raw.proposed_cycle
    ? mapCycleTrace(
        raw.proposed_cycle,
        fallback.proposedCycle ?? motoredBaseline,
      )
    : null;
  const passed = raw.gate.passed;
  const failures = raw.gate.failures.filter(
    (failure): failure is SimulationView["gate"]["failures"][number] =>
      failure !== "pass",
  );

  return {
    ...fallback,
    id: raw.result_id,
    scenario:
      raw.input.scenario === "hydrogen_with_water_injection"
        ? "hydrogen_fuel_with_water_injection"
        : "upstream_vaporized_carrier",
    measuredTotalMgL: raw.input.sample?.measured_total_h2_mg_l?.value ?? null,
    sampleVolumeMlPerCycle: carrierVolumeMl,
    loading: {
      mode: raw.loading.mode,
      dissolvedMgL: quantityValue(raw.loading.dissolved_h2_mg_l, 0),
      bubbleContainedMgL: quantityValue(
        raw.loading.bubble_contained_h2_mg_l,
        0,
      ),
      initialTotalMgL: quantityValue(
        raw.retention.initial_total_h2_mg_l,
        total,
      ),
      retainedMgL: quantityValue(raw.retention.retained_at_intake_mg_l, 0),
      releasedMgL: quantityValue(raw.retention.released_h2_mg_l, 0),
      unaccountedMgL: quantityValue(raw.retention.unaccounted_h2_mg_l, 0),
      retentionFraction: quantityValue(raw.retention.retained_fraction, 0),
      intervalMgL: {
        low: Math.max(0, total - 1.96 * totalUncertainty),
        high: total + 1.96 * totalUncertainty,
      },
    },
    gate: {
      passed,
      failures,
      hydrogenRequiredMg: quantityValue(raw.gate.hydrogen_required, 0),
      hydrogenAvailableMg: quantityValue(raw.gate.hydrogen_available, 0),
      hydrogenMarginMg: raw.gate.hydrogen_mass_margin_mg_per_cycle,
      energyMarginJ: raw.gate.energy_terms.usable_energy_margin_j,
      energyTerms: {
        hydrogenChemicalJ: raw.gate.energy_terms.hydrogen_chemical_energy_j,
        sensibleHeatingJ: raw.gate.energy_terms.water_sensible_heating_j,
        vaporizationJ: raw.gate.energy_terms.water_phase_change_j,
        recoveredHeatJ: raw.gate.energy_terms.heat_recovery_j,
        wallLossJ: raw.gate.energy_terms.estimated_wall_loss_j,
        targetIndicatedWorkJ: raw.gate.energy_terms.target_indicated_work_j,
      },
      massBalanceResidualMg: raw.gate.mass_balance.residual_h2_mg_per_cycle,
      domainWarnings: raw.gate.domain_warnings ?? [],
    },
    motoredBaseline,
    proposedCycle: passed ? proposedCycle : null,
    sensitivities: raw.uncertainty.sensitivities
      .filter((entry) => Math.abs(entry.normalized_effect) > 1e-6)
      .slice(0, 8)
      .map((entry) => ({
        label: humanizeParameter(entry.parameter),
        normalized: Math.abs(entry.normalized_effect),
        direction:
          entry.direction === "increases"
            ? ("positive" as const)
            : ("negative" as const),
      })),
    evidence: raw.evidence.map((record) => ({
      id: record.id,
      basis: record.basis,
      title: record.title,
      detail: `${record.method}; ${record.value_or_range} ${record.unit}`,
      uncertainty: /high|wide|unknown/i.test(record.uncertainty)
        ? ("high" as const)
        : /moderate/i.test(record.uncertainty)
          ? ("moderate" as const)
          : ("low" as const),
      applicability: record.applicability_note,
    })),
    diagnostics: [
      ...raw.diagnostics.map((diagnostic) => diagnostic.message),
      "Result evaluated by the local HydroCycle model API.",
    ],
    seed: raw.reproducibility.random_seed,
    modelVersion: raw.reproducibility.model_version,
    resultHash: raw.result_id,
  };
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function recordString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function measuredScalar(value: unknown): number | null {
  if (!isRecord(value)) return null;
  return finiteNumber(value.value);
}

function measuredStandardUncertainty(value: unknown): number | null {
  if (!isRecord(value)) return null;
  return finiteNumber(value.standard_uncertainty);
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

function measurementDatasetCount(
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

// eslint-disable-next-line react-refresh/only-export-components -- pure contract adapter is exported for round-trip regression tests
export function mapApiTestRun(document: ApiTestRunDocument): TestRunView {
  const measurements = document.measurements;
  const provenance = document.provenance;
  const totalH2MgL = measuredScalar(measurements.total_h2_mg_l);
  const retainedH2MgL = measuredScalar(measurements.retained_h2_mg_l);
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
      (totalH2MgL && retainedH2MgL !== null
        ? retainedH2MgL / totalH2MgL
        : null),
    operator: document.operator,
    sampleId: document.sample_id,
    method: recordString(provenance.method),
    calibrationReference,
    provenance: document.provenance,
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
    temperatureC:
      measuredScalar(measurements.temperature_k) === null
        ? null
        : (measuredScalar(measurements.temperature_k) as number) - 273.15,
    pressureKpa:
      measuredScalar(measurements.pressure_pa_abs) === null
        ? null
        : (measuredScalar(measurements.pressure_pa_abs) as number) / 1_000,
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
        measuredStandardUncertainty(measurements.pressure_pa_abs) === null
          ? null
          : (measuredStandardUncertainty(
              measurements.pressure_pa_abs,
            ) as number) / 1_000,
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
  };
}

// eslint-disable-next-line react-refresh/only-export-components -- pure contract adapter is exported for round-trip regression tests
export function testRunPayload(run: TestRunView): ApiTestRunCreate {
  const measurementSource =
    run.calibrationReference ?? "ui-unreviewed-operator-entry";
  const measuredValue = (
    value: number | null,
    standardUncertainty: number | null,
    unit: string,
    label: string,
  ) => {
    if (value === null) return null;
    if (standardUncertainty === null || standardUncertainty <= 0) {
      throw new Error(`${label} requires a positive standard uncertainty.`);
    }
    return {
      value,
      unit,
      standard_uncertainty: standardUncertainty,
      distribution: "normal" as const,
      source_id: measurementSource,
      basis: "measured" as const,
    };
  };
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
      total_h2_mg_l: measuredValue(
        run.totalH2MgL,
        run.standardUncertainty.totalH2MgL,
        "mg/L",
        "Total H₂",
      ),
      retained_h2_mg_l: measuredValue(
        run.retainedH2MgL,
        run.standardUncertainty.retainedH2MgL,
        "mg/L",
        "Retained H₂",
      ),
      // Retention fraction is derived on read from the two measured masses;
      // it is not persisted as an independent measurement without its own method.
      retention_fraction: null,
      released_h2_mg_l: measuredValue(
        run.releasedH2MgL,
        run.standardUncertainty.releasedH2MgL,
        "mg/L",
        "Released H₂",
      ),
      unaccounted_h2_mg_l: measuredValue(
        run.unaccountedH2MgL,
        run.standardUncertainty.unaccountedH2MgL,
        "mg/L",
        "Unaccounted H₂",
      ),
      temperature_k: measuredValue(
        run.temperatureC === null ? null : run.temperatureC + 273.15,
        run.standardUncertainty.temperatureC,
        "K",
        "Temperature",
      ),
      pressure_pa_abs: measuredValue(
        run.pressureKpa === null ? null : run.pressureKpa * 1_000,
        run.standardUncertainty.pressureKpa === null
          ? null
          : run.standardUncertainty.pressureKpa * 1_000,
        "Pa",
        "Pressure",
      ),
      elapsed_s: measuredValue(
        run.elapsedS,
        run.standardUncertainty.elapsedS,
        "s",
        "Elapsed time",
      ),
      bubble_diameter_nm: measuredValue(
        run.bubbleDiameterNm,
        run.standardUncertainty.bubbleDiameterNm,
        "nm",
        "Bubble diameter",
      ),
      number_per_ml: measuredValue(
        run.numberPerMl,
        run.standardUncertainty.numberPerMl,
        "1/mL",
        "Bubble number concentration",
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
    calibration_references: run.calibrationReference
      ? [
          {
            ...(run.calibrationReferences[0] ?? {}),
            id: run.calibrationReference,
            instrument:
              run.calibrationReferences[0]?.instrument ??
              "operator-specified local instrument",
            method:
              run.method ??
              run.calibrationReferences[0]?.method ??
              "unspecified measurement method",
            applies_to: run.calibrationReferences[0]?.applies_to?.length
              ? run.calibrationReferences[0].applies_to
              : [
                  ...(run.hydrogenDecaySeries
                    ? ["hydrogen_decay.csv" as const]
                    : []),
                  ...(run.bubbleDistribution
                    ? ["bubble_distribution.csv" as const]
                    : []),
                  ...(run.pressureTrace ? ["pressure_trace.csv" as const] : []),
                ],
          },
          ...run.calibrationReferences.slice(1),
        ]
      : [],
    comparisons: run.comparisons,
    evidence: run.testRunEvidence,
  };
}

// eslint-disable-next-line react-refresh/only-export-components -- pure PATCH adapter is exported for provenance regression tests
export function testRunPatchPayload(run: TestRunView): ApiTestRunPatch {
  const payload = testRunPayload(run);
  return {
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

interface ImportDialogProps {
  onClose: () => void;
  onImport: (file: File, calibrationReference: string | null) => Promise<void>;
}

const acceptedCsvHeaders = [
  "time_s,total_h2_mg_L,uncertainty_mg_L",
  "diameter_nm,number_per_mL",
  "crank_angle_deg,pressure_bar,uncertainty_bar",
] as const;

async function readFileText(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () =>
      resolve(typeof reader.result === "string" ? reader.result : ""),
    );
    reader.addEventListener("error", () =>
      reject(reader.error ?? new Error("File could not be read.")),
    );
    reader.readAsText(file);
  });
}

function useDialogFocus(onClose: () => void) {
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]",
        ),
      );
    (focusable()[0] ?? dialog).focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      if (elements.length === 0) {
        event.preventDefault();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    dialog.addEventListener("keydown", onKeyDown);
    return () => {
      dialog.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);
  return dialogRef;
}

function ImportDialog({ onClose, onImport }: ImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const calibrationInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [filename, setFilename] = useState<string | null>(null);
  const [calibrationReference, setCalibrationReference] = useState("");
  const [importing, setImporting] = useState(false);
  const dialogRef = useDialogFocus(onClose);

  async function validate(file: File) {
    const problems: string[] = [];
    const calibration =
      calibrationInputRef.current?.value.trim() ?? calibrationReference.trim();
    setFilename(file.name);
    if (file.size > 2 * 1024 * 1024)
      problems.push("File exceeds the 2 MiB local import limit.");
    if (!/\.(csv|json)$/i.test(file.name))
      problems.push("Only canonical .csv or .json data files are accepted.");
    const text = await readFileText(file);
    if (text.includes("\u0000") || /<script\b|#!\/|^MZ/i.test(text))
      problems.push("Executable or binary payload detected.");

    if (file.name.toLowerCase().endsWith(".csv")) {
      if (!calibration) {
        problems.push(
          "A calibration or method reference is required for CSV measurement imports.",
        );
      }
      const lines = text
        .replaceAll("\r\n", "\n")
        .split("\n")
        .filter((line) => line.trim() !== "");
      if (lines.length > 10_001)
        problems.push("CSV exceeds the 10,000-row limit.");
      const header = lines[0]?.replace(/^\uFEFF/, "") ?? "";
      if (
        !acceptedCsvHeaders.includes(
          header as (typeof acceptedCsvHeaders)[number],
        )
      ) {
        problems.push(
          `Header must match one canonical series: ${acceptedCsvHeaders.join(" | ")}`,
        );
      }
      const formula = lines
        .slice(1)
        .some((line) =>
          line
            .split(",")
            .some((cell) => /^[=+@]|^-(?!\d|\.)/.test(cell.trim())),
        );
      if (formula)
        problems.push(
          "Formula-like cells are rejected; imports are parsed as data only.",
        );
      const axis = lines.slice(1).map((line) => Number(line.split(",")[0]));
      if (axis.some((value) => !Number.isFinite(value)))
        problems.push("Axis values must be finite numbers.");
      if (
        axis.some(
          (value, index) =>
            index > 0 && value <= (axis[index - 1] ?? Number.NEGATIVE_INFINITY),
        )
      ) {
        problems.push(
          "Series axes must be strictly increasing with no duplicates.",
        );
      }
    } else {
      try {
        const parsed: unknown = JSON.parse(text);
        if (!isRecord(parsed))
          problems.push("Canonical JSON must contain one object at its root.");
      } catch {
        problems.push("JSON could not be parsed as data.");
      }
    }

    setErrors(problems);
    if (problems.length === 0) {
      setImporting(true);
      try {
        await onImport(file, calibration || null);
      } catch (error) {
        setErrors([
          error instanceof Error
            ? error.message
            : "The local model service rejected the import.",
        ]);
      } finally {
        setImporting(false);
      }
    }
  }

  return createPortal(
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        tabIndex={-1}
      >
        <header>
          <div>
            <Upload size={20} />
            <h2 id="import-title">Import measured data</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close import dialog"
          >
            <X size={18} />
          </button>
        </header>
        <p>
          Files stay local. HydroCycle accepts canonical JSON or one of three
          bounded CSV series and never follows filesystem paths embedded in
          data.
        </p>
        <button
          className="modal-drop"
          type="button"
          onClick={() => inputRef.current?.click()}
        >
          <FileJson size={34} />
          <strong>{filename ?? "Choose canonical JSON or CSV"}</strong>
          <span>Maximum 2 MiB · maximum 10,000 data rows</span>
        </button>
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept=".json,.csv,application/json,text/csv"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void validate(file);
          }}
        />
        <label className="modal-field" htmlFor="import-calibration-reference">
          <span>Calibration / method reference</span>
          <input
            ref={calibrationInputRef}
            id="import-calibration-reference"
            value={calibrationReference}
            placeholder="Required for CSV measurements"
            onChange={(event) =>
              setCalibrationReference(event.currentTarget.value)
            }
          />
        </label>
        <ul className="import-contracts">
          {acceptedCsvHeaders.map((header) => (
            <li key={header}>{header}</li>
          ))}
        </ul>
        <div aria-live="polite">
          {errors.length > 0 ? (
            <div className="import-errors" role="alert">
              <AlertTriangle size={17} />
              <span>
                <strong>Import rejected</strong>
                {errors.map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </span>
            </div>
          ) : importing ? (
            <div className="import-success">
              <Check size={17} /> Persisting validated import…
            </div>
          ) : null}
        </div>
      </section>
    </div>,
    document.body,
  );
}

function DeleteDialog({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useDialogFocus(onClose);
  return createPortal(
    <div className="modal-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="modal modal--confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        tabIndex={-1}
      >
        <header>
          <div>
            <AlertTriangle size={20} />
            <h2 id="delete-title">Delete local run?</h2>
          </div>
        </header>
        <p>
          This removes the database references and locally owned attachments for
          this run. Imported source files outside HydroCycle are never followed
          or removed.
        </p>
        <div className="modal-actions">
          <button
            className="button button--quiet"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="button button--danger"
            type="button"
            onClick={onConfirm}
          >
            Delete run
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function DiscardChangesDialog({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useDialogFocus(onClose);
  return createPortal(
    <div className="modal-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="modal modal--confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="discard-changes-title"
        tabIndex={-1}
      >
        <header>
          <div>
            <AlertTriangle size={20} />
            <h2 id="discard-changes-title">Discard unsaved changes?</h2>
          </div>
        </header>
        <p>This Test Run has unsaved changes. Discard them and continue?</p>
        <div className="modal-actions">
          <button
            className="button button--quiet"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="button button--danger"
            type="button"
            onClick={onConfirm}
          >
            Discard changes
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

export default function App({ staticDemo = STATIC_DEMO }: AppProps = {}) {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [inputs, setInputs] = useState<WorkbenchInputs>(DEFAULT_INPUTS);
  const [simulation, setSimulation] = useState(() =>
    makeSimulationFixture("literature", DEFAULT_INPUTS),
  );
  const [runs, setRuns] = useState<TestRunView[]>(demoRuns);
  const [selectedRunId, setSelectedRunId] = useState(demoRuns[0]?.id ?? "");
  const [cursorDeg, setCursorDeg] = useState(-10);
  const [reducedMotion, setReducedMotion] = useReducedMotion();
  const [uncertaintyVisible, setUncertaintyVisible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editorDirty, setEditorDirty] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [notice, setNotice] = useState(
    staticDemo
      ? "Static fixture preview loaded; no model computation is implied."
      : "Literature comparison loaded; no measurement is implied.",
  );
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const dialogInvokerRef = useRef<HTMLElement | null>(null);
  const discardDialogInvokerRef = useRef<HTMLElement | null>(null);
  const pendingDiscardActionRef = useRef<(() => void) | null>(null);
  const selectedRun = useMemo(
    () => runs.find((run) => run.id === selectedRunId) ?? null,
    [runs, selectedRunId],
  );
  const measurementRun = useMemo(() => {
    if (
      inputs.fixture !== "literature" ||
      !selectedRun?.persisted ||
      selectedRun.synthetic ||
      selectedRun.status === "draft" ||
      selectedRun.status === "invalid"
    ) {
      return null;
    }
    const hasLoadingEvidence =
      selectedRun.totalH2MgL !== null ||
      Boolean(selectedRun.hydrogenDecaySeries?.length) ||
      Boolean(selectedRun.bubbleDistribution?.length);
    return hasLoadingEvidence ? selectedRun : null;
  }, [inputs.fixture, selectedRun]);

  useEffect(() => {
    if (staticDemo) return;
    void Promise.all([getHealth(), getTestRunsRaw()])
      .then(([nextHealth, documents]) => {
        setHealth(nextHealth);
        const persistedRuns = documents.map(mapApiTestRun);
        if (persistedRuns.length > 0) {
          setRuns([...persistedRuns, ...demoRuns]);
          setSelectedRunId((current) => current || persistedRuns[0]?.id || "");
        }
      })
      .catch(() => setHealth(null));
  }, [staticDemo]);

  useEffect(() => {
    const onPopState = () => setScreen(initialScreen());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!editorDirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [editorDirty]);

  const navigate = useCallback((next: Screen) => {
    setScreen(next);
    const url = new URL(window.location.href);
    url.searchParams.set("view", next);
    window.history.pushState({}, "", url);
    window.scrollTo({ top: 0, behavior: "auto" });
    window.setTimeout(
      () => document.getElementById("main-content")?.focus(),
      0,
    );
  }, []);

  const requestDiscard = useCallback(
    (action: () => void) => {
      if (!editorDirty) {
        action();
        return;
      }
      discardDialogInvokerRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      pendingDiscardActionRef.current = action;
      setDiscardDialogOpen(true);
    },
    [editorDirty],
  );

  const closeDiscardDialog = useCallback(() => {
    pendingDiscardActionRef.current = null;
    setDiscardDialogOpen(false);
    window.setTimeout(() => discardDialogInvokerRef.current?.focus(), 0);
  }, []);

  const confirmDiscard = useCallback(() => {
    const action = pendingDiscardActionRef.current;
    pendingDiscardActionRef.current = null;
    setDiscardDialogOpen(false);
    setEditorDirty(false);
    action?.();
  }, []);

  const guardedNavigate = useCallback(
    (next: Screen) => requestDiscard(() => navigate(next)),
    [navigate, requestDiscard],
  );

  const openImportDialog = useCallback(() => {
    dialogInvokerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setImportOpen(true);
  }, []);

  const requestImport = useCallback(() => {
    if (staticDemo) {
      setNotice("Import requires the local HydroCycle application.");
      return;
    }
    requestDiscard(openImportDialog);
  }, [openImportDialog, requestDiscard, staticDemo]);

  const closeImportDialog = useCallback(() => {
    setImportOpen(false);
    window.setTimeout(() => dialogInvokerRef.current?.focus(), 0);
  }, []);

  const openDeleteDialog = useCallback((id: string) => {
    dialogInvokerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setDeleteId(id);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDeleteId(null);
    window.setTimeout(() => dialogInvokerRef.current?.focus(), 0);
  }, []);

  const runModel = useCallback(async () => {
    setBusy(true);
    const fixtureInputs: WorkbenchInputs = {
      ...inputs,
      scenario:
        inputs.fixture === "water-injection"
          ? "hydrogen_fuel_with_water_injection"
          : "upstream_vaporized_carrier",
    };
    const fixtureFallback = makeSimulationFixture(
      inputs.fixture,
      fixtureInputs,
    );
    const fallback = measurementRun
      ? {
          ...fixtureFallback,
          label: `Selected Test Run measurements — ${measurementRun.name}`,
        }
      : fixtureFallback;
    if (staticDemo) {
      setSimulation(fallback);
      setNotice(
        `Loaded deterministic ${fallback.label.toLowerCase()}; no model service computation was performed.`,
      );
      setBusy(false);
      return;
    }
    try {
      const persistence = selectedRun?.persisted
        ? { testRunId: selectedRun.id }
        : undefined;
      const raw = await postSimulationRaw(
        simulationRequest(fixtureInputs, measurementRun),
        persistence,
      );
      setSimulation(mergeApiResult(fallback, raw));
      if (persistence) {
        setRuns((current) =>
          current.map((run) =>
            run.id === persistence.testRunId
              ? {
                  ...run,
                  simulationIds: Array.from(
                    new Set([...run.simulationIds, raw.result_id]),
                  ),
                }
              : run,
          ),
        );
      }
      setHealth(
        (current) => current ?? { status: "ok", service: "hydrocycle-model" },
      );
      setNotice(
        measurementRun
          ? `Evaluation completed with selected Test Run evidence from ${measurementRun.name} and linked to that persisted run.`
          : persistence
            ? `Evaluation completed and linked to persisted run ${selectedRun?.name ?? selectedRunId}.`
            : "Evaluation completed by the local model service.",
      );
    } catch (error) {
      setSimulation(fallback);
      setNotice(
        `Local API unavailable; showing deterministic ${fallback.label.toLowerCase()}. ${error instanceof Error ? error.message : ""}`.trim(),
      );
    } finally {
      setBusy(false);
    }
  }, [inputs, measurementRun, selectedRun, selectedRunId, staticDemo]);

  function updateInput(
    key: keyof WorkbenchInputs,
    value: WorkbenchInputs[keyof WorkbenchInputs],
  ) {
    setInputs((current) => ({ ...current, [key]: value }));
    if (key === "fixture") {
      const fixture = value as SimulationView["fixture"];
      const nextScenario =
        fixture === "water-injection"
          ? "hydrogen_fuel_with_water_injection"
          : "upstream_vaporized_carrier";
      setInputs((current) => ({
        ...current,
        fixture,
        scenario: nextScenario,
        measuredTotalMgL: fixture === "artificial-pass" ? 62_000 : null,
        measuredTotalUncertaintyMgL: fixture === "artificial-pass" ? 500 : 0,
        measuredTotalSourceId:
          fixture === "artificial-pass" ? "artificial-pass-only" : "",
        recoveredHeatJ: fixture === "artificial-pass" ? 2_800 : 0,
        recoveredHeatUncertaintyJ: fixture === "artificial-pass" ? 50 : 0,
        recoveredHeatSourceId:
          fixture === "artificial-pass" ? "artificial-pass-only" : "",
      }));
      setNotice("Preset changed. Run the model to evaluate the updated input.");
    }
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function exportBundle() {
    const selectedRun = runs.find((run) => run.id === selectedRunId);
    if (screen === "test-runs" && selectedRun?.persisted) {
      try {
        const exported = await downloadTestRunExport(selectedRun.id);
        triggerDownload(exported.blob, exported.filename);
        setNotice(`Exported canonical persisted run ${selectedRun.name}.`);
        return;
      } catch (error) {
        setNotice(
          `Canonical export failed: ${error instanceof Error ? error.message : "unknown local API error"}`,
        );
        return;
      }
    }
    const bundle = {
      schema_version: "1.0.0",
      exported_at: new Date().toISOString(),
      simulation,
      test_runs: runs,
      scope:
        "HydroCycle local evidence bundle; no spatial CFD field and no hardware commands",
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: "application/json",
    });
    triggerDownload(blob, `hydrocycle-${simulation.resultHash}.json`);
    setNotice(
      `Exported transient view bundle ${simulation.resultHash}; persist a Test Run for canonical re-import.`,
    );
  }

  async function newRun() {
    const id = `local-${crypto.randomUUID()}`;
    const run: TestRunView = {
      id,
      name: "Untitled run",
      status: "draft",
      synthetic: false,
      timestamp: new Date().toISOString(),
      totalH2MgL: null,
      retainedH2MgL: null,
      retentionFraction: null,
      operator: null,
      sampleId: null,
      method: null,
      calibrationReference: null,
      provenance: {
        source: "HydroCycle Test Runs",
        method: null,
        ui_origin: "HydroCycle Test Runs",
        import_sha256: null,
        source_test_run_id: null,
        is_demo_synthetic: false,
      },
      calibrationReferences: [],
      comparisons: { items: [] },
      testRunEvidence: [],
      temperatureC: null,
      pressureKpa: null,
      elapsedS: null,
      bubbleDiameterNm: null,
      numberPerMl: null,
      reviewNotes: null,
      releasedH2MgL: null,
      unaccountedH2MgL: null,
      standardUncertainty: {
        totalH2MgL: null,
        retainedH2MgL: null,
        retentionFraction: null,
        temperatureC: null,
        pressureKpa: null,
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
    };
    navigate("test-runs");
    if (staticDemo) {
      setRuns((current) => [run, ...current]);
      setSelectedRunId(id);
      setNotice("Created an in-memory demo draft; persistence is unavailable.");
      return;
    }
    try {
      const document = await createTestRun(testRunPayload(run));
      const persisted = mapApiTestRun(document);
      setRuns((current) => [persisted, ...current]);
      setSelectedRunId(persisted.id);
      setNotice("New draft persisted to local SQLite.");
    } catch {
      setRuns((current) => [run, ...current]);
      setSelectedRunId(id);
      setNotice(
        "Local model service is offline; draft is volatile until the service reconnects.",
      );
    }
  }

  async function saveRun(run: TestRunView) {
    if (staticDemo) {
      setNotice("Persistence requires the local HydroCycle application.");
      return false;
    }
    try {
      const document = run.persisted
        ? await patchTestRun(run.id, testRunPatchPayload(run))
        : await createTestRun(testRunPayload(run));
      const persisted = mapApiTestRun(document);
      setRuns((current) =>
        current.some((item) => item.id === run.id)
          ? current.map((item) => (item.id === run.id ? persisted : item))
          : [persisted, ...current],
      );
      setSelectedRunId(persisted.id);
      setNotice(`${persisted.name} persisted to local SQLite.`);
      return true;
    } catch (error) {
      setNotice(
        `Run was not persisted: ${error instanceof Error ? error.message : "local API unavailable"}`,
      );
      return false;
    }
  }

  async function exportCfdBoundary(run: TestRunView) {
    if (!run.persisted || !simulation.id || !simulation.proposedCycle) {
      setNotice(
        "Neutral CFD boundary export requires a persisted run with the current gate-passing proposed cycle.",
      );
      return false;
    }
    try {
      const exported = await downloadTestRunExport(
        run.id,
        "cfd_boundary",
        simulation.id,
      );
      triggerDownload(exported.blob, exported.filename);
      setNotice(
        "Exported homogeneous 0D boundary states; no spatial field was generated.",
      );
      return true;
    } catch (error) {
      setNotice(
        `Neutral CFD boundary export failed: ${error instanceof Error ? error.message : "unknown local API error"}`,
      );
      return false;
    }
  }

  async function duplicateRun(id: string) {
    const source = runs.find((run) => run.id === id);
    if (!source) return;
    const duplicate: TestRunView = {
      ...source,
      id: `local-${crypto.randomUUID()}`,
      name: `${source.name} copy`,
      status: "draft",
      timestamp: new Date().toISOString(),
      persisted: false,
      attachmentHashes: [],
      simulationIds: [],
      provenance: {
        ...source.provenance,
        source: "HydroCycle Test Runs duplicate",
        source_test_run_id: source.id,
        import_sha256: null,
        is_demo_synthetic: source.synthetic,
      },
      comparisons: { items: [] },
      testRunEvidence: [],
    };
    await saveRun(duplicate);
  }

  async function removeRun(id: string) {
    const run = runs.find((candidate) => candidate.id === id);
    if (!run) return;
    try {
      if (run.persisted) await deleteTestRun(id);
      setRuns((current) => current.filter((candidate) => candidate.id !== id));
      setSelectedRunId((current) =>
        current === id
          ? (runs.find((candidate) => candidate.id !== id)?.id ?? "")
          : current,
      );
      setNotice(
        run.persisted
          ? "Database references and locally owned attachments deleted."
          : "Volatile demo/draft removed from this session.",
      );
      setDeleteId(null);
    } catch (error) {
      setNotice(
        `Delete failed; nothing was removed: ${error instanceof Error ? error.message : "local API error"}`,
      );
    }
  }

  const apiLabel = useMemo(() => {
    if (staticDemo) return "Hosted preview: static fixtures only";
    if (!health) return "Local model service: offline / checking";
    const status = health.status;
    const service = health.service;
    const label =
      typeof status === "string"
        ? status
        : typeof service === "string"
          ? service
          : "connected";
    return `Local model service: ${label}`;
  }, [health, staticDemo]);

  return (
    <AppShell
      active={screen}
      busy={busy}
      gatePassed={simulation.gate.passed}
      staticDemo={staticDemo}
      onNavigate={guardedNavigate}
      onRun={() => void runModel()}
      onImport={requestImport}
      onExport={() => void exportBundle()}
      dialogOpen={importOpen || deleteId !== null || discardDialogOpen}
    >
      <div className="app-notice" role="status" aria-live="polite">
        <span>{notice}</span>
        <small>{apiLabel}</small>
      </div>

      {screen === "summary" ? (
        <SummaryScreen
          simulation={simulation}
          selectedRun={selectedRun}
          uncertaintyVisible={uncertaintyVisible}
          onToggleUncertainty={() => setUncertaintyVisible((value) => !value)}
          onOpenWorkbench={() => guardedNavigate("workbench")}
        />
      ) : null}
      {screen === "workbench" ? (
        <WorkbenchScreen
          simulation={simulation}
          inputs={inputs}
          measurementRun={measurementRun}
          cursorDeg={cursorDeg}
          reducedMotion={reducedMotion}
          staticDemo={staticDemo}
          onCursorChange={(value) =>
            setCursorDeg(Math.max(-180, Math.min(180, value)))
          }
          onReducedMotionChange={setReducedMotion}
          onInputChange={updateInput}
          onRun={() => void runModel()}
        />
      ) : null}
      {screen === "test-runs" ? (
        <TestRunsScreen
          runs={runs}
          selectedId={selectedRunId}
          onSelect={(id) => requestDiscard(() => setSelectedRunId(id))}
          onDirtyChange={setEditorDirty}
          onSave={saveRun}
          onNew={() => requestDiscard(() => void newRun())}
          onDuplicate={(id) => requestDiscard(() => void duplicateRun(id))}
          onDelete={openDeleteDialog}
          onImport={requestImport}
          linkedSimulation={
            simulation.id && selectedRun?.simulationIds.includes(simulation.id)
              ? simulation
              : null
          }
          cfdExportAvailable={Boolean(
            simulation.id &&
            simulation.proposedCycle &&
            runs
              .find((run) => run.id === selectedRunId)
              ?.simulationIds.includes(simulation.id),
          )}
          onExportCfd={exportCfdBoundary}
        />
      ) : null}

      {importOpen ? (
        <ImportDialog
          onClose={closeImportDialog}
          onImport={async (file, calibrationReference) => {
            const response = await importTestRun(file, calibrationReference);
            const run = mapApiTestRun(response.test_run);
            setRuns((current) => [
              run,
              ...current.filter((item) => item.id !== run.id),
            ]);
            setSelectedRunId(run.id);
            setImportOpen(false);
            navigate("test-runs");
            setNotice(
              `${run.name} persisted with attachment SHA-256 ${response.attachment.sha256.slice(0, 12)}…` +
                (response.imported_simulations.length > 0
                  ? ` Restored ${response.imported_simulations.length} reproducible simulation result.`
                  : ""),
            );
          }}
        />
      ) : null}

      {deleteId ? (
        <DeleteDialog
          onClose={closeDeleteDialog}
          onConfirm={() => void removeRun(deleteId)}
        />
      ) : null}

      {discardDialogOpen ? (
        <DiscardChangesDialog
          onClose={closeDiscardDialog}
          onConfirm={confirmDiscard}
        />
      ) : null}
    </AppShell>
  );
}
