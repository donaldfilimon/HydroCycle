import { AlertTriangle, Check, FileJson, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  createTestRun,
  deleteTestRun,
  downloadTestRunExport,
  getHealth,
  getTestRunsRaw,
  importTestRun,
  patchTestRun,
  postSimulationRaw,
  type ApiHealth,
} from "./api";
import { AppShell } from "./components/AppShell";
import type {
  Screen,
  SimulationView,
  TestRunView,
  WorkbenchInputs,
} from "@hydrocycle/view-model";
import {
  DEFAULT_INPUTS,
  demoRuns,
  makeSimulationFixture,
  mapApiSimulationResult,
  mapApiTestRun,
  mayContributeMeasurementEvidence,
  simulationRequest,
  testRunPatchPayload,
  testRunPayload,
} from "@hydrocycle/view-model";
import { SummaryScreen } from "./screens/SummaryScreen";
import { TestRunsScreen } from "./screens/TestRunsScreen";
import { WorkbenchScreen } from "./screens/WorkbenchScreen";

const validScreens = new Set<Screen>(["summary", "workbench", "test-runs"]);
const STATIC_DEMO = import.meta.env.VITE_STATIC_DEMO === "true";

interface AppProps {
  staticDemo?: boolean;
}

function initialScreen(): Screen {
  const query = new URLSearchParams(window.location.search).get("view");
  return query && validScreens.has(query as Screen)
    ? (query as Screen)
    : "summary";
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);
  return [reduced, setReduced] as const;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface ImportDialogProps {
  onClose: () => void;
  onImport: (file: File, calibrationReference: string | null) => Promise<void>;
}

const acceptedCsvHeaders = [
  "time_s,total_h2_mg_L,uncertainty_mg_L",
  "diameter_nm,number_per_mL",
  "crank_angle_deg,pressure_bar,uncertainty_bar",
] as const;

async function readFileText(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () =>
      resolve(typeof reader.result === "string" ? reader.result : ""),
    );
    reader.addEventListener("error", () =>
      reject(reader.error ?? new Error("File could not be read.")),
    );
    reader.readAsText(file);
  });
}

function useDialogFocus(onClose: () => void) {
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]",
        ),
      );
    (focusable()[0] ?? dialog).focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      if (elements.length === 0) {
        event.preventDefault();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    dialog.addEventListener("keydown", onKeyDown);
    return () => {
      dialog.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);
  return dialogRef;
}

