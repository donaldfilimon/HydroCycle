import { describe, expect, it } from "vitest";

import {
  DEFAULT_INPUTS,
  demoRuns,
  makeSimulationFixture,
  retentionComparisonSeries,
  seriesFromArrays,
  simulationChartSeries,
  summarizeChartSeries,
  type TestRunView,
} from "../src";

describe("seriesFromArrays", () => {
  it("fails closed for too few, misaligned, or non-finite required values", () => {
    expect(seriesFromArrays("a", "A", [0], [1])).toBeNull();
    expect(seriesFromArrays("a", "A", [0, 1], [1])).toBeNull();
    expect(seriesFromArrays("a", "A", [0, Number.NaN], [1, 2])).toBeNull();
    expect(
      seriesFromArrays("a", "A", [0, 1], [1, Number.POSITIVE_INFINITY]),
    ).toBeNull();
  });

  it("includes uncertainty only when both bounds are complete and finite", () => {
    const complete = seriesFromArrays("a", "A", [0, 1], [2, 3], {
      low: [1, 2],
      high: [3, 4],
    });
    expect(complete?.points).toEqual([
      { x: 0, value: 2, low: 1, high: 3 },
      { x: 1, value: 3, low: 2, high: 4 },
    ]);

    expect(
      seriesFromArrays("a", "A", [0, 1], [2, 3], {
        low: [1, 2],
        high: [3],
      })?.points,
    ).toEqual([
      { x: 0, value: 2 },
      { x: 1, value: 3 },
    ]);
    expect(
      seriesFromArrays("a", "A", [0, 1], [2, 3], {
        low: [1, Number.NaN],
        high: [3, 4],
      })?.points,
    ).toEqual([
      { x: 0, value: 2 },
      { x: 1, value: 3 },
    ]);
  });
});

describe("simulationChartSeries", () => {
  it("suppresses a proposed cycle whenever the feasibility gate failed", () => {
    const failed = makeSimulationFixture("literature", DEFAULT_INPUTS);
    failed.proposedCycle = makeSimulationFixture("artificial-pass", {
      ...DEFAULT_INPUTS,
      measuredTotalMgL: 62_000,
    }).proposedCycle;

    const series = simulationChartSeries(failed);
    expect(series.pressure.map((item) => item.id)).toEqual([
      "pressure-motored",
    ]);
    expect(series.temperature.map((item) => item.id)).toEqual([
      "temperature-motored",
    ]);
    expect(series.heat[0]?.points.every((point) => point.value === 0)).toBe(
      true,
    );
    expect(series.pv[0]?.id).toBe("pv-motored");
  });

  it("uses the gate-approved proposed cycle for heat and P-V data", () => {
    const passed = makeSimulationFixture("artificial-pass", {
      ...DEFAULT_INPUTS,
      measuredTotalMgL: 62_000,
    });
    const proposed = passed.proposedCycle!;
    proposed.volumeCm3 = [5, 3, 4];
    proposed.pressureBar = [10, 30, 20];
    proposed.crankAngle = [0, 1, 2];
    proposed.temperatureK = [500, 600, 550];
    proposed.heatReleaseJDeg = [1, 2, 3];
    proposed.wallHeatJDeg = [-1, -2, -3];
    proposed.vaporizationJDeg = [-4, -5, -6];

    const series = simulationChartSeries(passed);
    expect(series.pressure).toHaveLength(2);
    expect(
      series.heat.map((item) => item.points.map((point) => point.value)),
    ).toEqual([
      [1, 2, 3],
      [-1, -2, -3],
      [-4, -5, -6],
    ]);
    expect(series.pv[0]?.points).toEqual([
      { x: 5, value: 10 },
      { x: 3, value: 30 },
      { x: 4, value: 20 },
    ]);
    expect(
      series.sensitivities.find((item) => item.label === "Carrier volume")
        ?.points[1]?.value,
    ).toBe(-0.61);
  });

  it("omits malformed individual simulation series instead of inserting zero", () => {
    const simulation = makeSimulationFixture("literature", DEFAULT_INPUTS);
    simulation.motoredBaseline.pressureBar[1] = Number.NaN;
    simulation.motoredBaseline.temperatureK.pop();

    const series = simulationChartSeries(simulation);
    expect(series.pressure).toEqual([]);
    expect(series.temperature).toEqual([]);
    expect(series.pv).toEqual([]);
  });
});

describe("summarizeChartSeries", () => {
  it("returns numeric point, x, value, and interval extents", () => {
    const first = seriesFromArrays("a", "A", [3, -1], [8, 4], {
      low: [7, 2],
      high: [10, 6],
    })!;
    const second = seriesFromArrays("b", "B", [5, 6], [-2, 1])!;

    expect(summarizeChartSeries([first, second])).toEqual({
      pointCount: 4,
      xMin: -1,
      xMax: 6,
      valueMin: -2,
      valueMax: 8,
      intervalMin: 2,
      intervalMax: 10,
    });
  });

  it("returns null for empty chart data", () => {
    expect(summarizeChartSeries([])).toBeNull();
    expect(
      summarizeChartSeries({ id: "empty", label: "Empty", points: [] }),
    ).toBeNull();
  });
});

describe("retentionComparisonSeries", () => {
  it("includes measured intervals, model data, and nearest-point residuals", () => {
    const run = structuredClone(demoRuns[0]!);
    const result = retentionComparisonSeries(run);

    expect(result.measured?.points.length).toBeGreaterThanOrEqual(2);
    expect(
      result.measured?.points.every((point) => point.low !== undefined),
    ).toBe(true);
    expect(result.modeled?.points).toHaveLength(31);
    expect(result.modeled?.dashed).toBe(true);
    expect(result.residual?.points).toHaveLength(
      result.measured!.points.length,
    );

    const measured = result.measured!.points[1]!;
    const nearest = result.modeled!.points.reduce((best, point) =>
      Math.abs(point.x - measured.x) < Math.abs(best.x - measured.x)
        ? point
        : best,
    );
    expect(result.residual?.points[1]).toEqual({
      x: measured.x,
      value: measured.value - nearest.value,
      low: measured.low! - nearest.value,
      high: measured.high! - nearest.value,
    });
  });

  it("marks model and residual unavailable without valid model inputs", () => {
    const run: TestRunView = {
      ...structuredClone(demoRuns[0]!),
      totalH2MgL: null,
      retainedH2MgL: null,
      elapsedS: null,
    };
    const result = retentionComparisonSeries(run);

    expect(result.measured).not.toBeNull();
    expect(result.modeled).toBeNull();
    expect(result.residual).toBeNull();
  });

  it("marks all series unavailable when no usable observations exist", () => {
    const run: TestRunView = {
      ...structuredClone(demoRuns[0]!),
      totalH2MgL: null,
      retainedH2MgL: null,
      elapsedS: null,
      hydrogenDecaySeries: null,
    };
    expect(retentionComparisonSeries(run)).toEqual({
      measured: null,
      modeled: null,
      residual: null,
    });
  });
});
