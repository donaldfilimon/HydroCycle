import {
  AlertTriangle,
  Check,
  ChevronRight,
  CircleX,
  Copy,
  Database,
  FileCheck,
  Gauge,
  LockKeyhole,
  Pencil,
  Play,
  Plus,
  Save,
  Search,
  Shield,
  Trash2,
  Upload,
} from "lucide-react";
import { type KeyboardEvent, useEffect, useMemo, useState } from "react";

import { LineChart } from "../components/Charts";
import type {
  SimulationView,
  TestRunMeasurementUncertainty,
  TestRunStatus,
  TestRunView,
} from "@hydrocycle/view-model";
import { makeRetentionTrace } from "@hydrocycle/view-model";

interface TestRunsScreenProps {
  runs: TestRunView[];
  selectedId: string;
  onSelect: (id: string) => void;
  onDirtyChange: (dirty: boolean) => void;
  onSave: (run: TestRunView) => Promise<boolean>;
  onNew: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onImport: () => void;
  linkedSimulation: SimulationView | null;
  cfdExportAvailable: boolean;
  onExportCfd: (run: TestRunView) => Promise<boolean>;
}

const tabs = [
  "Provenance",
  "Loading",
  "Bubbles",
  "Retention",
  "Engine trace",
] as const;
type RunTab = (typeof tabs)[number];

function runTabId(tab: RunTab) {
  return `run-tab-${tab.toLowerCase().replaceAll(" ", "-")}`;
}

