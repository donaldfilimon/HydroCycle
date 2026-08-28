import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_INPUTS,
  demoRuns,
  makeSimulationFixture,
  type TestRunView,
} from "@hydrocycle/view-model";
import { SummaryScreen } from "../screens/SummaryScreen";

const simulation = makeSimulationFixture("literature", DEFAULT_INPUTS);

function renderSummary(selectedRun: TestRunView | null) {
  return render(
    <SummaryScreen
      simulation={simulation}
      selectedRun={selectedRun}
      uncertaintyVisible
      onToggleUncertainty={() => {}}
      onOpenWorkbench={() => {}}
    />,
  );
}

describe("Summary evidence scopes", () => {
  it("shows zero selected datasets until an eligible reviewed persisted run is selected", () => {
    const { rerender } = renderSummary(null);

    expect(
      screen.getByText(/no eligible reviewed persisted Test Run is selected/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Selected Test Run measurements").closest("summary"),
    ).toHaveTextContent("0 datasets");

    const reviewedRun: TestRunView = {
      ...(demoRuns[0] as TestRunView),
      id: "reviewed-persisted-run",
      name: "Reviewed persisted run",
      status: "valid",
      synthetic: false,
      persisted: true,
      measurementDatasetCount: 4,
    };
    rerender(
      <SummaryScreen
        simulation={simulation}
        selectedRun={reviewedRun}
        uncertaintyVisible
        onToggleUncertainty={() => {}}
        onOpenWorkbench={() => {}}
      />,
    );

    expect(
      screen.getByText("Selected Test Run measurements").closest("summary"),
    ).toHaveTextContent("4 datasets");
    expect(screen.getByText(/reviewed persisted run/i)).toBeInTheDocument();
  });

  it("never presents a selected synthetic demo as operator measurement evidence", () => {
    renderSummary({
      ...(demoRuns[0] as TestRunView),
      measurementDatasetCount: 8,
      persisted: true,
      status: "valid",
      synthetic: true,
    });

    expect(
      screen.getByText("Selected Test Run measurements").closest("summary"),
    ).toHaveTextContent("0 datasets");
    expect(
      screen.getByText(/synthetic demo.*not counted/i),
    ).toBeInTheDocument();
  });
});
