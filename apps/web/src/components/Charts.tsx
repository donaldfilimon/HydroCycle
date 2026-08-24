import { useId, useMemo, useState } from "react";

import type { TracePoint } from "../domain";

export interface ChartSeries {
  label: string;
  color: string;
  points: TracePoint[];
  dashed?: boolean;
}

interface LineChartProps {
  title: string;
  description: string;
  xLabel: string;
  yLabel: string;
  series: ChartSeries[];
  cursorX?: number;
  cursorPointIndex?: number;
  compact?: boolean;
  className?: string;
  onCursorChange?: (value: number) => void;
}

function extent(values: number[]) {
  if (values.length === 0) return [0, 1] as const;
  const low = Math.min(...values);
  const high = Math.max(...values);
  if (low === high) return [low - 1, high + 1] as const;
  const padding = (high - low) * 0.08;
  return [low - padding, high + padding] as const;
}

function interpolate(points: TracePoint[], x: number) {
  if (points.length === 0) return null;
  let closest = points[0] ?? null;
  for (const point of points) {
    if (closest === null || Math.abs(point.x - x) < Math.abs(closest.x - x)) {
      closest = point;
    }
  }
  return closest;
}

export function LineChart({
  title,
  description,
  xLabel,
  yLabel,
  series,
  cursorX,
  cursorPointIndex,
  compact = false,
  className = "",
  onCursorChange,
}: LineChartProps) {
  const [showTable, setShowTable] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const width = compact ? 390 : 640;
  const height = compact ? 210 : 300;
  const margin = compact
    ? { top: 28, right: 20, bottom: 42, left: 52 }
    : { top: 34, right: 30, bottom: 50, left: 64 };
  const allPoints = series.flatMap((item) => item.points);
  const dataXMin =
    allPoints.length > 0 ? Math.min(...allPoints.map((point) => point.x)) : 0;
  const dataXMax =
    allPoints.length > 0 ? Math.max(...allPoints.map((point) => point.x)) : 1;
  const [xMin, xMax] = extent(allPoints.map((point) => point.x));
  const [yMinRaw, yMaxRaw] = extent(
    allPoints.flatMap((point) => [
      point.low ?? point.value,
      point.high ?? point.value,
    ]),
  );
  const yMin = Math.min(0, yMinRaw);
  const yMax = yMaxRaw;
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const sx = (value: number) =>
    margin.left + ((value - xMin) / (xMax - xMin)) * plotWidth;
  const sy = (value: number) =>
    margin.top + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight;
  const ticks = useMemo(
    () => Array.from({ length: 5 }, (_, index) => index / 4),
    [],
  );
  const cursor =
    cursorX === undefined
      ? undefined
      : Math.max(dataXMin, Math.min(dataXMax, cursorX));
  const tableXValues = useMemo(
    () =>
      Array.from(new Set(allPoints.map((point) => point.x))).sort(
        (left, right) => left - right,
      ),
    [allPoints],
  );

  function handlePointer(clientX: number, target: SVGSVGElement) {
    if (!onCursorChange) return;
    const rect = target.getBoundingClientRect();
    const local = ((clientX - rect.left) / rect.width) * width;
    const ratio = Math.max(0, Math.min(1, (local - margin.left) / plotWidth));
    onCursorChange(xMin + ratio * (xMax - xMin));
  }

  return (
    <figure className={`line-chart ${className}`.trim()}>
      <div className="chart-heading">
        <figcaption id={titleId}>{title}</figcaption>
        <button type="button" onClick={() => setShowTable((value) => !value)}>
          {showTable ? "Show chart" : "Data table"}
        </button>
      </div>
      <p id={descriptionId} className="sr-only">
        {description}
      </p>
      {showTable ? (
        <div className="chart-table-wrap" tabIndex={0}>
          <table>
            <caption>{description}</caption>
            <thead>
              <tr>
                <th>{xLabel}</th>
                {series.flatMap((item) => [
                  <th key={`${item.label}-value`}>{item.label}</th>,
                  <th key={`${item.label}-lower`}>{item.label} lower 95%</th>,
                  <th key={`${item.label}-upper`}>{item.label} upper 95%</th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {tableXValues.map((xValue) => (
                <tr key={xValue}>
                  <td>{xValue.toFixed(2)}</td>
                  {series.flatMap((item) => {
                    const point = item.points.find(
                      (candidate) => candidate.x === xValue,
                    );
                    return [
                      <td key={`${item.label}-${xValue}-value`}>
                        {point?.value.toFixed(3) ?? "—"}
                      </td>,
                      <td key={`${item.label}-${xValue}-lower`}>
                        {point?.low?.toFixed(3) ?? "—"}
                      </td>,
                      <td key={`${item.label}-${xValue}-upper`}>
                        {point?.high?.toFixed(3) ?? "—"}
                      </td>,
                    ];
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-labelledby={`${titleId} ${descriptionId}`}
          tabIndex={onCursorChange ? 0 : undefined}
          onPointerMove={(event) =>
            handlePointer(event.clientX, event.currentTarget)
          }
          onKeyDown={(event) => {
            if (!onCursorChange || cursor === undefined) return;
            const step = (dataXMax - dataXMin) / 72;
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              onCursorChange(cursor - step);
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              onCursorChange(cursor + step);
            }
          }}
        >
          <defs>
            <linearGradient id={`${titleId}-band`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#33d2ee" stopOpacity="0.22" />
              <stop offset="1" stopColor="#33d2ee" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {ticks.map((ratio) => {
            const x = margin.left + ratio * plotWidth;
            const xValue = xMin + ratio * (xMax - xMin);
            return (
              <g key={`x-${ratio}`}>
                <line
                  className="chart-grid"
                  x1={x}
                  x2={x}
                  y1={margin.top}
                  y2={margin.top + plotHeight}
                />
                <text
                  className="chart-tick"
                  x={x}
                  y={height - 24}
                  textAnchor="middle"
                >
                  {Math.abs(xValue) >= 100
                    ? xValue.toFixed(0)
                    : xValue.toFixed(1)}
                </text>
              </g>
            );
          })}
          {ticks.map((ratio) => {
            const y = margin.top + (1 - ratio) * plotHeight;
            const yValue = yMin + ratio * (yMax - yMin);
            return (
              <g key={`y-${ratio}`}>
                <line
                  className="chart-grid"
                  x1={margin.left}
                  x2={margin.left + plotWidth}
                  y1={y}
                  y2={y}
                />
                <text
                  className="chart-tick"
                  x={margin.left - 9}
                  y={y + 4}
                  textAnchor="end"
                >
                  {Math.abs(yValue) >= 100
                    ? yValue.toFixed(0)
                    : yValue.toFixed(1)}
                </text>
              </g>
            );
          })}
          <line
            className="chart-axis"
            x1={margin.left}
            x2={margin.left + plotWidth}
            y1={margin.top + plotHeight}
            y2={margin.top + plotHeight}
          />
          <line
            className="chart-axis"
            x1={margin.left}
            x2={margin.left}
            y1={margin.top}
            y2={margin.top + plotHeight}
          />
          {series.map((item) => {
            const bandPoints = item.points.filter(
              (point) => point.low !== undefined && point.high !== undefined,
            );
            const band =
              bandPoints.length > 1
                ? [
                    ...bandPoints.map(
                      (point) =>
                        `${sx(point.x)},${sy(point.high ?? point.value)}`,
                    ),
                    ...bandPoints
                      .slice()
                      .reverse()
                      .map(
                        (point) =>
                          `${sx(point.x)},${sy(point.low ?? point.value)}`,
                      ),
                  ].join(" ")
                : "";
            const points = item.points
              .map((point) => `${sx(point.x)},${sy(point.value)}`)
              .join(" ");
            return (
              <g key={item.label}>
                {band ? (
                  <polygon points={band} fill={`url(#${titleId}-band)`} />
                ) : null}
                <polyline
                  points={points}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="2.1"
                  strokeDasharray={item.dashed ? "6 5" : undefined}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
          {cursor !== undefined ? (
            <g>
              <line
                className="chart-cursor"
                x1={sx(cursor)}
                x2={sx(cursor)}
                y1={margin.top}
                y2={margin.top + plotHeight}
              />
              {series.map((item) => {
                const point = interpolate(item.points, cursor);
                return point ? (
                  <circle
                    key={item.label}
                    cx={sx(point.x)}
                    cy={sy(point.value)}
                    r="3.7"
                    fill={item.color}
                    stroke="#071724"
                    strokeWidth="1.5"
                  />
                ) : null;
              })}
            </g>
          ) : null}
          {cursorPointIndex !== undefined ? (
            <g aria-hidden="true">
              {series.map((item) => {
                const point =
                  item.points[
                    Math.max(
                      0,
                      Math.min(item.points.length - 1, cursorPointIndex),
                    )
                  ];
                return point ? (
                  <circle
                    key={`${item.label}-indexed-cursor`}
                    className="chart-index-cursor"
                    cx={sx(point.x)}
                    cy={sy(point.value)}
                    r="5"
                    fill={item.color}
                    stroke="#ffffff"
                    strokeWidth="1.8"
                  />
                ) : null;
              })}
            </g>
          ) : null}
          <text
            className="chart-label"
            x={margin.left + plotWidth / 2}
            y={height - 5}
            textAnchor="middle"
          >
            {xLabel}
          </text>
          <text
            className="chart-label"
            x={15}
            y={margin.top + plotHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90 15 ${margin.top + plotHeight / 2})`}
          >
            {yLabel}
          </text>
        </svg>
      )}
      <ul className="chart-legend" aria-label="Chart legend">
        {series.map((item) => (
          <li key={item.label}>
            <span style={{ background: item.color }} /> {item.label}
          </li>
        ))}
      </ul>
    </figure>
  );
}

interface BarDatum {
  label: string;
  value: number;
  tone: "positive" | "negative";
}

export function SensitivityBars({ data }: { data: BarDatum[] }) {
  return (
    <ol
      className="sensitivity-bars"
      aria-label="Normalized one-at-a-time sensitivity values"
    >
      {data.map((item) => (
        <li
          className="sensitivity-row"
          key={item.label}
          aria-label={`${item.label}: ${item.value.toFixed(2)}, ${item.tone} influence`}
        >
          <span>{item.label}</span>
          <div aria-hidden="true">
            <i
              className={
                item.tone === "positive" ? "is-positive" : "is-negative"
              }
              style={{ width: `${Math.max(3, item.value * 100)}%` }}
            />
          </div>
          <strong>{item.value.toFixed(2)}</strong>
        </li>
      ))}
    </ol>
  );
}
