"use client";

import type { TestRunView } from "@hydrocycle/view-model";
import {
  getCoreRowModel,
  getSortedRowModel,
  legacyCreateColumnHelper,
  useLegacyTable,
  type LegacyColumnDef,
} from "@tanstack/react-table/legacy";
import { flexRender, type SortingState } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  Bot,
  CheckCircle2,
  GitCompareArrows,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AdvisorLens } from "../../components/advisor-lens";
import { useHydroCycle } from "../../state/app-state";

type DisplayState = "Draft" | "Needs evidence" | "Reviewed" | "Invalid";

function displayState(status: TestRunView["status"]): DisplayState {
  const states: Record<TestRunView["status"], DisplayState> = {
    draft: "Draft",
    needs_review: "Needs evidence",
    valid: "Reviewed",
    invalid: "Invalid",
  };
  return states[status];
}

function displayValue(value: number | null, digits = 2): string {
  return value === null ? "Missing" : value.toFixed(digits);
}

export const testRunFields = [
  { key: "totalH2MgL", label: "Total H₂", unit: "mg/L", digits: 2 },
  { key: "retainedH2MgL", label: "Retained H₂", unit: "mg/L", digits: 2 },
  {
    key: "retentionFraction",
    label: "Retention",
    unit: "%",
    digits: 1,
    scale: 100,
  },
  { key: "temperatureC", label: "Temperature", unit: "°C", digits: 1 },
  { key: "pressureKpa", label: "Pressure", unit: "kPa abs", digits: 1 },
  { key: "bubbleDiameterNm", label: "Bubble diameter", unit: "nm", digits: 0 },
] as const satisfies ReadonlyArray<{
  key: keyof TestRunView;
  label: string;
  unit: string;
  digits: number;
  scale?: number;
}>;

const column = legacyCreateColumnHelper<TestRunView>();

function fieldScale(field: (typeof testRunFields)[number]): number {
  return "scale" in field ? field.scale : 1;
}

