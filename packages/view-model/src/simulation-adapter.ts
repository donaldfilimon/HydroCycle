import type { components } from "@hydrocycle/contracts";

import type { SimulationView } from "./domain";

export type ApiSimulationResult = components["schemas"]["SimulationResult"];
export type ApiCycleTrace = ApiSimulationResult["motored_baseline"];

function heatRate(cumulative: number[], angle: number[]): number[] {
  return cumulative.map((value, index) => {
    if (index === 0) return 0;
    const previousValue = cumulative[index - 1] ?? value;
    const deltaAngle = (angle[index] ?? 0) - (angle[index - 1] ?? 0);
    return deltaAngle === 0 ? 0 : (value - previousValue) / deltaAngle;
  });
}

function mapCycleTrace(
  trace: ApiCycleTrace,
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
    upperBoundEfficiency: trace.upper_bound_indicated_efficiency,
    adiabaticTemperatureK: trace.adiabatic_flame_temperature_k,
    thermalNoxRisk: trace.relative_thermal_nox_risk,
  };
}

function humanizeParameter(parameter: string): string {
  return parameter
    .replace(/^.*\./, "")
    .replaceAll("_", " ")
    .replace(/\bh2\b/i, "H₂")
    .replace(/^./, (letter) => letter.toUpperCase());
}

/** Enforces failed-gate suppression at the presentation trust boundary. */
export function proposedCycleForDisplay(
  result: ApiSimulationResult,
): ApiCycleTrace | null {
  return result.gate.passed === true ? result.proposed_cycle : null;
}

/** Maps the generated API contract into the shared presentation domain. */
export function mapApiSimulationResult(
  fallback: SimulationView,
  raw: ApiSimulationResult,
): SimulationView {
  const total = raw.loading.total_h2_mg_l.value;
  const totalUncertainty = raw.loading.total_h2_mg_l.standard_uncertainty;
  const carrierVolumeMl =
    raw.input.sample?.carrier_volume_ml_per_cycle?.value ?? null;
  const motoredBaseline = mapCycleTrace(raw.motored_baseline);
  const proposedCycle = proposedCycleForDisplay(raw);

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
      dissolvedMgL: raw.loading.dissolved_h2_mg_l.value,
      bubbleContainedMgL: raw.loading.bubble_contained_h2_mg_l.value,
      initialTotalMgL: raw.retention.initial_total_h2_mg_l.value,
      retainedMgL: raw.retention.retained_at_intake_mg_l.value,
      releasedMgL: raw.retention.released_h2_mg_l.value,
      unaccountedMgL: raw.retention.unaccounted_h2_mg_l.value,
      retentionFraction: raw.retention.retained_fraction.value,
      intervalMgL:
        total === null
          ? null
          : {
              low: Math.max(0, total - 1.96 * totalUncertainty),
              high: total + 1.96 * totalUncertainty,
            },
    },
    gate: {
      passed: raw.gate.passed,
      failures: raw.gate.failures.filter(
        (failure): failure is SimulationView["gate"]["failures"][number] =>
          failure !== "pass",
      ),
      hydrogenRequiredMg: raw.gate.hydrogen_required.value,
      hydrogenAvailableMg: raw.gate.hydrogen_available.value,
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
    proposedCycle: proposedCycle ? mapCycleTrace(proposedCycle) : null,
    sensitivities: raw.uncertainty.sensitivities
      .filter(
        (entry) =>
          entry.direction !== "neutral" &&
          Math.abs(entry.normalized_effect) > 1e-6,
      )
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