function ImportDialog({ onClose, onImport }: ImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const calibrationInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [filename, setFilename] = useState<string | null>(null);
  const [calibrationReference, setCalibrationReference] = useState("");
  const [importing, setImporting] = useState(false);
  const dialogRef = useDialogFocus(onClose);

  async function validate(file: File) {
    const problems: string[] = [];
    const calibration =
      calibrationInputRef.current?.value.trim() ?? calibrationReference.trim();
    setFilename(file.name);
    if (file.size > 2 * 1024 * 1024)
      problems.push("File exceeds the 2 MiB local import limit.");
    if (!/\.(csv|json)$/i.test(file.name))
      problems.push("Only canonical .csv or .json data files are accepted.");
    const text = await readFileText(file);
    if (text.includes("\u0000") || /<script\b|#!\/|^MZ/i.test(text))
      problems.push("Executable or binary payload detected.");

    if (file.name.toLowerCase().endsWith(".csv")) {
      if (!calibration) {
        problems.push(
          "A calibration or method reference is required for CSV measurement imports.",
        );
      }
      const lines = text
        .replaceAll("\r\n", "\n")
        .split("\n")
        .filter((line) => line.trim() !== "");
      if (lines.length > 10_001)
        problems.push("CSV exceeds the 10,000-row limit.");
      const header = lines[0]?.replace(/^\uFEFF/, "") ?? "";
      if (
        !acceptedCsvHeaders.includes(
          header as (typeof acceptedCsvHeaders)[number],
        )
      ) {
        problems.push(
          `Header must match one canonical series: ${acceptedCsvHeaders.join(" | ")}`,
        );
      }
      const formula = lines
        .slice(1)
        .some((line) =>
          line
            .split(",")
            .some((cell) => /^[=+@]|^-(?!\d|\.)/.test(cell.trim())),
        );
      if (formula)
        problems.push(
          "Formula-like cells are rejected; imports are parsed as data only.",
        );
      const axis = lines.slice(1).map((line) => Number(line.split(",")[0]));
      if (axis.some((value) => !Number.isFinite(value)))
        problems.push("Axis values must be finite numbers.");
      if (
        axis.some(
          (value, index) =>
            index > 0 && value <= (axis[index - 1] ?? Number.NEGATIVE_INFINITY),
        )
      ) {
        problems.push(
          "Series axes must be strictly increasing with no duplicates.",
        );
      }
    } else {
      try {
        const parsed: unknown = JSON.parse(text);
        if (!isRecord(parsed))
          problems.push("Canonical JSON must contain one object at its root.");
      } catch {
        problems.push("JSON could not be parsed as data.");
      }
    }

    setErrors(problems);
    if (problems.length === 0) {
      setImporting(true);
      try {
        await onImport(file, calibration || null);
      } catch (error) {
        setErrors([
          error instanceof Error
            ? error.message
            : "The local model service rejected the import.",
        ]);
      } finally {
        setImporting(false);
      }
    }
  }

  return createPortal(
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        tabIndex={-1}
      >
        <header>
          <div>
            <Upload size={20} />
            <h2 id="import-title">Import measured data</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close import dialog"
          >
            <X size={18} />
          </button>
        </header>
        <p>
          Files stay local. HydroCycle accepts canonical JSON or one of three
          bounded CSV series and never follows filesystem paths embedded in
          data.
        </p>
        <button
          className="modal-drop"
          type="button"
          onClick={() => inputRef.current?.click()}
        >
          <FileJson size={34} />
          <strong>{filename ?? "Choose canonical JSON or CSV"}</strong>
          <span>Maximum 2 MiB · maximum 10,000 data rows</span>
        </button>
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept=".json,.csv,application/json,text/csv"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void validate(file);
          }}
        />
        <label className="modal-field" htmlFor="import-calibration-reference">
          <span>Calibration / method reference</span>
          <input
            ref={calibrationInputRef}
            id="import-calibration-reference"
            value={calibrationReference}
            placeholder="Required for CSV measurements"
            onChange={(event) =>
              setCalibrationReference(event.currentTarget.value)
            }
          />
        </label>
        <ul className="import-contracts">
          {acceptedCsvHeaders.map((header) => (
            <li key={header}>{header}</li>
          ))}
        </ul>
        <div aria-live="polite">
          {errors.length > 0 ? (
            <div className="import-errors" role="alert">
              <AlertTriangle size={17} />
              <span>
                <strong>Import rejected</strong>
                {errors.map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </span>
            </div>
          ) : importing ? (
            <div className="import-success">
              <Check size={17} /> Persisting validated import…
            </div>
          ) : null}
        </div>
      </section>
    </div>,
    document.body,
  );
}

