import { summarizeChartSeries, type ChartSeries } from "@hydrocycle/view-model";
import { render, screen } from "@testing-library/react-native";

import {
  chartPoints,
  intervalPoints,
  TraceChart,
} from "../components/TraceChart";

const pressure: ChartSeries = {
  id: "pressure-motored",
  label: "Motored baseline",
  dashed: true,
  points: [
    { x: -180, value: 1, low: 0.8, high: 1.2 },
    { x: 0, value: 10, low: 9, high: 11 },
    { x: 180, value: 1, low: 0.8, high: 1.2 },
  ],
};

describe("TraceChart", () => {
  it("projects aligned shared points without changing their order", () => {
    const pv: ChartSeries = {
      id: "pv-proposed",
      label: "Proposed 0D cycle",
      points: [
        { x: 5, value: 10 },
        { x: 3, value: 30 },
        { x: 4, value: 20 },
      ],
    };
    const summary = summarizeChartSeries(pv)!;
    const points = chartPoints(pv.points, summary).split(" ");

    expect(points).toHaveLength(3);
    expect(points[0]).not.toBe(points[1]);
    expect(points.join(" ")).not.toContain("NaN");
  });

  it("draws multiple series and only real uncertainty intervals", () => {
    const proposed: ChartSeries = {
      id: "pressure-proposed",
      label: "Proposed 0D cycle",
      points: pressure.points.map(({ x, value }) => ({ x, value: value + 2 })),
    };
    render(
      <TraceChart
        title="Pressure comparison"
        description="Homogeneous single-zone 0D evidence, not spatial or CFD output"
        series={[pressure, proposed]}
        xUnit="degrees"
        yUnit="bar"
      />,
    );

    expect(screen.getByTestId("series-pressure-motored")).toBeTruthy();
    expect(screen.getByTestId("series-pressure-proposed")).toBeTruthy();
    expect(screen.getByTestId("interval-pressure-motored")).toBeTruthy();
    expect(screen.queryByTestId("interval-pressure-proposed")).toBeNull();
    expect(
      screen.getByLabelText(
        /Homogeneous single-zone 0D evidence, not spatial or CFD output.*Motored baseline, 3 points, with a reported 95% uncertainty band.*Proposed 0D cycle, 3 points, without a reported uncertainty band/,
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("image", { name: /Pressure comparison/ }),
    ).toBeTruthy();
    expect(screen.getByText("Motored baseline · 95% band")).toBeTruthy();
    expect(screen.getByText("Proposed 0D cycle")).toBeTruthy();
  });

  it("rejects incomplete interval polygons", () => {
    const summary = summarizeChartSeries(pressure)!;
    expect(intervalPoints(pressure.points, summary)).not.toBeNull();
    expect(
      intervalPoints(
        [
          { x: 0, value: 1, low: 0, high: 2 },
          { x: 1, value: 2 },
        ],
        summary,
      ),
    ).toBeNull();
  });

  it("announces unavailable data instead of a cosmetic range", () => {
    render(
      <TraceChart
        title="Pressure-volume path"
        description="Homogeneous single-zone 0D thermodynamic loop; not a cylinder map or CFD field"
        series={[]}
        xUnit="cm³"
        yUnit="bar"
      />,
    );
    expect(
      screen.getByRole("image", {
        name: /Pressure-volume path.*Homogeneous single-zone 0D thermodynamic loop; not a cylinder map or CFD field.*Trace unavailable/,
      }),
    ).toBeTruthy();
    expect(screen.getByText("Trace unavailable")).toBeTruthy();
  });
});