function statusLabel(status: TestRunStatus) {
  if (status === "needs_review") return "Needs review";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function StatusIcon({ status }: { status: TestRunStatus }) {
  if (status === "valid")
    return <Check className="status-valid" size={17} aria-label="Valid" />;
  if (status === "invalid")
    return (
      <CircleX className="status-invalid" size={17} aria-label="Invalid" />
    );
  return (
    <AlertTriangle
      className="status-review"
      size={17}
      aria-label={statusLabel(status)}
    />
  );
}

function TextInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string | number | null;
  onChange: (value: string) => void;
}) {
  return (
    <label className="run-field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        value={value ?? ""}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

function DataQualityRow({
  title,
  status,
  open = false,
  children,
}: {
  title: string;
  status: "pass" | "warn" | "fail";
  open?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <details className="quality-row" open={open}>
      <summary>
        <ChevronRight size={15} aria-hidden="true" />
        <span>{title}</span>
        <span className="sr-only">
          Status:{" "}
          {status === "pass"
            ? "passed"
            : status === "warn"
              ? "review required"
              : "failed"}
        </span>
        {status === "pass" ? (
          <Check className="status-valid" size={17} aria-hidden="true" />
        ) : null}
        {status === "warn" ? (
          <AlertTriangle
            className="status-review"
            size={17}
            aria-hidden="true"
          />
        ) : null}
        {status === "fail" ? (
          <CircleX className="status-invalid" size={17} aria-hidden="true" />
        ) : null}
      </summary>
      {children ? <div className="quality-row__body">{children}</div> : null}
    </details>
  );
}

export function TestRunsScreen({
  runs,
  selectedId,
  onSelect,
  onDirtyChange,
  onSave,
  onNew,
  onDuplicate,
  onDelete,
  onImport,
  linkedSimulation,
  cfdExportAvailable,
  onExportCfd,
}: TestRunsScreenProps) {
  const selected = runs.find((run) => run.id === selectedId) ?? runs[0];
  const [draft, setDraft] = useState<TestRunView | null>(selected ?? null);
  const [dirty, setDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<RunTab>("Provenance");
  const [filter, setFilter] = useState("");
  const [cursorS, setCursorS] = useState(900);
  const [qualityExpanded, setQualityExpanded] = useState(false);

  useEffect(() => {
    setDraft(selected ?? null);
    setDirty(false);
    onDirtyChange(false);
  }, [onDirtyChange, selected]);

  const visibleRuns = useMemo(
    () =>
      runs.filter((run) =>
        run.name.toLowerCase().includes(filter.toLowerCase()),
      ),
    [filter, runs],
  );
  const trace = useMemo(
    () => (draft ? makeRetentionTrace(draft) : { measured: [], modeled: [] }),
    [draft],
  );
  const retentionResiduals = useMemo(
    () =>
      trace.measured.map((measured) => {
        const modeled = trace.modeled.reduce(
          (best, point) =>
            Math.abs(point.x - measured.x) < Math.abs(best.x - measured.x)
              ? point
              : best,
          trace.modeled[0] ?? { x: measured.x, value: measured.value },
        );
        return {
          x: measured.x,
          value: measured.value - modeled.value,
          ...(measured.low === undefined
            ? {}
            : { low: measured.low - modeled.value }),
          ...(measured.high === undefined
            ? {}
            : { high: measured.high - modeled.value }),
        };
      }),
    [trace.measured, trace.modeled],
  );
  if (!draft) return <div className="empty-state">No test runs yet.</div>;

  function patchDraft(patch: Partial<TestRunView>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    setDirty(true);
    onDirtyChange(true);
  }

  function patchStandardUncertainty(
    field: keyof TestRunMeasurementUncertainty,
    value: string,
  ) {
    setDraft((current) =>
      current
        ? {
            ...current,
            standardUncertainty: {
              ...current.standardUncertainty,
              [field]: value === "" ? null : Number(value),
            },
          }
        : current,
    );
    setDirty(true);
    onDirtyChange(true);
  }

  function requestRunSelection(id: string) {
    if (id === selectedId) return;
    onSelect(id);
  }

  async function saveAsDraft() {
    const current = draft;
    if (!current) return;
    const next: TestRunView = { ...current, status: "draft" };
    setDraft(next);
    setDirty(true);
    onDirtyChange(true);
    if (await onSave(next)) {
      setDirty(false);
      onDirtyChange(false);
    }
  }

  function moveRunTab(
    event: KeyboardEvent<HTMLButtonElement>,
    current: RunTab,
  ) {
    let nextIndex: number | null = null;
    const currentIndex = tabs.indexOf(current);
    if (event.key === "ArrowRight")
      nextIndex = (currentIndex + 1) % tabs.length;
    if (event.key === "ArrowLeft")
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = tabs[nextIndex];
    if (!next) return;
    setActiveTab(next);
    window.requestAnimationFrame(() =>
      document.getElementById(runTabId(next))?.focus(),
    );
  }

  const residual =
    draft.totalH2MgL !== null &&
    draft.retainedH2MgL !== null &&
    draft.releasedH2MgL !== null &&
    draft.unaccountedH2MgL !== null
      ? draft.totalH2MgL -
        draft.retainedH2MgL -
        draft.releasedH2MgL -
        draft.unaccountedH2MgL
      : null;
  const relativeResidual =
    residual !== null && draft.totalH2MgL !== null && draft.totalH2MgL > 0
      ? Math.abs(residual) / draft.totalH2MgL
      : null;
  const valuesArePhysical = [
    draft.totalH2MgL,
    draft.retainedH2MgL,
    draft.releasedH2MgL,
    draft.unaccountedH2MgL,
  ].every((value) => value === null || (Number.isFinite(value) && value >= 0));
  const massBalanceValid =
    relativeResidual !== null && relativeResidual <= 0.005;
  const hasCalibration = Boolean(draft.calibrationReference);
  const hasRetention =
    draft.hydrogenDecaySeries !== null &&
    draft.hydrogenDecaySeries.length >= 2 &&
    draft.retainedH2MgL !== null &&
    draft.elapsedS !== null;
  const selectedMeasured = trace.measured.reduce(
    (best, point) =>
      Math.abs(point.x - cursorS) < Math.abs(best.x - cursorS) ? point : best,
    trace.measured[0] ?? { x: 0, value: 0 },
  );
  const selectedModeled = trace.modeled.reduce(
    (best, point) =>
      Math.abs(point.x - cursorS) < Math.abs(best.x - cursorS) ? point : best,
    trace.modeled[0] ?? { x: 0, value: 0 },
  );

  return (
    <div className="test-runs-screen">
      <aside className="runs-list" aria-label="Test runs">
        <div className="runs-list__heading">
          <h1>Runs</h1>
          <button
            className="icon-button"
            type="button"
            onClick={onNew}
            aria-label="New run"
          >
            <Plus size={17} />
          </button>
        </div>
        <label className="run-filter">
          <Search size={15} aria-hidden="true" />
          <span className="sr-only">Filter runs</span>
          <input
            value={filter}
            placeholder="Filter runs"
            onChange={(event) => setFilter(event.currentTarget.value)}
          />
        </label>
        <div className="runs-table-wrap">
          <table className="runs-table">
            <thead>
              <tr>
                <th>Run</th>
                <th>Timestamp</th>
                <th>State</th>
                <th>H₂ mg/L</th>
                <th>Gate</th>
              </tr>
            </thead>
            <tbody>
              {visibleRuns.map((run) => (
                <tr
                  className={run.id === selectedId ? "is-selected" : ""}
                  key={run.id}
                >
                  <td>
                    <button
                      type="button"
                      onClick={() => requestRunSelection(run.id)}
                    >
                      {run.name}
                    </button>
                  </td>
                  <td>
                    {new Date(run.timestamp).toLocaleDateString()}
                    <small>
                      {new Date(run.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                  </td>
                  <td>
                    <span className={`run-status run-status--${run.status}`}>
                      {statusLabel(run.status)}
                    </span>
                  </td>
                  <td>{run.totalH2MgL?.toFixed(2) ?? "—"}</td>
                  <td>
                    <StatusIcon status={run.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="synthetic-notice">
          All seeded examples are demo / synthetic.
        </p>
      </aside>

      <section className="run-workspace">
        <header className="run-workspace__header">
          <div>
            <h1>
              {draft.name} <span>— {statusLabel(draft.status)}</span>
            </h1>
            <Pencil size={14} aria-hidden="true" />
            {draft.synthetic ? <em>Demo / synthetic</em> : null}
          </div>
          <div>
            <button
              className="button button--quiet"
              type="button"
              onClick={() => onDuplicate(draft.id)}
            >
              <Copy size={14} /> Duplicate
            </button>
            <button
              className="button button--danger"
              type="button"
              onClick={() => onDelete(draft.id)}
            >
              <Trash2 size={14} /> Delete
            </button>
            <button
              className="button button--primary"
              type="button"
              disabled={!dirty}
              onClick={() =>
                void onSave(draft).then((saved) => {
                  if (saved) {
                    setDirty(false);
                    onDirtyChange(false);
                  }
                })
              }
            >
              <Save size={14} /> Save
            </button>
            {dirty ? (
              <span className="dirty-indicator">
                <i /> Unsaved changes
              </span>
            ) : null}
          </div>
        </header>

        <div
          className="run-tabs"
          role="tablist"
          aria-label="Run record sections"
        >
          {tabs.map((tab) => (
            <button
              id={runTabId(tab)}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls="run-tabpanel"
              tabIndex={activeTab === tab ? 0 : -1}
              className={activeTab === tab ? "is-active" : ""}
              type="button"
              key={tab}
              onClick={() => setActiveTab(tab)}
              onKeyDown={(event) => moveRunTab(event, tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <section
          id="run-tabpanel"
          className="run-form"
          role="tabpanel"
          aria-labelledby={runTabId(activeTab)}
        >
          {activeTab === "Provenance" ? (
            <>
              <div>
                <TextInput
                  id="run-name"
                  label="Run identity"
                  value={draft.name}
                  onChange={(value) => patchDraft({ name: value })}
                />
                <TextInput
                  id="operator"
                  label="Operator"
                  value={draft.operator}
                  onChange={(value) => patchDraft({ operator: value || null })}
                />
                <TextInput
                  id="sample-id"
                  label="Sample ID"
                  value={draft.sampleId}
                  onChange={(value) => patchDraft({ sampleId: value || null })}
                />
                <TextInput
                  id="method"
                  label="Method"
                  value={draft.method}
                  onChange={(value) => patchDraft({ method: value || null })}
                />
                <TextInput
                  id="calibration"
                  label="Calibration record"
                  value={draft.calibrationReference}
                  onChange={(value) =>
                    patchDraft({ calibrationReference: value || null })
                  }
                />
              </div>
              <div>
                <TextInput
                  id="total-h2"
                  label="Total H₂ (mg/L)"
                  value={draft.totalH2MgL}
                  onChange={(value) =>
                    patchDraft({
                      totalH2MgL: value === "" ? null : Number(value),
                    })
                  }
                />
                <TextInput
                  id="total-h2-uncertainty"
                  label="Total H₂ standard uncertainty (mg/L)"
                  value={draft.standardUncertainty.totalH2MgL}
                  onChange={(value) =>
                    patchStandardUncertainty("totalH2MgL", value)
                  }
                />
                <TextInput
                  id="temperature"
                  label="Temperature (°C)"
                  value={draft.temperatureC}
                  onChange={(value) =>
                    patchDraft({
                      temperatureC: value === "" ? null : Number(value),
                    })
                  }
                />
                <TextInput
                  id="temperature-uncertainty"
                  label="Temperature standard uncertainty (°C)"
                  value={draft.standardUncertainty.temperatureC}
                  onChange={(value) =>
                    patchStandardUncertainty("temperatureC", value)
                  }
                />
                <TextInput
                  id="pressure"
                  label="Pressure (kPa abs)"
                  value={draft.pressureKpa}
                  onChange={(value) =>
                    patchDraft({
                      pressureKpa: value === "" ? null : Number(value),
                    })
                  }
                />
                <TextInput
                  id="pressure-uncertainty"
                  label="Pressure standard uncertainty (kPa)"
                  value={draft.standardUncertainty.pressureKpa}
                  onChange={(value) =>
                    patchStandardUncertainty("pressureKpa", value)
                  }
                />
                <TextInput
                  id="elapsed"
                  label="Elapsed time (s)"
                  value={draft.elapsedS}
                  onChange={(value) =>
                    patchDraft({
                      elapsedS: value === "" ? null : Number(value),
                    })
                  }
                />
                <TextInput
                  id="elapsed-uncertainty"
                  label="Elapsed-time standard uncertainty (s)"
                  value={draft.standardUncertainty.elapsedS}
                  onChange={(value) =>
                    patchStandardUncertainty("elapsedS", value)
                  }
                />
              </div>
              <div>
                <TextInput
                  id="bubble-diameter-run"
                  label="Median diameter (nm)"
                  value={draft.bubbleDiameterNm}
                  onChange={(value) =>
                    patchDraft({
                      bubbleDiameterNm: value === "" ? null : Number(value),
                    })
                  }
                />
                <TextInput
                  id="bubble-diameter-uncertainty"
                  label="Diameter standard uncertainty (nm)"
                  value={draft.standardUncertainty.bubbleDiameterNm}
                  onChange={(value) =>
                    patchStandardUncertainty("bubbleDiameterNm", value)
                  }
                />
                <TextInput
                  id="bubble-count-run"
                  label="Number concentration (#/mL)"
                  value={draft.numberPerMl}
                  onChange={(value) =>
                    patchDraft({
                      numberPerMl: value === "" ? null : Number(value),
                    })
                  }
                />
                <TextInput
                  id="bubble-count-uncertainty"
                  label="Count standard uncertainty (#/mL)"
                  value={draft.standardUncertainty.numberPerMl}
                  onChange={(value) =>
                    patchStandardUncertainty("numberPerMl", value)
                  }
                />
                <TextInput
                  id="retained-run"
                  label="Retained H₂ (mg/L)"
                  value={draft.retainedH2MgL}
                  onChange={(value) =>
                    patchDraft({
                      retainedH2MgL: value === "" ? null : Number(value),
                    })
                  }
                />
                <TextInput
                  id="retained-uncertainty"
                  label="Retained H₂ standard uncertainty (mg/L)"
                  value={draft.standardUncertainty.retainedH2MgL}
                  onChange={(value) =>
                    patchStandardUncertainty("retainedH2MgL", value)
                  }
                />
                <TextInput
                  id="released-run"
                  label="Released H₂ (mg/L)"
                  value={draft.releasedH2MgL}
                  onChange={(value) =>
                    patchDraft({
                      releasedH2MgL: value === "" ? null : Number(value),
                    })
                  }
                />
                <TextInput
                  id="released-uncertainty"
                  label="Released H₂ standard uncertainty (mg/L)"
                  value={draft.standardUncertainty.releasedH2MgL}
                  onChange={(value) =>
                    patchStandardUncertainty("releasedH2MgL", value)
                  }
                />
                <TextInput
                  id="unaccounted-run"
                  label="Unaccounted H₂ (mg/L)"
                  value={draft.unaccountedH2MgL}
                  onChange={(value) =>
                    patchDraft({
                      unaccountedH2MgL: value === "" ? null : Number(value),
                    })
                  }
                />
                <TextInput
                  id="unaccounted-uncertainty"
                  label="Unaccounted H₂ standard uncertainty (mg/L)"
                  value={draft.standardUncertainty.unaccountedH2MgL}
                  onChange={(value) =>
                    patchStandardUncertainty("unaccountedH2MgL", value)
                  }
                />
                <label className="run-field" htmlFor="run-status">
                  <span>Review status</span>
                  <select
                    id="run-status"
                    value={draft.status}
                    onChange={(event) =>
                      patchDraft({
                        status: event.currentTarget.value as TestRunStatus,
                      })
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="needs_review">Needs review</option>
                    <option value="valid">Valid</option>
                    <option value="invalid">Invalid</option>
                  </select>
                </label>
              </div>
              <button className="drop-zone" type="button" onClick={onImport}>
                <Upload size={24} />
                <span>
                  <strong>Drop pressure trace CSV</strong>
                  <small>or choose a bounded canonical import</small>
                </span>
              </button>
            </>
          ) : null}
          {activeTab === "Loading" ? (
            <div className="run-tab-grid">
              <TextInput
                id="loading-total-h2"
                label="Measured total H₂ (mg/L)"
                value={draft.totalH2MgL}
                onChange={(value) =>
                  patchDraft({
                    totalH2MgL: value === "" ? null : Number(value),
                  })
                }
              />
              <TextInput
                id="loading-total-h2-uncertainty"
                label="Standard uncertainty (mg/L)"
                value={draft.standardUncertainty.totalH2MgL}
                onChange={(value) =>
                  patchStandardUncertainty("totalH2MgL", value)
                }
              />
              <TextInput
                id="loading-retained-h2"
                label="Retained at intake (mg/L)"
                value={draft.retainedH2MgL}
                onChange={(value) =>
                  patchDraft({
                    retainedH2MgL: value === "" ? null : Number(value),
                  })
                }
              />
              <TextInput
                id="loading-released-h2"
                label="Released H₂ (mg/L)"
                value={draft.releasedH2MgL}
                onChange={(value) =>
                  patchDraft({
                    releasedH2MgL: value === "" ? null : Number(value),
                  })
                }
              />
              <TextInput
                id="loading-unaccounted-h2"
                label="Unaccounted H₂ (mg/L)"
                value={draft.unaccountedH2MgL}
                onChange={(value) =>
                  patchDraft({
                    unaccountedH2MgL: value === "" ? null : Number(value),
                  })
                }
              />
              <div className="tab-scope-note">
                <FileCheck size={20} />
                <p>
                  Authoritative total-H₂ mass measurements replace derived
                  dissolved-plus-bubble loading. Missing values remain null.
                </p>
              </div>
            </div>
          ) : null}
          {activeTab === "Bubbles" ? (
            <div className="run-tab-grid">
              <TextInput
                id="bubbles-diameter"
                label="Median diameter (nm)"
                value={draft.bubbleDiameterNm}
                onChange={(value) =>
                  patchDraft({
                    bubbleDiameterNm: value === "" ? null : Number(value),
                  })
                }
              />
              <TextInput
                id="bubbles-diameter-uncertainty"
                label="Diameter standard uncertainty (nm)"
                value={draft.standardUncertainty.bubbleDiameterNm}
                onChange={(value) =>
                  patchStandardUncertainty("bubbleDiameterNm", value)
                }
              />
              <TextInput
                id="bubbles-count"
                label="Number concentration (#/mL)"
                value={draft.numberPerMl}
                onChange={(value) =>
                  patchDraft({
                    numberPerMl: value === "" ? null : Number(value),
                  })
                }
              />
              <TextInput
                id="bubbles-count-uncertainty"
                label="Count standard uncertainty (#/mL)"
                value={draft.standardUncertainty.numberPerMl}
                onChange={(value) =>
                  patchStandardUncertainty("numberPerMl", value)
                }
              />
              <button className="drop-zone" type="button" onClick={onImport}>
                <Upload size={24} />
                <span>
                  <strong>Import bubble_distribution.csv</strong>
                  <small>
                    Bounded diagnostic series with calibration reference
                  </small>
                </span>
              </button>
              <div className="tab-scope-note">
                <AlertTriangle size={20} />
                <p>
                  {draft.bubbleDistribution?.length
                    ? `${draft.bubbleDistribution.length} imported size/count bins are attached. `
                    : "No imported bubble-distribution bins are attached. "}
                  Size and count cannot establish gas identity or total H₂
                  without an orthogonal measurement. The model applies visible,
                  wide per-bin uncertainty assumptions when these diagnostics
                  are used.
                </p>
              </div>
            </div>
          ) : null}
          {activeTab === "Retention" ? (
            <div className="run-tab-grid">
              <TextInput
                id="retention-elapsed"
                label="Elapsed time (s)"
                value={draft.elapsedS}
                onChange={(value) =>
                  patchDraft({ elapsedS: value === "" ? null : Number(value) })
                }
              />
              <TextInput
                id="retention-elapsed-uncertainty"
                label="Elapsed-time standard uncertainty (s)"
                value={draft.standardUncertainty.elapsedS}
                onChange={(value) =>
                  patchStandardUncertainty("elapsedS", value)
                }
              />
              <div className="run-field run-field--derived">
                <span>Retained fraction (derived)</span>
                <output>
                  {draft.retentionFraction === null
                    ? "Not computable"
                    : draft.retentionFraction.toFixed(4)}
                </output>
                <small>
                  Computed from retained and total H₂; it is not stored as an
                  independent measurement.
                </small>
              </div>
              <TextInput
                id="retention-calibration"
                label="Calibration / method reference"
                value={draft.calibrationReference}
                onChange={(value) =>
                  patchDraft({ calibrationReference: value || null })
                }
              />
              <button className="drop-zone" type="button" onClick={onImport}>
                <Upload size={24} />
                <span>
                  <strong>Import hydrogen_decay.csv</strong>
                  <small>
                    Time, total H₂, and uncertainty; monotonic axis required
                  </small>
                </span>
              </button>
              <div className="tab-scope-note">
                <Database size={20} />
                <p>
                  {draft.hydrogenDecaySeries?.length
                    ? `${draft.hydrogenDecaySeries.length} measured decay points attached.`
                    : "No measured decay series attached; retention is not inferred as a measurement."}
                </p>
              </div>
            </div>
          ) : null}
          {activeTab === "Engine trace" ? (
            <div className="run-tab-grid">
              <TextInput
                id="engine-trace-calibration"
                label="Pressure calibration reference"
                value={draft.calibrationReference}
                onChange={(value) =>
                  patchDraft({ calibrationReference: value || null })
                }
              />
              <div className="tab-scope-note">
                <Gauge size={22} />
                <p>
                  {draft.pressureTrace?.length
                    ? `${draft.pressureTrace.length} calibrated crank-angle pressure points attached.`
                    : "No calibrated pressure trace attached. Modeled pressure cannot be treated as hardware-predictive."}
                </p>
              </div>
              <button className="drop-zone" type="button" onClick={onImport}>
                <Upload size={24} />
                <span>
                  <strong>Import pressure_trace.csv</strong>
                  <small>Crank angle, pressure, and stated uncertainty</small>
                </span>
              </button>
            </div>
          ) : null}
        </section>

        <section
          className="comparison-theater"
          aria-labelledby="comparison-title"
        >
          <div className="comparison-theater__heading">
            <h2 id="comparison-title">Measured vs. modeled</h2>
            <span>
              <input type="checkbox" checked readOnly /> Show uncertainty
            </span>
            <span>
              <input type="checkbox" checked readOnly /> Synchronized cursor
            </span>
          </div>
          <div className="comparison-grid">
            <div>
              <LineChart
                title="Total H₂ retention over time"
                description={`${draft.synthetic ? "Synthetic demo" : "Imported measured"} total-hydrogen series with uncertainty and a visibly labeled browser-side endpoint-fit preview. The preview is not a saved backend result.`}
                xLabel="Time (s)"
                yLabel="Total H₂ (mg/L)"
                series={[
                  {
                    label: draft.synthetic
                      ? "Synthetic measured series"
                      : "Measured total H₂",
                    color: "#24d5e8",
                    points: trace.measured,
                  },
                  {
                    label: "First-order endpoint-fit preview",
                    color: "#2c78ff",
                    points: trace.modeled,
                  },
                ]}
                cursorX={cursorS}
                onCursorChange={setCursorS}
              />
              {trace.measured.length === 0 ? (
                <p className="missing-series" role="status">
                  No hydrogen-decay series is attached. Missing measurements
                  remain null; no measured points are synthesized.
                </p>
              ) : null}
            </div>
            {draft.pressureTrace && draft.pressureTrace.length > 1 ? (
              <LineChart
                title="Cylinder pressure vs. crank angle"
                description="Imported calibrated cylinder-pressure measurements with uncertainty."
                xLabel="Crank angle (deg)"
                yLabel="Pressure (bar)"
                series={[
                  {
                    label: "Measured pressure",
                    color: "#25c9ed",
                    points: draft.pressureTrace.map((point) => ({
                      x: point.crankAngleDeg,
                      value: point.pressureBar,
                      low: point.pressureBar - 1.96 * point.uncertaintyBar,
                      high: point.pressureBar + 1.96 * point.uncertaintyBar,
                    })),
                  },
                ]}
              />
            ) : (
              <section
                className="pressure-placeholder"
                aria-labelledby="pressure-placeholder-title"
              >
                <h3 id="pressure-placeholder-title">
                  Cylinder pressure vs. crank angle
                </h3>
                <div>
                  <Gauge size={48} aria-hidden="true" />
                  <strong>No calibrated pressure trace attached</strong>
                  <p>
                    A proposed reactive comparison also remains unavailable
                    until the feasibility gate passes.
                  </p>
                </div>
              </section>
            )}
          </div>
          <div className="residual-chart-panel">
            <LineChart
              compact
              title="Retention residuals"
              description="Measured total hydrogen minus the nearest browser-side endpoint-fit preview value, with measurement uncertainty where available. This diagnostic is not a saved backend result."
              xLabel="Time (s)"
              yLabel="Measured − model (mg/L)"
              series={[
                {
                  label: "Retention residual",
                  color: "#f5a623",
                  points: retentionResiduals,
                },
                {
                  label: "Zero residual",
                  color: "#91a7b5",
                  dashed: true,
                  points:
                    retentionResiduals.length > 0
                      ? [
                          { x: retentionResiduals[0]?.x ?? 0, value: 0 },
                          {
                            x:
                              retentionResiduals[retentionResiduals.length - 1]
                                ?.x ?? 0,
                            value: 0,
                          },
                        ]
                      : [],
                },
              ]}
              cursorX={cursorS}
              onCursorChange={setCursorS}
            />
            {retentionResiduals.length === 0 ? (
              <p className="missing-series" role="status">
                Residuals require both a measured decay series and a comparable
                retention model; no values are synthesized.
              </p>
            ) : null}
          </div>
          <div className="comparison-ledger">
            <div>
              <strong>Legend &amp; scope</strong>
              <span>
                <i className="legend-measured" />{" "}
                {draft.synthetic ? "Synthetic measured demo" : "Measured data"}
              </span>
              <span>
                <i className="legend-model" /> Endpoint-fit preview
              </span>
              <small>
                Browser-side diagnostic only; the linked backend result below is
                authoritative. Single-zone schematic, not CFD.
              </small>
            </div>
            <div>
              <strong>Conservation check</strong>
              <span>Initial = retained + released + unaccounted</span>
              <dl>
                <div>
                  <dt>Initial</dt>
                  <dd>{draft.totalH2MgL?.toFixed(2) ?? "—"} mg/L</dd>
                </div>
                <div>
                  <dt>Retained</dt>
                  <dd>{draft.retainedH2MgL?.toFixed(2) ?? "—"} mg/L</dd>
                </div>
                <div>
                  <dt>Released</dt>
                  <dd>{draft.releasedH2MgL?.toFixed(2) ?? "—"} mg/L</dd>
                </div>
                <div>
                  <dt>Unaccounted</dt>
                  <dd>{draft.unaccountedH2MgL?.toFixed(2) ?? "—"} mg/L</dd>
                </div>
              </dl>
            </div>
            <div className={!massBalanceValid ? "is-warning" : ""}>
              <strong>Mass-balance residual</strong>
              <span>
                {residual === null
                  ? "Not computable"
                  : `${residual.toFixed(3)} mg/L`}
              </span>
              <small>
                {residual === null
                  ? "Missing values remain null."
                  : `${((relativeResidual ?? 0) * 100).toFixed(2)}% of initial; ${massBalanceValid ? "within 0.5%." : "review required."}`}
              </small>
            </div>
            <div>
              <strong>Crosshair readout</strong>
              <span>
                Time{" "}
                {trace.measured.length
                  ? `${selectedMeasured.x.toFixed(0)} s`
                  : "—"}
              </span>
              <span>
                Measured{" "}
                {trace.measured.length
                  ? `${selectedMeasured.value.toFixed(3)} mg/L`
                  : "null"}
              </span>
              <span>
                Model{" "}
                {trace.modeled.length
                  ? `${selectedModeled.value.toFixed(3)} mg/L`
                  : "null"}
              </span>
            </div>
            <div className={linkedSimulation ? "" : "is-warning"}>
              <strong>Linked backend evaluation</strong>
              {linkedSimulation ? (
                <>
                  <span>
                    {linkedSimulation.gate.passed
                      ? "Gate passed"
                      : `Gate failed: ${linkedSimulation.gate.failures.join(" + ")}`}
                  </span>
                  <span>
                    Total H₂{" "}
                    {linkedSimulation.loading.initialTotalMgL.toFixed(3)}
                    {" mg/L · retained "}
                    {linkedSimulation.loading.retainedMgL.toFixed(3)} mg/L
                  </span>
                  <small>
                    Result {linkedSimulation.resultHash.slice(0, 12)}…;
                    generated by the localhost evidence-gated model.
                  </small>
                </>
              ) : (
                <small>
                  No current backend evaluation is linked to this run. Validate
                  measurements, then run the selected Test Run from Workbench.
                </small>
              )}
            </div>
          </div>
        </section>
      </section>

      <aside className="quality-rail" aria-label="Data quality and actions">
        <div className="quality-rail__heading">
          <h2>Data quality</h2>
          <button
            type="button"
            aria-expanded={qualityExpanded}
            onClick={() => setQualityExpanded((value) => !value)}
          >
            {qualityExpanded ? "Collapse all" : "Expand all"}
          </button>
        </div>
        <DataQualityRow title="Units" status="pass" open={qualityExpanded}>
          <p>
            Canonical SI conversion is available and original display units are
            preserved.
          </p>
        </DataQualityRow>
        <DataQualityRow
          title="Calibration"
          status={hasCalibration ? "pass" : "fail"}
          open={qualityExpanded}
        >
          <p>
            {hasCalibration
              ? draft.calibrationReference
              : "A calibration reference is required for review."}
          </p>
        </DataQualityRow>
        <DataQualityRow title="Replicates" status="warn" open={qualityExpanded}>
          <div className="quality-warning">
            <AlertTriangle size={17} />
            <span>
              <strong>No replicate measurement</strong>
              <p>
                At least one replicate is recommended for uncertainty
                estimation.
              </p>
            </span>
          </div>
        </DataQualityRow>
        <DataQualityRow
          title="Mass balance"
          status={
            massBalanceValid ? "pass" : valuesArePhysical ? "warn" : "fail"
          }
          open={qualityExpanded}
        >
          <p>
            Residual: {residual?.toFixed(3) ?? "not computable"} mg/L. Values
            must be finite, nonnegative, and close within 0.5%.
          </p>
        </DataQualityRow>
        <DataQualityRow
          title="Provenance"
          status={draft.operator && draft.method ? "pass" : "warn"}
          open={qualityExpanded}
        >
          <p>Operator and method must remain attached to exported results.</p>
        </DataQualityRow>

        <section className="source-list">
          <h3>Source / provenance</h3>
          <div>
            <FileCheck size={15} />
            <span>
              Canonical run record
              <small>
                {draft.persisted
                  ? `${draft.name}.json · SQLite`
                  : `${draft.name} · volatile demo/draft`}
              </small>
            </span>
            {draft.persisted ? (
              <Check className="status-valid" size={15} />
            ) : (
              <AlertTriangle className="status-review" size={15} />
            )}
          </div>
          <div>
            <FileCheck size={15} />
            <span>
              Calibration record
              <small>{draft.calibrationReference ?? "Not attached"}</small>
            </span>
            {hasCalibration ? (
              <Check className="status-valid" size={15} />
            ) : (
              <AlertTriangle className="status-review" size={15} />
            )}
          </div>
          <div>
            <FileCheck size={15} />
            <span>
              Retention series
              <small>
                {hasRetention
                  ? draft.synthetic
                    ? "Synthetic demo series"
                    : "Imported measured series"
                  : "Not attached"}
              </small>
            </span>
            {hasRetention ? (
              <Check className="status-valid" size={15} />
            ) : (
              <AlertTriangle className="status-review" size={15} />
            )}
          </div>
          {draft.attachmentHashes.map((hash) => (
            <div key={hash}>
              <FileCheck size={15} />
              <span>
                Attachment SHA-256<small>{hash}</small>
              </span>
              <Check className="status-valid" size={15} />
            </div>
          ))}
        </section>

        <section className="quality-actions">
          <h3>Actions</h3>
          <button
            className="button button--quiet"
            type="button"
            onClick={() => void saveAsDraft()}
          >
            Save as draft
          </button>
          <button
            className="button button--primary"
            type="button"
            onClick={() => {
              const status: TestRunStatus = !valuesArePhysical
                ? "invalid"
                : hasCalibration &&
                    hasRetention &&
                    massBalanceValid &&
                    Boolean(draft.operator) &&
                    Boolean(draft.method)
                  ? "valid"
                  : "needs_review";
              const next = { ...draft, status };
              setDraft(next);
              setDirty(true);
              onDirtyChange(true);
              void onSave(next).then((saved) => {
                if (saved) {
                  setDirty(false);
                  onDirtyChange(false);
                }
              });
            }}
          >
            <Play size={15} /> Validate &amp; compare
          </button>
          <p className="action-reason">
            Validation persists the measurement review state. Workbench’s Run
            model action then consumes this selected run’s loading and retention
            evidence and links the backend result here.
          </p>
          <button
            className="button button--outline"
            type="button"
            disabled={!cfdExportAvailable}
            aria-describedby="cfd-export-reason"
            onClick={() => void onExportCfd(draft)}
          >
            Export neutral 0D CFD boundary
          </button>
          <p id="cfd-export-reason" className="action-reason">
            {cfdExportAvailable
              ? "Available for the persisted gate-passing simulation. Homogeneous states only; no spatial field is generated."
              : "Unavailable until this persisted run owns a gate-passing proposed cycle."}
          </p>
        </section>

        <section className="daq-boundary">
          <div>
            <h3>Live DAQ connector</h3>
            <LockKeyhole size={16} />
          </div>
          <p>Read-only interface reserved for a later validated phase.</p>
          <button type="button" disabled>
            Not available
          </button>
        </section>

        <section className="hardware-boundary">
          <Shield size={16} />
          <span>
            <strong>Read-only data boundary</strong>
            <small>No actuator commands; no ControlSink exists.</small>
          </span>
        </section>
      </aside>
    </div>
  );
}
