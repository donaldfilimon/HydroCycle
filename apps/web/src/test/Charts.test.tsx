import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LineChart } from "../components/Charts";

describe("accessible chart system", () => {
  const series = [
    {
      label: "Measured",
      color: "#24d5e8",
      points: [
        { x: 0, value: 1, low: 0.9, high: 1.1 },
        { x: 1, value: 2, low: 1.8, high: 2.2 },
      ],
    },
  ];

  it("provides a descriptive SVG and a tabular alternative", async () => {
    const user = userEvent.setup();
    render(
      <LineChart
        title="Retention"
        description="Hydrogen retention over time."
        xLabel="Time"
        yLabel="H₂"
        series={series}
      />,
    );
    expect(
      screen.getByRole("img", { name: /hydrogen retention over time/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /data table/i }));
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Measured" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Measured lower 95%" }),
    ).toBeInTheDocument();
    expect(screen.getByText("0.900")).toBeInTheDocument();
  });

  it("supports keyboard movement of a synchronized cursor", async () => {
    const onCursorChange = vi.fn();
    const user = userEvent.setup();
    render(
      <LineChart
        title="Retention"
        description="Hydrogen retention over time."
        xLabel="Time"
        yLabel="H₂"
        series={series}
        cursorX={0.5}
        onCursorChange={onCursorChange}
      />,
    );
    const chart = screen.getByRole("img", {
      name: /hydrogen retention over time/i,
    });
    chart.focus();
    await user.keyboard("{ArrowRight}");
    expect(onCursorChange).toHaveBeenCalledWith(expect.any(Number));
  });

  it("aligns unequal x domains without shifting values by array index", async () => {
    const user = userEvent.setup();
    render(
      <LineChart
        title="Unequal domains"
        description="Two series sampled on different axes."
        xLabel="Time"
        yLabel="Value"
        series={[
          ...series,
          {
            label: "Model",
            color: "#2c78ff",
            points: [
              { x: 0.5, value: 10 },
              { x: 1, value: 20 },
            ],
          },
        ]}
      />,
    );
    await user.click(screen.getByRole("button", { name: /data table/i }));
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(4);
    expect(rows[1]).toHaveTextContent("0.00");
    expect(rows[1]).not.toHaveTextContent("10.000");
    expect(rows[2]).toHaveTextContent("0.50");
    expect(rows[2]).toHaveTextContent("10.000");
  });

  it("renders a synchronized point marker for non-monotonic P–V paths", () => {
    const { container } = render(
      <LineChart
        title="P–V loop"
        description="Pressure-volume path."
        xLabel="Volume"
        yLabel="Pressure"
        series={series}
        cursorPointIndex={1}
      />,
    );
    expect(container.querySelector(".chart-index-cursor")).toBeInTheDocument();
  });
});
