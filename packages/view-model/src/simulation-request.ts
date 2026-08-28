import type { components } from "@hydrocycle/contracts";

import type { TestRunView, WorkbenchInputs } from "./domain";

type ApiSimulationInput = components["schemas"]["SimulationInput"];

/**
 * Maps the workbench's view-level inputs onto the API request body.
 *
 * This is pure mapping with no DOM dependency, and it lives here rather than
 * in `apps/web` so the mobile client submits a byte-identical request instead
 * of maintaining a second, drifting copy of the same evidence-basis rules.
 */
export function simulationRequest(
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
