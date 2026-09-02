"use client";

import type { CycleView } from "@hydrocycle/view-model";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function traceData(cycle: CycleView) {
  return cycle.crankAngle.map((angle, index) => ({
    angle,
    pressure: cycle.pressureBar[index] ?? null,
    temperature: cycle.temperatureK[index] ?? null,
    heat: cycle.heatReleaseJDeg[index] ?? null,
    volume: cycle.volumeCm3[index] ?? null,
  }));
}

export function TraceChart({
  cycle,
  field,
  color,
  label,
  unit,
}: {
  cycle: CycleView;
  field: "pressure" | "temperature" | "heat";
  color: string;
  label: string;
  unit: string;
}) {
  const data = traceData(cycle);
  return (
    <figure className="trace-chart">
      <figcaption>
        {label} <span>[{unit}]</span>
      </figcaption>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart
          data={data}
          margin={{ top: 12, right: 8, bottom: 2, left: -20 }}
        >
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="2 3" />
          <XAxis
            dataKey="angle"
            tick={{ fontSize: 9 }}
            stroke="var(--chart-axis)"
          />
          <YAxis tick={{ fontSize: 9 }} stroke="var(--chart-axis)" />
          <Tooltip
            contentStyle={{
              background: "#071225",
              border: "1px solid #27446d",
              fontSize: 11,
            }}
          />
          <Line
            type="monotone"
            dataKey={field}
            stroke={color}
            strokeWidth={1.6}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}

export function PvChart({ cycle }: { cycle: CycleView }) {
  const data = cycle.volumeCm3.map((volume, index) => ({
    volume,
    pressure: cycle.pressureBar[index] ?? null,
  }));
  return (
    <figure className="trace-chart trace-chart--pv">
      <figcaption>
        P–V DIAGRAM <span>[bar / cm³]</span>
      </figcaption>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart
          data={data}
          margin={{ top: 12, right: 8, bottom: 2, left: -20 }}
        >
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="2 3" />
          <XAxis
            dataKey="volume"
            tick={{ fontSize: 9 }}
            stroke="var(--chart-axis)"
          />
          <YAxis tick={{ fontSize: 9 }} stroke="var(--chart-axis)" />
          <Line
            type="monotone"
            dataKey="pressure"
            stroke="#3f82ff"
            strokeWidth={1.6}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}
