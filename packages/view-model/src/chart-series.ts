import type { SimulationView, TestRunView, TracePoint } from "./domain";
import { makeRetentionTrace } from "./fixtures";

export interface ChartSeries {
  id: string;
  label: string;
  points: TracePoint[];
  dashed?: boolean;
}

export interface SeriesFromArraysOptions {
  dashed?: boolean;
  low?: readonly number[] | null;
  high?: readonly number[] | null;
}

export interface SimulationChartSeries {
  pressure: ChartSeries[];
  temperature: ChartSeries[];
  heat: ChartSeries[];
  pv: ChartSeries[];
  sensitivities: ChartSeries[];
}

export interface ChartSeriesSummary {
  pointCount: number;
  xMin: number;
  xMax: number;
  valueMin: number;
  valueMax: number;
  intervalMin: number | null;
  intervalMax: number | null;
}

export interface RetentionComparisonSeries {
  measured: ChartSeries | null;
  modeled: ChartSeries | null;
  residual: ChartSeries | null;
}

function completeFiniteArray(
  values: readonly number[] | null | undefined,
  length: number,
): values is readonly number[] {
  return (
    values !== null &&
    values !== undefined &&
    values.length === length &&
    values.every(Number.isFinite)
  );
}

export function seriesFromArrays(
  id: string,
  label: string,
  x: readonly number[],
  values: readonly number[],
  options: SeriesFromArraysOptions = {},
): ChartSeries | null {
  if (
    x.length < 2 ||
    x.length !== values.length ||
    !x.every(Number.isFinite) ||
    !values.every(Number.isFinite)
  ) {
    return null;
  }

  const low = options.low;
  const high = options.high;
  const hasInterval =
    completeFiniteArray(low, x.length) && completeFiniteArray(high, x.length);
  const points = x.map((pointX, index) => {
    const point: TracePoint = { x: pointX, value: values[index]! };
    if (hasInterval) {
      point.low = low[index]!;
      point.high = high[index]!;
    }
    return point;
  });

  return {
    id,
    label,
    points,
    ...(options.dashed === true ? { dashed: true } : {}),
  };
}

export function summarizeChartSeries(
  series: ChartSeries | readonly ChartSeries[],
): ChartSeriesSummary | null {
  const collection: readonly ChartSeries[] =
    "points" in series ? [series] : series;
  const points = collection.flatMap((item) => item.points);
  if (points.length === 0) return null;

  const intervalValues = points.flatMap((point) => [
    ...(point.low === undefined ? [] : [point.low]),
    ...(point.high === undefined ? [] : [point.high]),
  ]);

  return {
    pointCount: points.length,
    xMin: Math.min(...points.map((point) => point.x)),
    xMax: Math.max(...points.map((point) => point.x)),
    valueMin: Math.min(...points.map((point) => point.value)),
    valueMax: Math.max(...points.map((point) => point.value)),
    intervalMin:
      intervalValues.length === 0 ? null : Math.min(...intervalValues),
    intervalMax:
      intervalValues.length === 0 ? null : Math.max(...intervalValues),
  };
}

function present<T>(value: T | null): value is T {
  return value !== null;
}

export function simulationChartSeries(
  simulation: SimulationView,
): SimulationChartSeries {
  const baseline = simulation.motoredBaseline;
  const proposed =
    simulation.gate.passed && simulation.proposedCycle !== null
      ? simulation.proposedCycle
      : null;
  const selected = proposed ?? baseline;

  return {
    pressure: [
      seriesFromArrays(
        "pressure-motored",
        "Motored baseline",
        baseline.crankAngle,
        baseline.pressureBar,
        {
          dashed: true,
          low: baseline.pressureLower95Bar,
          high: baseline.pressureUpper95Bar,
        },
      ),
      ...(proposed === null
        ? []
        : [
            seriesFromArrays(
              "pressure-proposed",
              "Proposed 0D cycle",
              proposed.crankAngle,
              proposed.pressureBar,
              {
                low: proposed.pressureLower95Bar,
                high: proposed.pressureUpper95Bar,
              },
            ),
          ]),
    ].filter(present),
    temperature: [
      seriesFromArrays(
        "temperature-motored",
        "Motored baseline",
        baseline.crankAngle,
        baseline.temperatureK,
        {
          dashed: true,
          low: baseline.temperatureLower95K,
          high: baseline.temperatureUpper95K,
        },
      ),
      ...(proposed === null
        ? []
        : [
            seriesFromArrays(
              "temperature-proposed",
              "Proposed 0D cycle",
              proposed.crankAngle,
              proposed.temperatureK,
              {
                low: proposed.temperatureLower95K,
                high: proposed.temperatureUpper95K,
              },
            ),
          ]),
    ].filter(present),
    heat: [
      seriesFromArrays(
        "heat-combustion",
        "Combustion heat",
        selected.crankAngle,
        selected.heatReleaseJDeg,
      ),
      seriesFromArrays(
        "heat-wall",
        "Wall heat",
        selected.crankAngle,
        selected.wallHeatJDeg,
      ),
      seriesFromArrays(
        "heat-phase-change",
        "Phase change",
        selected.crankAngle,
        selected.vaporizationJDeg,
      ),
    ].filter(present),
    pv: [
      seriesFromArrays(
        proposed === null ? "pv-motored" : "pv-proposed",
        proposed === null ? "Motored baseline" : "Proposed 0D cycle",
        selected.volumeCm3,
        selected.pressureBar,
        { dashed: proposed === null },
      ),
    ].filter(present),
    sensitivities: simulation.sensitivities
      .map((item, index) =>
        seriesFromArrays(
          `sensitivity-${index}`,
          item.label,
          [0, 1],
          [
            0,
            item.direction === "negative" ? -item.normalized : item.normalized,
          ],
        ),
      )
      .filter(present),
  };
}

export function retentionComparisonSeries(
  run: TestRunView,
): RetentionComparisonSeries {
  const trace = makeRetentionTrace(run);
  const hasMeasuredInterval = trace.measured.every(
    (point) => point.low !== undefined && point.high !== undefined,
  );
  const measured = seriesFromArrays(
    "retention-measured",
    "Measured retention",
    trace.measured.map((point) => point.x),
    trace.measured.map((point) => point.value),
    {
      low: hasMeasuredInterval
        ? trace.measured.map((point) => point.low!)
        : null,
      high: hasMeasuredInterval
        ? trace.measured.map((point) => point.high!)
        : null,
    },
  );
  const modeled = seriesFromArrays(
    "retention-modeled",
    "First-order model",
    trace.modeled.map((point) => point.x),
    trace.modeled.map((point) => point.value),
    { dashed: true },
  );

  if (measured === null || modeled === null) {
    return { measured, modeled, residual: null };
  }

  const residualPoints = measured.points.map((point) => {
    const nearest = modeled.points.reduce((best, candidate) =>
      Math.abs(candidate.x - point.x) < Math.abs(best.x - point.x)
        ? candidate
        : best,
    );
    return {
      x: point.x,
      value: point.value - nearest.value,
      ...(point.low === undefined ? {} : { low: point.low - nearest.value }),
      ...(point.high === undefined ? {} : { high: point.high - nearest.value }),
    };
  });

  return {
    measured,
    modeled,
    residual: {
      id: "retention-residual",
      label: "Retention residual",
      points: residualPoints,
    },
  };
}
