import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_INPUTS, makeSimulationFixture } from "@hydrocycle/view-model";
import { WorkbenchScreen } from "../screens/WorkbenchScreen";

describe("Workbench chart series", () => {
  it("omits malformed shared series instead of replacing missing values with zero", () => {
    const fixture = makeSimulationFixture("literature", DEFAULT_INPUTS);
    const simulation = {
      ...fixture,
      motoredBaseline: {
        ...fixture.motoredBaseline,
        pressureBar: fixture.motoredBaseline.pressureBar.slice(0, -1),
      },
    };

    render(
      <WorkbenchScreen
        simulation={simulation}
        inputs={DEFAULT_INPUTS}
        measurementRun={null}
        cursorDeg={0}
        reducedMotion
        staticDemo
        busy
        onCursorChange={vi.fn()}
        onReducedMotionChange={vi.fn()}
        onInputChange={vi.fn()}
        onRun={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Evaluating…" })).toBeDisabled();

    const pressureChart = screen.getByRole("img", {
      name: /pressure vs\. crank angle/i,
    });
    const pressureFigure = pressureChart.closest("figure");
    if (pressureFigure === null) throw new Error("Pressure figure not found");
    expect(pressureFigure.querySelector("polyline")).not.toBeInTheDocument();
    expect(
      within(pressureFigure).queryByText("Motored baseline"),
    ).not.toBeInTheDocument();

    const temperatureChart = screen.getByRole("img", {
      name: /temperature vs\. crank angle/i,
    });
    const temperatureFigure = temperatureChart.closest("figure");
    if (temperatureFigure === null)
      throw new Error("Temperature figure not found");
    expect(
      within(temperatureFigure).getByText("Motored baseline"),
    ).toBeInTheDocument();
  });
});
