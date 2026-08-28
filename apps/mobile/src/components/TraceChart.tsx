import { StyleSheet, Text, View } from "react-native";
import Svg, { Line, Polyline } from "react-native-svg";

import { formatNumber } from "../format";
import { theme } from "../theme";

const WIDTH = 320;
const HEIGHT = 132;
const PAD = 12;

export function chartPoints(x: number[], values: number[]): string | null {
  if (x.length < 2 || x.length !== values.length) return null;
  const points = x
    .map((xValue, index) => ({ x: xValue, y: values[index] }))
    .filter(
      (point): point is { x: number; y: number } =>
        point.y !== undefined &&
        Number.isFinite(point.x) &&
        Number.isFinite(point.y),
    );
  if (points.length < 2) return null;

  const xMin = Math.min(...points.map((point) => point.x));
  const xMax = Math.max(...points.map((point) => point.x));
  const yMin = Math.min(...points.map((point) => point.y));
  const yMax = Math.max(...points.map((point) => point.y));
  const xSpan = Math.max(Number.EPSILON, xMax - xMin);
  const ySpan = Math.max(Number.EPSILON, yMax - yMin);

  return points
    .map((point) => {
      const px = PAD + ((point.x - xMin) / xSpan) * (WIDTH - 2 * PAD);
      const py = HEIGHT - PAD - ((point.y - yMin) / ySpan) * (HEIGHT - 2 * PAD);
      return `${px.toFixed(2)},${py.toFixed(2)}`;
    })
    .join(" ");
}

export function TraceChart({
  title,
  x,
  values,
  unit,
  color = theme.color.accent,
}: {
  title: string;
  x: number[];
  values: number[];
  unit: string;
  color?: string;
}) {
  const points = chartPoints(x, values);
  const finiteValues = values.filter(Number.isFinite);
  const minimum = finiteValues.length > 0 ? Math.min(...finiteValues) : null;
  const maximum = finiteValues.length > 0 ? Math.max(...finiteValues) : null;

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={`${title}. Range ${formatNumber(minimum, 1)} to ${formatNumber(maximum, 1)} ${unit}.`}
    >
      <Text style={styles.title}>{title}</Text>
      {points ? (
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
          <Polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </Svg>
      ) : (
        <Text style={styles.empty}>Trace unavailable</Text>
      )}
      <View style={styles.legend}>
        <Text style={styles.range}>{formatNumber(minimum, 1)} min</Text>
        <Text style={styles.range}>
          {formatNumber(maximum, 1)} max · {unit}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: theme.space.md },
  title: { color: theme.color.text, fontSize: 13, fontWeight: "600" },
  empty: {
    color: theme.color.textMuted,
    height: HEIGHT,
    textAlign: "center",
    paddingTop: theme.space.xl,
  },
  legend: { flexDirection: "row", justifyContent: "space-between" },
  range: { color: theme.color.textMuted, fontSize: 11 },
});
