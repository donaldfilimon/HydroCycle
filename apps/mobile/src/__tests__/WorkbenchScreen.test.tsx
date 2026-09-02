import { DEFAULT_INPUTS } from "@hydrocycle/view-model";
import { render, screen, within } from "@testing-library/react-native";

import type { ApiSimulationResult } from "../api";
import WorkbenchScreen from "../screens/WorkbenchScreen";

jest.mock("../api", () => ({ postSimulation: jest.fn() }));

function cycle(
  pressurePa: readonly [number, number, number],
  withUncertainty: boolean,
): ApiSimulationResult["motored_baseline"] {
  return {
    crank_angle_deg: [-180, 0, 180],
    volume_m3: [0.00055, 0.00005, 0.00055],
    pressure_pa: [...pressurePa],
    temperature_k: [300, 700, 320],
    cumulative_heat_release_j: [0, 10, 12],
    cumulative_wall_heat_loss_j: [0, 1, 2],
    cumulative_vaporization_heat_j: [0, 0.5, 1],
    h2_mg: [1, 1, 1],
    o2_mg: [2, 2, 2],
    n2_mg: [7, 7, 7],
    h2o_vapor_mg: [0, 0.5, 1],
    water_liquid_mg: [1, 0.5, 0],
    water_vapor_mg: [0, 0.5, 1],
    uncertainty: withUncertainty
      ? {
          pressure_lower_95_pa: pressurePa.map((value) => value * 0.9),
          pressure_upper_95_pa: pressurePa.map((value) => value * 1.1),
          temperature_lower_95_k: [290, 680, 310],
          temperature_upper_95_k: [310, 720, 330],
          accepted_cycle_samples: 60,
        }
      : null,
    energy_conservation_residual_fraction: 0.001,
    pv_work_j: 420,
    imep_bar: 8.4,
    upper_bound_indicated_efficiency: 0.3,
    adiabatic_flame_temperature_k: 2_000,
    relative_thermal_nox_risk: "moderate",
  } as ApiSimulationResult["motored_baseline"];
}

function result({
  passed,
  includeProposed,
  withUncertainty,
  availableHydrogen = 20,
}: {
  passed: boolean;
  includeProposed: boolean;
  withUncertainty: boolean;
  availableHydrogen?: number | null;
}): ApiSimulationResult {
  const quantity = (value: number | null) => ({
    value,
    unit: "mg/L",
    standard_uncertainty: value === null ? null : 0,
  });
  return {
    result_id: "workbench-chart-result",
    input: {
      scenario: "upstream_vaporized_carrier",
      sample: {
        carrier_volume_ml_per_cycle: quantity(0.5),
        measured_total_h2_mg_l: null,
      },
    },
    loading: {
      mode: "derived",
      total_h2_mg_l: quantity(null),
      dissolved_h2_mg_l: quantity(null),
      bubble_contained_h2_mg_l: quantity(null),
    },
    retention: {
      initial_total_h2_mg_l: quantity(null),
      retained_at_intake_mg_l: quantity(null),
      released_h2_mg_l: quantity(null),
      unaccounted_h2_mg_l: quantity(null),
      retained_fraction: quantity(null),
    },
    gate: {
      passed,
      failures: passed ? ["pass"] : ["insufficient_h2"],
      hydrogen_available: quantity(availableHydrogen),
      hydrogen_required: quantity(17.1),
      hydrogen_mass_margin_mg_per_cycle:
        availableHydrogen === null ? null : availableHydrogen - 17.1,
      energy_terms: {
        usable_energy_margin_j: passed ? 10 : -10,
        hydrogen_chemical_energy_j: 2_400,
        water_sensible_heating_j: 10,
        water_phase_change_j: 100,
        heat_recovery_j: 0,
        estimated_wall_loss_j: 50,
        target_indicated_work_j: 500,
      },
      mass_balance: { residual_h2_mg_per_cycle: 0 },
      domain_warnings: [],
    },
    motored_baseline: cycle(
      [100_000, 2_000_000, 110_000],
      withUncertainty,
    ),
    proposed_cycle: includeProposed
      ? cycle([100_000, 4_000_000, 120_000], withUncertainty)
      : null,
    uncertainty: { sensitivities: [] },
    evidence: [],
    diagnostics: [],
    reproducibility: {
      schema_version: "1.0.0",
      model_version: "test-model",
      solver_version: "test-solver",
      python_version: "3.14",
      cantera_available: true,
      cantera_version: "3.2",
      mechanism: "test.yaml",
      random_seed: 42,
    },
  } as unknown as ApiSimulationResult;
}

function renderWorkbench(simulation: ApiSimulationResult) {
  render(
    <WorkbenchScreen
      selectedRun={null}
      session={{
        result: simulation,
        source: "workbench",
        linkedTestRunId: null,
        inputs: DEFAULT_INPUTS,
      }}
      onSessionChange={jest.fn()}
      onSimulationLinked={jest.fn()}
    />,
  );
}

describe("mobile Workbench cycle evidence", () => {
  it("renders accessible P–V and reported uncertainty-band views as homogeneous 0D evidence", () => {
    renderWorkbench(
      result({ passed: true, includeProposed: true, withUncertainty: true }),
    );

    expect(
      screen.getByText(
        "Homogeneous single-zone 0D evidence — not spatial or CFD output",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("image", {
        name: /Pressure comparison.*not spatial variation.*reported 95% uncertainty band/,
      }),
    ).toBeTruthy();
    expect(screen.getByTestId("interval-pressure-motored")).toBeTruthy();
    expect(screen.getByTestId("interval-pressure-proposed")).toBeTruthy();
    expect(
      screen.getByRole("image", {
        name: /Pressure-volume path.*Homogeneous single-zone 0D thermodynamic loop; not a cylinder map or CFD field.*Proposed 0D cycle/,
      }),
    ).toBeTruthy();
    expect(screen.getByTestId("series-pv-proposed")).toBeTruthy();
  });

  it("withholds a proposed cycle after a failed gate and does not invent uncertainty", () => {
    renderWorkbench(
      result({
        passed: false,
        includeProposed: true,
        withUncertainty: false,
        availableHydrogen: null,
      }),
    );

    expect(
      screen.getByText("No proposed reactive cycle — motored baseline only."),
    ).toBeTruthy();
    const availableHydrogenRow = screen.getByText("H2 available").parent!.parent!;
    expect(within(availableHydrogenRow).getByText("—")).toBeTruthy();
    expect(within(availableHydrogenRow).queryByText("0.000 mg/cyc")).toBeNull();
    expect(
      screen.getByText(
        "Uncertainty bands are unavailable; none are inferred from scalar inputs.",
      ),
    ).toBeTruthy();
    expect(screen.queryByTestId("series-pressure-proposed")).toBeNull();
    expect(screen.queryByTestId("interval-pressure-motored")).toBeNull();
    expect(screen.getByTestId("series-pv-motored")).toBeTruthy();
    expect(screen.queryByTestId("series-pv-proposed")).toBeNull();
  });
});