export function TestRunsPage() {
  const { dataSource, runtime, state, dispatch, selectedRuns } =
    useHydroCycle();
  const queryClient = useQueryClient();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filter, setFilter] = useState("");
  const [advisorOpen, setAdvisorOpen] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const runsQuery = useQuery({
    queryKey: ["test-runs", runtime.mode],
    queryFn: ({ signal }) => dataSource.listTestRuns({ signal }),
  });
  const runs = runsQuery.data ?? [];
  const filteredRuns = useMemo(
    () =>
      runs.filter((run) =>
        `${run.name} ${run.status} ${run.sampleId ?? ""}`
          .toLowerCase()
          .includes(filter.toLowerCase()),
      ),
    [filter, runs],
  );
  const selected =
    runs.find((run) => run.id === state.selectedRunId) ??
    filteredRuns[0] ??
    null;
  const comparison = selectedRuns(runs);

  const columns = useMemo(
    () => [
      column.display({
        id: "select",
        header: "",
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={state.comparison.includes(row.original.id)}
            onChange={() =>
              dispatch({ type: "toggle-compare", id: row.original.id })
            }
            aria-label={`Select ${row.original.name} for comparison`}
          />
        ),
      }),
      column.accessor("name", {
        header: "Run",
        cell: (info) => <strong>{info.getValue()}</strong>,
      }),
      column.accessor("updatedAt", {
        header: "Updated",
        cell: (info) => new Date(info.getValue()).toLocaleString(),
      }),
      column.accessor("status", {
        header: "Status",
        cell: (info) => (
          <span className={`ledger-status ledger-status--${info.getValue()}`}>
            {displayState(info.getValue())}
          </span>
        ),
      }),
      ...testRunFields.slice(0, 5).map((field) =>
        column.accessor(field.key, {
          id: field.key,
          header: `${field.label} (${field.unit})`,
          cell: (info) => {
            const raw = info.getValue();
            const numeric =
              typeof raw === "number" ? raw * fieldScale(field) : null;
            return (
              <span className={numeric === null ? "is-missing" : ""}>
                {displayValue(numeric, field.digits)}
              </span>
            );
          },
        }),
      ),
      column.accessor("measurementDatasetCount", { header: "Datasets" }),
    ],
    [dispatch, state.comparison],
  );
  const table = useLegacyTable({
    data: filteredRuns,
    columns: columns as unknown as ReadonlyArray<
      LegacyColumnDef<TestRunView, unknown>
    >,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["test-runs", runtime.mode] });
  const createMutation = useMutation({
    mutationFn: () =>
      dataSource.createTestRun({
        name: `Run ${runs.length + 1}`,
        status: "draft",
        is_demo_synthetic: runtime.mode === "hosted",
      }),
    onSuccess: async (run) => {
      dispatch({ type: "select-run", id: run.id });
      await refresh();
    },
  });
  const validateMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Select a Test Run.");
      return dataSource.patchTestRun(selected.id, {
        expected_updated_at: selected.updatedAt,
        status: "valid",
      });
    },
    onSuccess: refresh,
  });

  async function exportSelected() {
    if (!selected) return;
    const artifact = await dataSource.exportTestRun(
      selected.id,
      selected.updatedAt,
    );
    const url = URL.createObjectURL(artifact.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = artifact.filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importFile(file: File) {
    await dataSource.importTestRun({ file });
    await refresh();
  }

  const chartData = useMemo(() => {
    const axes = new Set<number>();
    for (const run of comparison)
      for (const point of run.hydrogenDecaySeries ?? []) axes.add(point.timeS);
    return [...axes]
      .sort((a, b) => a - b)
      .map((timeS) => {
        const point: Record<string, number | null> = { timeS };
        comparison.forEach((run, index) => {
          point[index === 0 ? "base" : "candidate"] =
            run.hydrogenDecaySeries?.find((item) => item.timeS === timeS)
              ?.totalH2MgL ?? null;
        });
        return point;
      });
  }, [comparison]);

  return (
    <div className="test-runs-route">
      <header className="ledger-header">
        <h1>
          TEST RUNS <span>/ LEDGER</span>
        </h1>
        <div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={!runtime.capabilities.rawFileImport}
          >
            <Upload size={15} /> Import
          </button>
          <input
            className="sr-only"
            ref={fileRef}
            type="file"
            accept=".json,.csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importFile(file);
            }}
          />
          <button onClick={() => createMutation.mutate()}>
            <Plus size={15} /> New run
          </button>
          <button onClick={() => void exportSelected()} disabled={!selected}>
            <ArrowDownToLine size={15} /> Export
          </button>
          <button
            onClick={() => validateMutation.mutate()}
            disabled={!selected}
          >
            <CheckCircle2 size={15} /> Validate
          </button>
          <button className="is-primary">
            <GitCompareArrows size={15} /> Compare {comparison.length}/2
          </button>
          <button onClick={() => setAdvisorOpen(true)}>
            <Bot size={15} /> Ask advisor
          </button>
        </div>
      </header>
      {!runtime.capabilities.rawFileImport ? (
        <p className="capability-note">{runtime.capabilities.disabledReason}</p>
      ) : null}
      <div className={`ledger-layout ${advisorOpen ? "has-advisor" : ""}`}>
        <section className="ledger-main">
          <div className="ledger-tools">
            <span>FILTERS</span>
            <label>
              <Search size={15} />
              <input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Search runs…"
              />
            </label>
            <span>{filteredRuns.length} RUNS</span>
          </div>
          <div className="ledger-table-wrap">
            <table className="ledger-table">
              <thead>
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id}>
                    {group.headers.map((header) => (
                      <th key={header.id}>
                        <button
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </button>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={
                      selected?.id === row.original.id ? "is-selected" : ""
                    }
                    onClick={() =>
                      dispatch({ type: "select-run", id: row.original.id })
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {runsQuery.isLoading ? (
              <p className="ledger-empty">Loading evidence ledger…</p>
            ) : filteredRuns.length === 0 ? (
              <p className="ledger-empty">No Test Runs match this filter.</p>
            ) : null}
          </div>
          {selected ? (
            <section className="run-detail">
              <header>
                <div>
                  <h2>{selected.name}</h2>
                  <span
                    className={`ledger-status ledger-status--${selected.status}`}
                  >
                    {displayState(selected.status)}
                  </span>
                  <small>
                    {selected.persisted
                      ? "Local durable record"
                      : "Session / fixture record"}
                  </small>
                </div>
                <p>
                  Updated {new Date(selected.updatedAt).toLocaleString()} ·
                  Datasets {selected.measurementDatasetCount}
                </p>
              </header>
              <div className="run-detail__grid">
                <table>
                  <caption>MEASUREMENTS</caption>
                  <thead>
                    <tr>
                      <th>Parameter</th>
                      <th>Value</th>
                      <th>Units</th>
                      <th>Provenance / source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testRunFields.map((field) => {
                      const raw = selected[field.key];
                      const numeric =
                        typeof raw === "number"
                          ? raw * fieldScale(field)
                          : null;
                      return (
                        <tr key={field.key}>
                          <th scope="row">{field.label}</th>
                          <td className={numeric === null ? "is-missing" : ""}>
                            {displayValue(numeric, field.digits)}
                          </td>
                          <td>{field.unit}</td>
                          <td>
                            {selected.calibrationReference ??
                              selected.method ??
                              "Missing"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <dl>
                  <div>
                    <dt>STATUS</dt>
                    <dd>{displayState(selected.status)}</dd>
                  </div>
                  <div>
                    <dt>PROVENANCE</dt>
                    <dd>{selected.provenance.source ?? "Missing"}</dd>
                  </div>
                  <div>
                    <dt>RECORD TYPE</dt>
                    <dd>
                      {selected.persisted
                        ? "Durable record"
                        : "Session fixture"}
                    </dd>
                  </div>
                  <div>
                    <dt>REPRODUCIBLE</dt>
                    <dd>
                      {selected.simulationIds.length > 0
                        ? "Simulation linked"
                        : "Evidence only"}
                    </dd>
                  </div>
                  <div>
                    <dt>COMPARISON ELIGIBLE</dt>
                    <dd>Yes</dd>
                  </div>
                </dl>
              </div>
            </section>
          ) : null}
          <section className="comparison-deck">
            <header>
              <h2>EVIDENCE COMPARISON</h2>
              <div>
                <span>
                  <i className="base-dot" /> Base:{" "}
                  {comparison[0]?.name ?? "Select a run"}
                </span>
                <span>
                  <i className="candidate-dot" /> Candidate:{" "}
                  {comparison[1]?.name ?? "Select another run"}
                </span>
              </div>
            </header>
            {comparison.length === 2 ? (
              <div className="comparison-grid">
                <div className="comparison-chart">
                  <h3>TOTAL H₂ RETENTION OVER TIME</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid stroke="#1d3459" strokeDasharray="2 3" />
                      <XAxis dataKey="timeS" stroke="#7790b8" />
                      <YAxis stroke="#7790b8" />
                      <Tooltip
                        contentStyle={{
                          background: "#071225",
                          border: "1px solid #27446d",
                        }}
                      />
                      <Legend />
                      <Line dataKey="base" stroke="#13d7ee" dot={false} />
                      <Line dataKey="candidate" stroke="#ffb000" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <table>
                  <caption>ALIGNED FIELDS</caption>
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>Base</th>
                      <th>Candidate</th>
                      <th>Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testRunFields.map((field) => {
                      const baseRaw = comparison[0]?.[field.key];
                      const candidateRaw = comparison[1]?.[field.key];
                      const base =
                        typeof baseRaw === "number"
                          ? baseRaw * fieldScale(field)
                          : null;
                      const candidate =
                        typeof candidateRaw === "number"
                          ? candidateRaw * fieldScale(field)
                          : null;
                      return (
                        <tr key={field.key}>
                          <th>{field.label}</th>
                          <td>{displayValue(base, field.digits)}</td>
                          <td>{displayValue(candidate, field.digits)}</td>
                          <td>
                            {base === null || candidate === null
                              ? "Unavailable"
                              : (candidate - base).toFixed(field.digits)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>
                Select exactly two runs to compare commensurate evidence fields.
              </p>
            )}
          </section>
        </section>
        {advisorOpen ? (
          <AdvisorLens
            route="test-runs"
            runs={
              comparison.length > 0 ? comparison : selected ? [selected] : []
            }
            onClose={() => setAdvisorOpen(false)}
          />
        ) : null}
      </div>
    </div>
  );
}