function DeleteDialog({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useDialogFocus(onClose);
  return createPortal(
    <div className="modal-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="modal modal--confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        tabIndex={-1}
      >
        <header>
          <div>
            <AlertTriangle size={20} />
            <h2 id="delete-title">Delete local run?</h2>
          </div>
        </header>
        <p>
          This removes the database references and locally owned attachments for
          this run. Imported source files outside HydroCycle are never followed
          or removed.
        </p>
        <div className="modal-actions">
          <button
            className="button button--quiet"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="button button--danger"
            type="button"
            onClick={onConfirm}
          >
            Delete run
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function DiscardChangesDialog({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useDialogFocus(onClose);
  return createPortal(
    <div className="modal-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="modal modal--confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="discard-changes-title"
        tabIndex={-1}
      >
        <header>
          <div>
            <AlertTriangle size={20} />
            <h2 id="discard-changes-title">Discard unsaved changes?</h2>
          </div>
        </header>
        <p>This Test Run has unsaved changes. Discard them and continue?</p>
        <div className="modal-actions">
          <button
            className="button button--quiet"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="button button--danger"
            type="button"
            onClick={onConfirm}
          >
            Discard changes
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

export default function App({ staticDemo = STATIC_DEMO }: AppProps = {}) {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [inputs, setInputs] = useState<WorkbenchInputs>(DEFAULT_INPUTS);
  const [simulation, setSimulation] = useState(() =>
    makeSimulationFixture("literature", DEFAULT_INPUTS),
  );
  const [runs, setRuns] = useState<TestRunView[]>(demoRuns);
  const [selectedRunId, setSelectedRunId] = useState(demoRuns[0]?.id ?? "");
  const [cursorDeg, setCursorDeg] = useState(-10);
  const [reducedMotion, setReducedMotion] = useReducedMotion();
  const [uncertaintyVisible, setUncertaintyVisible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editorDirty, setEditorDirty] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [notice, setNotice] = useState(
    staticDemo
      ? "Static fixture preview loaded; no model computation is implied."
      : "Literature comparison loaded; no measurement is implied.",
  );
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const dialogInvokerRef = useRef<HTMLElement | null>(null);
  const discardDialogInvokerRef = useRef<HTMLElement | null>(null);
  const pendingDiscardActionRef = useRef<(() => void) | null>(null);
  const runsGenerationRef = useRef(0);
  const modelGenerationRef = useRef(0);
  const selectedRun = useMemo(
    () => runs.find((run) => run.id === selectedRunId) ?? null,
    [runs, selectedRunId],
  );
  const measurementRun = useMemo(() => {
    return mayContributeMeasurementEvidence(inputs.fixture, selectedRun)
      ? selectedRun
      : null;
  }, [inputs.fixture, selectedRun]);

  useEffect(() => {
    if (staticDemo) return;
    const generation = ++runsGenerationRef.current;
    void Promise.all([getHealth(), getTestRunsRaw()])
      .then(([nextHealth, documents]) => {
        if (generation !== runsGenerationRef.current) return;
        setHealth(nextHealth);
        const persistedRuns = documents.map(mapApiTestRun);
        if (persistedRuns.length > 0) {
          setRuns([...persistedRuns, ...demoRuns]);
          setSelectedRunId((current) => current || persistedRuns[0]?.id || "");
        }
      })
      .catch(() => setHealth(null));
  }, [staticDemo]);

  useEffect(() => {
    const onPopState = () => setScreen(initialScreen());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!editorDirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [editorDirty]);

  const navigate = useCallback((next: Screen) => {
    setScreen(next);
    const url = new URL(window.location.href);
    url.searchParams.set("view", next);
    window.history.pushState({}, "", url);
    window.scrollTo({ top: 0, behavior: "auto" });
    window.setTimeout(
      () => document.getElementById("main-content")?.focus(),
      0,
    );
  }, []);

  const requestDiscard = useCallback(
    (action: () => void) => {
      if (!editorDirty) {
        action();
        return;
      }
      discardDialogInvokerRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      pendingDiscardActionRef.current = action;
      setDiscardDialogOpen(true);
    },
    [editorDirty],
  );

  const closeDiscardDialog = useCallback(() => {
    pendingDiscardActionRef.current = null;
    setDiscardDialogOpen(false);
    window.setTimeout(() => discardDialogInvokerRef.current?.focus(), 0);
  }, []);

  const confirmDiscard = useCallback(() => {
    const action = pendingDiscardActionRef.current;
    pendingDiscardActionRef.current = null;
    setDiscardDialogOpen(false);
    setEditorDirty(false);
    action?.();
  }, []);

  const guardedNavigate = useCallback(
    (next: Screen) => requestDiscard(() => navigate(next)),
    [navigate, requestDiscard],
  );

  const openImportDialog = useCallback(() => {
    dialogInvokerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setImportOpen(true);
  }, []);

  const requestImport = useCallback(() => {
    if (staticDemo) {
      setNotice("Import requires the local HydroCycle application.");
      return;
    }
    requestDiscard(openImportDialog);
  }, [openImportDialog, requestDiscard, staticDemo]);

  const closeImportDialog = useCallback(() => {
    setImportOpen(false);
    window.setTimeout(() => dialogInvokerRef.current?.focus(), 0);
  }, []);

  const openDeleteDialog = useCallback((id: string) => {
    dialogInvokerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setDeleteId(id);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDeleteId(null);
    window.setTimeout(() => dialogInvokerRef.current?.focus(), 0);
  }, []);

  const runModel = useCallback(async () => {
    if (busy) return;
    const generation = ++modelGenerationRef.current;
    runsGenerationRef.current += 1;
    setBusy(true);
    const fixtureInputs: WorkbenchInputs = {
      ...inputs,
      scenario:
        inputs.fixture === "water-injection"
          ? "hydrogen_fuel_with_water_injection"
          : "upstream_vaporized_carrier",
    };
    const fixtureFallback = makeSimulationFixture(
      inputs.fixture,
      fixtureInputs,
    );
    const fallback = measurementRun
      ? {
          ...fixtureFallback,
          label: `Selected Test Run measurements — ${measurementRun.name}`,
        }
      : fixtureFallback;
    if (staticDemo) {
      setSimulation(fallback);
      setNotice(
        `Loaded deterministic ${fallback.label.toLowerCase()}; no model service computation was performed.`,
      );
      setBusy(false);
      return;
    }
    try {
      const persistence = selectedRun?.persisted
        ? { testRunId: selectedRun.id }
        : undefined;
      const raw = await postSimulationRaw(
        simulationRequest(fixtureInputs, measurementRun),
        persistence,
      );
      if (generation !== modelGenerationRef.current) return;
      setSimulation(mapApiSimulationResult(fallback, raw));
      if (persistence) {
        setRuns((current) =>
          current.map((run) =>
            run.id === persistence.testRunId
              ? {
                  ...run,
                  simulationIds: Array.from(
                    new Set([...run.simulationIds, raw.result_id]),
                  ),
                }
              : run,
          ),
        );
      }
      setHealth(
        (current) => current ?? { status: "ok", service: "hydrocycle-model" },
      );
      setNotice(
        measurementRun
          ? `Evaluation completed with selected Test Run evidence from ${measurementRun.name} and linked to that persisted run.`
          : persistence
            ? `Evaluation completed and linked to persisted run ${selectedRun?.name ?? selectedRunId}.`
            : "Evaluation completed by the local model service.",
      );
    } catch (error) {
      if (generation !== modelGenerationRef.current) return;
      setSimulation(fallback);
      setNotice(
        `Local API unavailable; showing deterministic ${fallback.label.toLowerCase()}. ${error instanceof Error ? error.message : ""}`.trim(),
      );
    } finally {
      if (generation === modelGenerationRef.current) setBusy(false);
    }
  }, [busy, inputs, measurementRun, selectedRun, selectedRunId, staticDemo]);

  function updateInput(
    key: keyof WorkbenchInputs,
    value: WorkbenchInputs[keyof WorkbenchInputs],
  ) {
    if (busy) return;
    setInputs((current) => ({ ...current, [key]: value }));
    if (key === "fixture") {
      const fixture = value as SimulationView["fixture"];
      const nextScenario =
        fixture === "water-injection"
          ? "hydrogen_fuel_with_water_injection"
          : "upstream_vaporized_carrier";
      setInputs((current) => ({
        ...current,
        fixture,
        scenario: nextScenario,
        measuredTotalMgL: fixture === "artificial-pass" ? 62_000 : null,
        measuredTotalUncertaintyMgL: fixture === "artificial-pass" ? 500 : 0,
        measuredTotalSourceId:
          fixture === "artificial-pass" ? "artificial-pass-only" : "",
        recoveredHeatJ: fixture === "artificial-pass" ? 2_800 : 0,
        recoveredHeatUncertaintyJ: fixture === "artificial-pass" ? 50 : 0,
        recoveredHeatSourceId:
          fixture === "artificial-pass" ? "artificial-pass-only" : "",
      }));
      setNotice("Preset changed. Run the model to evaluate the updated input.");
    }
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function exportBundle() {
    const selectedRun = runs.find((run) => run.id === selectedRunId);
    if (screen === "test-runs" && selectedRun?.persisted) {
      try {
        const exported = await downloadTestRunExport(selectedRun.id);
        triggerDownload(exported.blob, exported.filename);
        setNotice(`Exported canonical persisted run ${selectedRun.name}.`);
        return;
      } catch (error) {
        setNotice(
          `Canonical export failed: ${error instanceof Error ? error.message : "unknown local API error"}`,
        );
        return;
      }
    }
    const bundle = {
      schema_version: "1.0.0",
      exported_at: new Date().toISOString(),
      simulation,
      test_runs: runs,
      scope:
        "HydroCycle local evidence bundle; no spatial CFD field and no hardware commands",
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: "application/json",
    });
    triggerDownload(blob, `hydrocycle-${simulation.resultHash}.json`);
    setNotice(
      `Exported transient view bundle ${simulation.resultHash}; persist a Test Run for canonical re-import.`,
    );
  }

  async function newRun() {
    runsGenerationRef.current += 1;
    const id = `local-${crypto.randomUUID()}`;
    const run: TestRunView = {
      id,
      name: "Untitled run",
      status: "draft",
      synthetic: false,
      timestamp: new Date().toISOString(),
      totalH2MgL: null,
      retainedH2MgL: null,
      retentionFraction: null,
      operator: null,
      sampleId: null,
      method: null,
      calibrationReference: null,
      provenance: {
        source: "HydroCycle Test Runs",
        method: null,
        ui_origin: "HydroCycle Test Runs",
        import_sha256: null,
        source_test_run_id: null,
        is_demo_synthetic: false,
      },
      calibrationReferences: [],
      comparisons: { items: [] },
      testRunEvidence: [],
      temperatureC: null,
      pressureKpa: null,
      elapsedS: null,
      bubbleDiameterNm: null,
      numberPerMl: null,
      reviewNotes: null,
      releasedH2MgL: null,
      unaccountedH2MgL: null,
      standardUncertainty: {
        totalH2MgL: null,
        retainedH2MgL: null,
        retentionFraction: null,
        temperatureC: null,
        pressureKpa: null,
        elapsedS: null,
        bubbleDiameterNm: null,
        numberPerMl: null,
        releasedH2MgL: null,
        unaccountedH2MgL: null,
      },
      hydrogenDecaySeries: null,
      bubbleDistribution: null,
      pressureTrace: null,
      attachmentHashes: [],
      simulationIds: [],
      measurementDatasetCount: 0,
      persisted: false,
    };
    navigate("test-runs");
    if (staticDemo) {
      setRuns((current) => [run, ...current]);
      setSelectedRunId(id);
      setNotice("Created an in-memory demo draft; persistence is unavailable.");
      return;
    }
    try {
      const document = await createTestRun(testRunPayload(run));
      const persisted = mapApiTestRun(document);
      setRuns((current) => [persisted, ...current]);
      setSelectedRunId(persisted.id);
      setNotice("New draft persisted to local SQLite.");
    } catch {
      setRuns((current) => [run, ...current]);
      setSelectedRunId(id);
      setNotice(
        "Local model service is offline; draft is volatile until the service reconnects.",
      );
    }
  }

  async function saveRun(run: TestRunView) {
    if (staticDemo) {
      setNotice("Persistence requires the local HydroCycle application.");
      return false;
    }
    runsGenerationRef.current += 1;
    try {
      const document = run.persisted
        ? await patchTestRun(run.id, testRunPatchPayload(run))
        : await createTestRun(testRunPayload(run));
      const persisted = mapApiTestRun(document);
      setRuns((current) =>
        current.some((item) => item.id === run.id)
          ? current.map((item) => (item.id === run.id ? persisted : item))
          : [persisted, ...current],
      );
      setSelectedRunId(persisted.id);
      setNotice(`${persisted.name} persisted to local SQLite.`);
      return true;
    } catch (error) {
      setNotice(
        `Run was not persisted: ${error instanceof Error ? error.message : "local API unavailable"}`,
      );
      return false;
    }
  }

  async function exportCfdBoundary(run: TestRunView) {
    if (!run.persisted || !simulation.id || !simulation.proposedCycle) {
      setNotice(
        "Neutral CFD boundary export requires a persisted run with the current gate-passing proposed cycle.",
      );
      return false;
    }
    try {
      const exported = await downloadTestRunExport(
        run.id,
        "cfd_boundary",
        simulation.id,
      );
      triggerDownload(exported.blob, exported.filename);
      setNotice(
        "Exported homogeneous 0D boundary states; no spatial field was generated.",
      );
      return true;
    } catch (error) {
      setNotice(
        `Neutral CFD boundary export failed: ${error instanceof Error ? error.message : "unknown local API error"}`,
      );
      return false;
    }
  }

  async function duplicateRun(id: string) {
    const source = runs.find((run) => run.id === id);
    if (!source) return;
    const duplicate: TestRunView = {
      ...source,
      id: `local-${crypto.randomUUID()}`,
      name: `${source.name} copy`,
      status: "draft",
      timestamp: new Date().toISOString(),
      persisted: false,
      attachmentHashes: [],
      simulationIds: [],
      provenance: {
        ...source.provenance,
        source: "HydroCycle Test Runs duplicate",
        source_test_run_id: source.id,
        import_sha256: null,
        is_demo_synthetic: source.synthetic,
      },
      comparisons: { items: [] },
      testRunEvidence: [],
    };
    await saveRun(duplicate);
  }

  async function removeRun(id: string) {
    const run = runs.find((candidate) => candidate.id === id);
    if (!run) return;
    runsGenerationRef.current += 1;
    try {
      const result = run.persisted ? await deleteTestRun(id) : null;
      setRuns((current) => current.filter((candidate) => candidate.id !== id));
      setSelectedRunId((current) =>
        current === id
          ? (runs.find((candidate) => candidate.id !== id)?.id ?? "")
          : current,
      );
      setNotice(
        result?.ownedAttachmentCleanupFailures
          ? `Run deleted, but ${result.ownedAttachmentCleanupFailures} locally owned attachment could not be removed.`
          : run.persisted
            ? "Database references and locally owned attachments deleted."
            : "Volatile demo/draft removed from this session.",
      );
      setDeleteId(null);
    } catch (error) {
      setNotice(
        `Delete failed; nothing was removed: ${error instanceof Error ? error.message : "local API error"}`,
      );
    }
  }

  const apiLabel = useMemo(() => {
    if (staticDemo) return "Hosted preview: static fixtures only";
    if (!health) return "Local model service: offline / checking";
    const status = health.status;
    const service = health.service;
    const label =
      typeof status === "string"
        ? status
        : typeof service === "string"
          ? service
          : "connected";
    return `Local model service: ${label}`;
  }, [health, staticDemo]);

  return (
    <AppShell
      active={screen}
      busy={busy}
      gatePassed={simulation.gate.passed}
      staticDemo={staticDemo}
      onNavigate={guardedNavigate}
      onRun={() => void runModel()}
      onImport={requestImport}
      onExport={() => void exportBundle()}
      dialogOpen={importOpen || deleteId !== null || discardDialogOpen}
    >
      <div className="app-notice" role="status" aria-live="polite">
        <span>{notice}</span>
        <small>{apiLabel}</small>
      </div>

      {screen === "summary" ? (
        <SummaryScreen
          simulation={simulation}
          selectedRun={selectedRun}
          uncertaintyVisible={uncertaintyVisible}
          onToggleUncertainty={() => setUncertaintyVisible((value) => !value)}
          onOpenWorkbench={() => guardedNavigate("workbench")}
        />
      ) : null}
      {screen === "workbench" ? (
        <WorkbenchScreen
          simulation={simulation}
          inputs={inputs}
          measurementRun={measurementRun}
          cursorDeg={cursorDeg}
          reducedMotion={reducedMotion}
          staticDemo={staticDemo}
          busy={busy}
          onCursorChange={(value) =>
            setCursorDeg(Math.max(-180, Math.min(180, value)))
          }
          onReducedMotionChange={setReducedMotion}
          onInputChange={updateInput}
          onRun={() => void runModel()}
        />
      ) : null}
      {screen === "test-runs" ? (
        <TestRunsScreen
          runs={runs}
          selectedId={selectedRunId}
          onSelect={(id) => requestDiscard(() => setSelectedRunId(id))}
          onDirtyChange={setEditorDirty}
          onSave={saveRun}
          onNew={() => requestDiscard(() => void newRun())}
          onDuplicate={(id) => requestDiscard(() => void duplicateRun(id))}
          onDelete={openDeleteDialog}
          onImport={requestImport}
          linkedSimulation={
            simulation.id && selectedRun?.simulationIds.includes(simulation.id)
              ? simulation
              : null
          }
          cfdExportAvailable={Boolean(
            simulation.id &&
            simulation.proposedCycle &&
            runs
              .find((run) => run.id === selectedRunId)
              ?.simulationIds.includes(simulation.id),
          )}
          onExportCfd={exportCfdBoundary}
        />
      ) : null}

      {importOpen ? (
        <ImportDialog
          onClose={closeImportDialog}
          onImport={async (file, calibrationReference) => {
            runsGenerationRef.current += 1;
            const response = await importTestRun(file, calibrationReference);
            const run = mapApiTestRun(response.test_run);
            setRuns((current) => [
              run,
              ...current.filter((item) => item.id !== run.id),
            ]);
            setSelectedRunId(run.id);
            setImportOpen(false);
            navigate("test-runs");
            setNotice(
              `${run.name} persisted with attachment SHA-256 ${response.attachment.sha256.slice(0, 12)}…` +
                (response.imported_simulations.length > 0
                  ? ` Restored ${response.imported_simulations.length} reproducible simulation result.`
                  : ""),
            );
          }}
        />
      ) : null}

      {deleteId ? (
        <DeleteDialog
          onClose={closeDeleteDialog}
          onConfirm={() => void removeRun(deleteId)}
        />
      ) : null}

      {discardDialogOpen ? (
        <DiscardChangesDialog
          onClose={closeDiscardDialog}
          onConfirm={confirmDiscard}
        />
      ) : null}
    </AppShell>
  );
}
