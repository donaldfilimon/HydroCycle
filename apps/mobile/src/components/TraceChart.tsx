import {
  summarizeChartSeries,
  type ChartSeries,
  type ChartSeriesSummary,
  type TracePoint,
} from "@hydrocycle/view-model";
import { StyleSheet, Text, View } from "react-native";
import Svg, { G, Line, Polygon, Polyline } from "react-native-svg";

import { formatNumber } from "../format";
import { theme } from "../theme";

const WIDTH = 320;
const HEIGHT = 148;
const PAD = 12;

const SERIES_COLORS: Record<string, string> = {
  "pressure-motored": theme.color.textMuted,
  "pressure-proposed": theme.color.accent,
  "temperature-motored": theme.color.textMuted,
  "temperature-proposed": theme.color.warn,
  "heat-combustion": theme.color.fail,
  "heat-wall": theme.color.warn,
  "heat-phase-change": theme.color.accent,
  "pv-motored": theme.color.textMuted,
  "pv-proposed": theme.color.accent,
  "retention-measured": theme.color.accent,
  "retention-modeled": theme.color.warn,
  "retention-residual": theme.color.fail,
};

function domains(summary: ChartSeriesSummary) {
  const yMin = Math.min(
    summary.valueMin,
    summary.intervalMin ?? summary.valueMin,
  );
  const yMax = Math.max(
    summary.valueMax,
    summary.intervalMax ?? summary.valueMax,
  );
  return {
    xMin: summary.xMin,
    xSpan: Math.max(Number.EPSILON, summary.xMax - summary.xMin),
    yMin,
    ySpan: Math.max(Number.EPSILON, yMax - yMin),
  };
}

function projectedPoint(
  x: number,
  y: number,
  summary: ChartSeriesSummary,
): string {
  const domain = domains(summary);
  const px = PAD + ((x - domain.xMin) / domain.xSpan) * (WIDTH - 2 * PAD);
  const py =
    HEIGHT - PAD - ((y - domain.yMin) / domain.ySpan) * (HEIGHT - 2 * PAD);
  return `${px.toFixed(2)},${py.toFixed(2)}`;
}

export function chartPoints(
  points: readonly TracePoint[],
  summary: ChartSeriesSummary,
): string {
  return points
    .map((point) => projectedPoint(point.x, point.value, summary))
    .join(" ");
}

export function intervalPoints(
  points: readonly TracePoint[],
  summary: ChartSeriesSummary,
): string | null {
  if (
    points.length < 2 ||
    points.some((point) => point.low === undefined || point.high === undefined)
  ) {
    return null;
  }
  const upper = points.map((point) =>
    projectedPoint(point.x, point.high!, summary),
  );
  const lower = [...points]
    .reverse()
    .map((point) => projectedPoint(point.x, point.low!, summary));
  return [...upper, ...lower].join(" ");
}

function hasCompleteInterval(points: readonly TracePoint[]): boolean {
  return (
    points.length >= 2 &&
    points.every(
      (point) => point.low !== undefined && point.high !== undefined,
    )
  );
}

export function TraceChart({
  title,
  description,
  series,
  xUnit,
  yUnit,
}: {
  title: string;
  description?: string;
  series: readonly ChartSeries[];
  xUnit: string;
  yUnit: string;
}) {
  const summary = summarizeChartSeries(series);
  const labels = series
    .map(
      (item) =>
        `${item.label}, ${item.points.length} points, ${
          hasCompleteInterval(item.points)
            ? "with a reported 95% uncertainty band"
            : "without a reported uncertainty band"
        }`,
    )
    .join("; ");
  const yMinimum = summary
    ? Math.min(summary.valueMin, summary.intervalMin ?? summary.valueMin)
    : null;
  const yMaximum = summary
    ? Math.max(summary.valueMax, summary.intervalMax ?? summary.valueMax)
    : null;

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        summary
          ? `${title}. ${description ? `${description}. ` : ""}${labels}. X range ${formatNumber(summary.xMin, 1)} to ${formatNumber(summary.xMax, 1)} ${xUnit}. Y range ${formatNumber(yMinimum, 1)} to ${formatNumber(yMaximum, 1)} ${yUnit}.`
          : `${title}. ${description ? `${description}. ` : ""}Trace unavailable.`
      }
    >
      <Text style={styles.title}>{title}</Text>
      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
      {summary ? (
        <Svg
          width="100%"
          height={HEIGHT}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
        >
          <Line
            x1={PAD}
            y1={HEIGHT - PAD}
            x2={WIDTH - PAD}
            y2={HEIGHT - PAD}
            stroke={theme.color.border}
            strokeWidth={1}
          />
          <Line
            x1={PAD}
            y1={PAD}
            x2={PAD}
            y2={HEIGHT - PAD}
            stroke={theme.color.border}
            strokeWidth={1}
          />
          {series.map((item, index) => {
            const color =
              SERIES_COLORS[item.id] ??
              [theme.color.accent, theme.color.warn, theme.color.pass][
                index % 3
              ]!;
            const interval = intervalPoints(item.points, summary);
            return (
              <G key={item.id}>
                {interval ? (
                  <Polygon
                    testID={`interval-${item.id}`}
                    points={interval}
                    fill={color}
                    fillOpacity={0.14}
                    stroke="none"
                  />
                ) : null}
                <Polyline
                  testID={`series-${item.id}`}
                  points={chartPoints(item.points, summary)}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray={item.dashed ? "5 4" : undefined}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </G>
            );
          })}
        </Svg>
      ) : (
        <Text style={styles.empty}>Trace unavailable</Text>
      )}
      {summary ? (
        <>
          <View style={styles.legend}>
            {series.map((item, index) => (
              <View key={item.id} style={styles.legendItem}>
                <View
                  style={[
                    styles.swatch,
                    {
                      backgroundColor:
                        SERIES_COLORS[item.id] ??
                        [
                          theme.color.accent,
                          theme.color.warn,
                          theme.color.pass,
                        ][index % 3],
                    },
                  ]}
                />
                <Text style={styles.range}>
                  {item.label}
                  {hasCompleteInterval(item.points) ? " · 95% band" : ""}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.range}>
            {formatNumber(yMinimum, 1)} to {formatNumber(yMaximum, 1)} {yUnit}
          </Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: theme.space.md },
  title: { color: theme.color.text, fontSize: 13, fontWeight: "600" },
  description: {
    color: theme.color.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: theme.space.xs,
  },
  empty: {
    color: theme.color.textMuted,
    height: HEIGHT,
    paddingTop: theme.space.xl,
    textAlign: "center",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space.sm,
    marginBottom: theme.space.xs,
  },
  legendItem: { alignItems: "center", flexDirection: "row", gap: 4 },
  swatch: { borderRadius: 3, height: 6, width: 6 },
  range: { color: theme.color.textMuted, fontSize: 11 },
});
