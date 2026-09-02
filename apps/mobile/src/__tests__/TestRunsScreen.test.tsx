import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import {
  hasRecordedMeasurements,
  mapApiTestRun,
  type TestRunView,
} from "@hydrocycle/view-model";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useState } from "react";
import { Alert, StyleSheet } from "react-native";

import {
  createTestRun,
  deleteTestRun,
  getTestRuns,
  getTestRun,
  importTestRunFile,
  patchTestRun,
  type ApiTestRunDocument,
} from "../api";
import TestRunsScreen, { statusTone } from "../screens/TestRunsScreen";
import { theme } from "../theme";

jest.mock("../api", () => ({
  createTestRun: jest.fn(),
  deleteTestRun: jest.fn(),
  downloadTestRunExport: jest.fn(),
  getTestRuns: jest.fn(),
  getTestRun: jest.fn(),
  importTestRunFile: jest.fn(),
  patchTestRun: jest.fn(),
}));

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock("expo-file-system", () => ({
  cacheDirectory: "file:///cache/",
  deleteAsync: jest.fn(),
}));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

const getTestRunsMock = jest.mocked(getTestRuns);
const getTestRunMock = jest.mocked(getTestRun);
const createTestRunMock = jest.mocked(createTestRun);
const deleteTestRunMock = jest.mocked(deleteTestRun);
const importTestRunFileMock = jest.mocked(importTestRunFile);
const patchTestRunMock = jest.mocked(patchTestRun);
const documentPickerMock = jest.mocked(DocumentPicker.getDocumentAsync);
const deleteLocalFileMock = jest.mocked(FileSystem.deleteAsync);

function run(
  id: string,
  name: string,
  status: "draft" | "valid" | "invalid",
): ApiTestRunDocument {
  return {
    id,
    name,
    status,
    is_demo_synthetic: false,
    operator: "Lab operator",
    sample_id: `sample-${id}`,
    notes: null,
    created_at: "2026-08-27T12:00:00Z",
    updated_at: "2026-08-27T13:00:00Z",
    simulation_ids: [],
    provenance: {
      source: "mobile test fixture",
      method: null,
      is_demo_synthetic: false,
    },
    calibration_references: [],
    comparisons: { items: [] },
    evidence: [],
    attachments: [],
    measurements: {
      total_h2_mg_l: {
        value: 1.5,
        unit: "mg/L",
        standard_uncertainty: 0.1,
      },
    },
  } as unknown as ApiTestRunDocument;
}

function Harness({
  initial = null,
  onDirtyChange,
}: {
  initial?: TestRunView | null;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [selectedRun, setSelectedRun] = useState(initial);
  return (
    <TestRunsScreen
      selectedRun={selectedRun}
      onSelectedRunChange={setSelectedRun}
      onDirtyChange={onDirtyChange}
    />
  );
}

describe("TestRunsScreen", () => {
  beforeEach(() => {
    getTestRunsMock.mockReset();
    getTestRunMock.mockReset();
    getTestRunMock.mockImplementation(async (id) => {
      const runs = await getTestRunsMock.mock.results.at(-1)?.value;
      return (
        runs?.find((candidate: ApiTestRunDocument) => candidate.id === id) ??
        run(id, id, "draft")
      );
    });
    createTestRunMock.mockReset();
    deleteTestRunMock.mockReset();
    importTestRunFileMock.mockReset();
    patchTestRunMock.mockReset();
    documentPickerMock.mockReset();
    deleteLocalFileMock.mockReset();
    deleteLocalFileMock.mockResolvedValue(undefined);
    jest.restoreAllMocks();
  });

  it("renders populated valid and invalid runs distinctly", async () => {
    getTestRunsMock.mockResolvedValue([
      run("valid-1", "Reviewed run", "valid"),
      run("invalid-1", "Rejected run", "invalid"),
    ]);

    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByText("Reviewed run")).toBeTruthy();
      expect(screen.getByText("Rejected run")).toBeTruthy();
    });
    expect(
      screen.getByText("2 measured · 0 unmeasured · 0 synthetic"),
    ).toBeTruthy();
    expect(statusTone("valid")).toBe(theme.color.pass);
    expect(statusTone("invalid")).toBe(theme.color.fail);

    fireEvent.press(screen.getByRole("radio", { name: "Select Reviewed run" }));
    expect(screen.getByText("Selected run detail")).toBeTruthy();
    expect(screen.getByText("mobile test fixture")).toBeTruthy();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.getByText("1.50 mg/L")).toBeTruthy();
  });

  it("renders a live valid record without converting absent measurements to zero", async () => {
    const live = run(
      "bff58fc8-5322-453a-adaf-a96e210ce4ad",
      "Mobile live acceptance reviewed run",
      "valid",
    );
    live.operator = "HydroCycle acceptance operator";
    live.sample_id = "MOBILE-LIVE-2026-09-02";
    live.provenance = {
      source: "HydroCycle local persisted-test-run acceptance",
      method: "calibrated representative headspace GC and mass-balance record",
      ui_origin: "mobile-live-acceptance",
      import_sha256: null,
      source_test_run_id: null,
      is_demo_synthetic: false,
    };
    live.measurements = {
      ...live.measurements,
      total_h2_mg_l: {
        value: 2.1,
        unit: "mg/L",
        standard_uncertainty: 0.08,
        distribution: "normal",
        source_id: "CAL-MOBILE-LIVE-2026-09-02",
        basis: "measured",
      },
      retained_h2_mg_l: {
        value: 1.28,
        unit: "mg/L",
        standard_uncertainty: 0.06,
        distribution: "normal",
        source_id: "CAL-MOBILE-LIVE-2026-09-02",
        basis: "measured",
      },
      bubble_diameter_nm: null,
      number_per_ml: null,
      "pressure_trace.csv": null,
    };
    live.calibration_references = [
      {
        id: "CAL-MOBILE-LIVE-2026-09-02",
        instrument: "Representative headspace GC acceptance instrument",
        method: "local acceptance calibration reference",
        applies_to: [],
      },
    ];
    getTestRunsMock.mockResolvedValue([live]);

    render(<Harness />);
    await screen.findByText("Mobile live acceptance reviewed run");
    fireEvent.press(
      screen.getByRole("radio", {
        name: "Select Mobile live acceptance reviewed run",
      }),
    );

    expect(
      screen.getByText("1 measured · 0 unmeasured · 0 synthetic"),
    ).toBeTruthy();
    expect(screen.getByText("2.10 mg/L")).toBeTruthy();
    expect(screen.getByText("1.28 mg/L")).toBeTruthy();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.queryByText("0.00 nm")).toBeNull();
    expect(screen.queryByText("0.00 1/mL")).toBeNull();
    expect(screen.getByText("CAL-MOBILE-LIVE-2026-09-02")).toBeTruthy();
    expect(
      StyleSheet.flatten(screen.getAllByText("Operator")[0]?.props.style),
    ).toEqual(expect.objectContaining({ flexBasis: "38%", flexShrink: 0 }));
    expect(
      StyleSheet.flatten(
        screen.getByText("HydroCycle acceptance operator").props.style,
      ),
    ).toEqual(
      expect.objectContaining({ flex: 1, flexShrink: 1, textAlign: "right" }),
    );
  });

  it("renders measured retention, endpoint preview, and residual without inventing data", async () => {
    const persisted = run("retention-1", "Retention run", "valid");
    persisted.measurements.retained_h2_mg_l = {
      value: 0.75,
      unit: "mg/L",
      standard_uncertainty: 0.05,
      distribution: "normal",
      source_id: "fixture-calibration",
      basis: "measured",
    };
    persisted.measurements.elapsed_s = {
      value: 10,
      unit: "s",
      standard_uncertainty: 0.1,
      distribution: "normal",
      source_id: "fixture-calibration",
      basis: "measured",
    };
    persisted.measurements["hydrogen_decay.csv"] = [
      { time_s: 0, total_h2_mg_L: 1.5, uncertainty_mg_L: 0.1 },
      { time_s: 10, total_h2_mg_L: 0.75, uncertainty_mg_L: 0.05 },
    ];
    getTestRunsMock.mockResolvedValue([persisted]);
    render(<Harness />);
    await screen.findByText("Retention run");

    fireEvent.press(
      screen.getByRole("radio", { name: "Select Retention run" }),
    );

    expect(screen.getByText("Retention comparison")).toBeTruthy();
    expect(screen.getByText(/Measured retention/)).toBeTruthy();
    expect(screen.getByText("First-order model")).toBeTruthy();
    expect(screen.getByText("Retention residual")).toBeTruthy();
    expect(screen.getByTestId("interval-retention-measured")).toBeTruthy();
    expect(screen.getByText(/client-side preview/)).toBeTruthy();
  });

  it("creates an additive empty draft and prepends the returned document", async () => {
    const user = userEvent.setup();
    getTestRunsMock.mockResolvedValue([]);
    const draft = run("draft-1", "Mobile draft", "draft");
    draft.measurements = {};
    createTestRunMock.mockResolvedValue(draft);

    render(<Harness />);
    await screen.findByText("No persisted runs");
    await user.press(screen.getByRole("button", { name: "Create draft" }));

    await waitFor(() =>
      expect(screen.getAllByText("Mobile draft")).toHaveLength(2),
    );
    expect(createTestRunMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: "draft", is_demo_synthetic: false }),
    );
    expect(
      screen.getByText("0 measured · 1 unmeasured · 0 synthetic"),
    ).toBeTruthy();
    expect(hasRecordedMeasurements(draft)).toBe(false);
    expect(screen.getByText("Selected run detail")).toBeTruthy();
  });

  it("treats document-picker cancellation as a no-op", async () => {
    getTestRunsMock.mockResolvedValue([]);
    documentPickerMock.mockResolvedValue({ canceled: true, assets: null });
    render(<Harness />);
    await screen.findByText("No persisted runs");

    fireEvent.press(screen.getByRole("button", { name: "Import" }));

    await waitFor(() => expect(documentPickerMock).toHaveBeenCalledTimes(1));
    expect(importTestRunFileMock).not.toHaveBeenCalled();
    expect(deleteLocalFileMock).not.toHaveBeenCalled();
    expect(screen.queryByText("Cannot import local file")).toBeNull();
  });

  it("shows local import errors without mislabeling them as service outages", async () => {
    getTestRunsMock.mockResolvedValue([]);
    documentPickerMock.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///cache/test_run.json",
          name: "test_run.json",
          mimeType: "application/json",
          size: 128,
        },
      ],
    });
    importTestRunFileMock.mockRejectedValue(
      new Error("The selected local file is no longer available."),
    );
    render(<Harness />);
    await screen.findByText("No persisted runs");

    fireEvent.press(screen.getByRole("button", { name: "Import" }));

    expect(await screen.findByText("Cannot import local file")).toBeTruthy();
    expect(
      screen.getByText("The selected local file is no longer available."),
    ).toBeTruthy();
    expect(screen.queryByText("Cannot reach the model service")).toBeNull();
    expect(deleteLocalFileMock).toHaveBeenCalledWith(
      "file:///cache/test_run.json",
      { idempotent: true },
    );
  });

  it("never deletes a picker URI outside the app cache", async () => {
    const imported = run("imported-1", "Imported run", "draft");
    imported.measurements = {};
    getTestRunsMock.mockResolvedValue([]);
    documentPickerMock.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///Users/shared/test_run.json",
          name: "test_run.json",
          mimeType: "application/json",
          size: 128,
        },
      ],
    });
    importTestRunFileMock.mockResolvedValue({
      test_run: imported,
      attachment: {
        id: "attachment-1",
        canonical_name: "test_run.json",
        size_bytes: 128,
        sha256: "a".repeat(64),
        import_warnings: [],
      },
      imported_simulations: [],
    });
    render(<Harness />);
    await screen.findByText("No persisted runs");

    fireEvent.press(screen.getByRole("button", { name: "Import" }));

    await waitFor(() =>
      expect(screen.getAllByText("Imported run").length).toBeGreaterThan(0),
    );
    expect(deleteLocalFileMock).not.toHaveBeenCalled();
  });

  it("clears a selected run that is absent from a refreshed response", async () => {
    const persisted = run("stale-1", "Stale run", "valid");
    getTestRunsMock.mockResolvedValue([]);

    render(<Harness initial={mapApiTestRun(persisted)} />);

    await screen.findByText("No persisted runs");
    await waitFor(() =>
      expect(screen.queryByText("Selected run detail")).toBeNull(),
    );
  });

  it("does not let a late entry refresh overwrite a newly dirty editor", async () => {
    const persisted = run("refresh-1", "Cached run", "draft");
    let resolveLoad!: (runs: ApiTestRunDocument[]) => void;
    getTestRunsMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLoad = resolve;
        }),
    );
    const onDirtyChange = jest.fn();
    render(
      <Harness
        initial={mapApiTestRun(persisted)}
        onDirtyChange={onDirtyChange}
      />,
    );

    fireEvent.changeText(screen.getByLabelText("Name"), "Unsaved local name");
    await act(async () => resolveLoad([]));

    expect(screen.getByLabelText("Name").props.value).toBe(
      "Unsaved local name",
    );
    expect(screen.getByText("Selected run detail")).toBeTruthy();
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  });

  it("sends blank text and numeric inputs as null without promoting status", async () => {
    const persisted = run("draft-1", "Draft run", "draft");
    getTestRunsMock.mockResolvedValue([persisted]);
    patchTestRunMock.mockResolvedValue({ ...persisted, operator: null });
    render(<Harness />);
    await screen.findByText("Draft run");
    fireEvent.press(screen.getByRole("radio", { name: "Select Draft run" }));

    fireEvent.changeText(screen.getByLabelText("Operator"), "   ");
    fireEvent.changeText(screen.getByLabelText("Total H2 value"), "");
    fireEvent.changeText(
      screen.getByLabelText("Total H2 standard uncertainty"),
      "",
    );
    fireEvent.press(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(patchTestRunMock).toHaveBeenCalledTimes(1));
    expect(patchTestRunMock).toHaveBeenCalledWith(
      "draft-1",
      expect.objectContaining({
        operator: null,
        status: "draft",
        measurements: expect.objectContaining({ total_h2_mg_l: null }),
      }),
    );
  });

  it("retains invalid numeric text and reports it without calling PATCH", async () => {
    const persisted = run("draft-1", "Draft run", "draft");
    getTestRunsMock.mockResolvedValue([persisted]);
    render(<Harness />);
    await screen.findByText("Draft run");
    fireEvent.press(screen.getByRole("radio", { name: "Select Draft run" }));

    fireEvent.changeText(
      screen.getByLabelText("Total H2 value"),
      "not-a-number",
    );
    fireEvent.press(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Total H2 must be a finite number or blank."),
    ).toBeTruthy();
    expect(screen.getByLabelText("Total H2 value").props.value).toBe(
      "not-a-number",
    );
    expect(patchTestRunMock).not.toHaveBeenCalled();
  });

  it("requires a positive uncertainty for a populated scalar", async () => {
    const persisted = run("draft-1", "Draft run", "draft");
    getTestRunsMock.mockResolvedValue([persisted]);
    render(<Harness />);
    await screen.findByText("Draft run");
    fireEvent.press(screen.getByRole("radio", { name: "Select Draft run" }));

    fireEvent.changeText(
      screen.getByLabelText("Total H2 standard uncertainty"),
      "0",
    );
    fireEvent.press(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText(
        "Total H₂ requires a positive standard uncertainty.",
      ),
    ).toBeTruthy();
    expect(patchTestRunMock).not.toHaveBeenCalled();
  });

  it("rejects an uncertainty without a measurement value", async () => {
    const persisted = run("draft-1", "Draft run", "draft");
    persisted.measurements = {};
    getTestRunsMock.mockResolvedValue([persisted]);
    render(<Harness />);
    await screen.findByText("Draft run");
    fireEvent.press(screen.getByRole("radio", { name: "Select Draft run" }));

    fireEvent.changeText(
      screen.getByLabelText("Temperature standard uncertainty"),
      "0.2",
    );
    fireEvent.press(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText(
        "Temperature standard uncertainty requires a measurement value.",
      ),
    ).toBeTruthy();
    expect(patchTestRunMock).not.toHaveBeenCalled();
  });

  it("shows derived retention without offering an independent measurement input", async () => {
    const persisted = run("draft-1", "Draft run", "draft");
    persisted.measurements.retained_h2_mg_l = {
      value: 0.75,
      unit: "mg/L",
      standard_uncertainty: 0.05,
      distribution: "normal",
      source_id: "fixture-calibration",
      basis: "measured",
    };
    getTestRunsMock.mockResolvedValue([persisted]);
    render(<Harness />);
    await screen.findByText("Draft run");
    fireEvent.press(screen.getByRole("radio", { name: "Select Draft run" }));

    expect(screen.getByText("Retention fraction (derived)")).toBeTruthy();
    expect(screen.queryByLabelText("Retention fraction value")).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(patchTestRunMock).toHaveBeenCalledTimes(1));
    expect(
      patchTestRunMock.mock.calls[0]?.[1].measurements?.retention_fraction,
    ).toBeNull();
  });

  it("identifies an independently recorded retention fraction as measured", async () => {
    const persisted = run("run-1", "Measured retention run", "valid");
    persisted.measurements.retention_fraction = {
      value: 0.48,
      unit: "fraction",
      standard_uncertainty: 0.03,
      distribution: "normal",
      source_id: "fixture-calibration",
      basis: "measured",
    };
    getTestRunsMock.mockResolvedValue([persisted]);
    render(<Harness />);
    await screen.findByText("Measured retention run");
    fireEvent.press(
      screen.getByRole("radio", { name: "Select Measured retention run" }),
    );

    expect(screen.getByText("Retention fraction (measured)")).toBeTruthy();
    expect(
      screen.getByText(
        "Recorded independently with its original uncertainty and provenance.",
      ),
    ).toBeTruthy();
  });

  it("shows a server validation error and retains the unsaved draft", async () => {
    const persisted = run("draft-1", "Draft run", "draft");
    getTestRunsMock.mockResolvedValue([persisted]);
    patchTestRunMock.mockRejectedValue(
      new Error('{"detail":"calibration reference is required"}'),
    );
    render(<Harness />);
    await screen.findByText("Draft run");
    fireEvent.press(screen.getByRole("radio", { name: "Select Draft run" }));

    fireEvent.changeText(screen.getByLabelText("Name"), "Unsaved name");
    fireEvent.press(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText(/calibration reference is required/),
    ).toBeTruthy();
    expect(screen.getByLabelText("Name").props.value).toBe("Unsaved name");
  });

  it("maps successful server readback and clears the draft", async () => {
    const persisted = run("draft-1", "Draft run", "draft");
    const authoritative = run("draft-1", "Server-normalized run", "draft");
    getTestRunsMock.mockResolvedValue([persisted]);
    patchTestRunMock.mockResolvedValue(authoritative);
    const onDirtyChange = jest.fn();
    render(<Harness onDirtyChange={onDirtyChange} />);
    await screen.findByText("Draft run");
    fireEvent.press(screen.getByRole("radio", { name: "Select Draft run" }));

    fireEvent.changeText(screen.getByLabelText("Name"), "Client name");
    fireEvent.press(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Name").props.value).toBe(
        "Server-normalized run",
      ),
    );
    expect(screen.getAllByText("Server-normalized run").length).toBeGreaterThan(
      0,
    );
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it("only requests valid status through the explicit validation action", async () => {
    const persisted = run("draft-1", "Draft run", "draft");
    getTestRunsMock.mockResolvedValue([persisted]);
    patchTestRunMock.mockResolvedValue({ ...persisted, status: "valid" });
    render(<Harness />);
    await screen.findByText("Draft run");
    fireEvent.press(screen.getByRole("radio", { name: "Select Draft run" }));

    fireEvent.press(screen.getByRole("button", { name: "Validate as valid" }));

    await waitFor(() => expect(patchTestRunMock).toHaveBeenCalledTimes(1));
    expect(patchTestRunMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ status: "valid" }),
    );
  });

  it("uses native confirmation before discarding editor changes", async () => {
    const persisted = run("draft-1", "Draft run", "draft");
    getTestRunsMock.mockResolvedValue([persisted]);
    const alert = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    render(<Harness />);
    await screen.findByText("Draft run");
    fireEvent.press(screen.getByRole("radio", { name: "Select Draft run" }));
    fireEvent.changeText(screen.getByLabelText("Name"), "Unsaved name");

    fireEvent.press(screen.getByRole("button", { name: "Cancel edits" }));

    expect(alert).toHaveBeenCalledWith(
      "Discard Test Run edits?",
      "Unsaved changes will be lost.",
      expect.arrayContaining([
        expect.objectContaining({ text: "Cancel", style: "cancel" }),
        expect.objectContaining({ text: "Discard", style: "destructive" }),
      ]),
    );
    const buttons = alert.mock.calls[0]?.[2];
    act(() => buttons?.find((button) => button.text === "Cancel")?.onPress?.());
    expect(screen.getByLabelText("Name").props.value).toBe("Unsaved name");
    act(() =>
      buttons?.find((button) => button.text === "Discard")?.onPress?.(),
    );
    expect(screen.getByLabelText("Name").props.value).toBe("Draft run");
  });

  it("duplicates through create and consumes the authoritative returned run", async () => {
    const persisted = run("run-1", "Reviewed run", "valid");
    const duplicate = run("run-2", "Reviewed run copy", "draft");
    getTestRunsMock.mockResolvedValue([persisted]);
    createTestRunMock.mockResolvedValue(duplicate);
    render(<Harness />);
    await screen.findByText("Reviewed run");
    fireEvent.press(screen.getByRole("radio", { name: "Select Reviewed run" }));

    fireEvent.press(screen.getByRole("button", { name: "Duplicate" }));

    await waitFor(() => expect(createTestRunMock).toHaveBeenCalledTimes(1));
    expect(createTestRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Reviewed run copy",
        status: "draft",
        provenance: expect.objectContaining({ source_test_run_id: "run-1" }),
      }),
    );
    expect(await screen.findAllByText("Reviewed run copy")).toHaveLength(2);
  });

  it("deletes only after native confirmation and removes the returned target", async () => {
    const persisted = run("run-1", "Reviewed run", "valid");
    getTestRunsMock.mockResolvedValue([persisted]);
    deleteTestRunMock.mockResolvedValue({
      deleted: true,
      testRunId: "run-1",
      ownedAttachmentsRemoved: 0,
      ownedAttachmentCleanupFailures: 0,
    });
    const alert = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    render(<Harness />);
    await screen.findByText("Reviewed run");
    fireEvent.press(screen.getByRole("radio", { name: "Select Reviewed run" }));

    fireEvent.press(
      screen.getByRole("button", { name: "Delete selected Test Run" }),
    );

    expect(deleteTestRunMock).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(
      "Delete “Reviewed run”?",
      "This permanently removes the local Test Run, its database references, and HydroCycle-owned attachment copies. Source files outside HydroCycle are never deleted.",
      expect.arrayContaining([
        expect.objectContaining({ text: "Cancel", style: "cancel" }),
        expect.objectContaining({
          text: "Delete Test Run",
          style: "destructive",
        }),
      ]),
    );
    const buttons = alert.mock.calls[0]?.[2];
    act(() => buttons?.find((button) => button.text === "Cancel")?.onPress?.());
    expect(deleteTestRunMock).not.toHaveBeenCalled();
    expect(screen.getAllByText("Reviewed run").length).toBeGreaterThan(0);
    act(() =>
      buttons?.find((button) => button.text === "Delete Test Run")?.onPress?.(),
    );
    await waitFor(() =>
      expect(deleteTestRunMock).toHaveBeenCalledWith(
        "run-1",
        "2026-08-27T13:00:00Z",
      ),
    );
    await waitFor(() => expect(screen.queryByText("Reviewed run")).toBeNull());
  });

  it("reports locally owned attachment cleanup failures after deletion", async () => {
    const persisted = run("run-1", "Reviewed run", "valid");
    getTestRunsMock.mockResolvedValue([persisted]);
    deleteTestRunMock.mockResolvedValue({
      deleted: true,
      testRunId: "run-1",
      ownedAttachmentsRemoved: 1,
      ownedAttachmentCleanupFailures: 1,
    });
    const alert = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    render(<Harness />);
    await screen.findByText("Reviewed run");
    fireEvent.press(screen.getByRole("radio", { name: "Select Reviewed run" }));
    fireEvent.press(
      screen.getByRole("button", { name: "Delete selected Test Run" }),
    );
    const buttons = alert.mock.calls[0]?.[2];
    act(() =>
      buttons?.find((button) => button.text === "Delete Test Run")?.onPress?.(),
    );

    expect(
      await screen.findByText(
        "Run deleted, but 1 locally owned attachment could not be removed.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("Reviewed run")).toBeNull();
  });

  it("locks run selection while confirmed deletion is in flight", async () => {
    const first = run("run-1", "First run", "valid");
    const second = run("run-2", "Second run", "valid");
    getTestRunsMock.mockResolvedValue([first, second]);
    let resolveDelete!: (result: {
      deleted: boolean;
      testRunId: string;
      ownedAttachmentsRemoved: number;
      ownedAttachmentCleanupFailures: number;
    }) => void;
    deleteTestRunMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDelete = resolve;
        }),
    );
    const alert = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    render(<Harness />);
    await screen.findByText("First run");
    fireEvent.press(screen.getByRole("radio", { name: "Select First run" }));
    fireEvent.press(
      screen.getByRole("button", { name: "Delete selected Test Run" }),
    );
    const buttons = alert.mock.calls[0]?.[2];
    act(() =>
      buttons?.find((button) => button.text === "Delete Test Run")?.onPress?.(),
    );
    await screen.findByText("Deleting run…");

    const secondSelector = screen.getByRole("radio", {
      name: "Select Second run",
    });
    expect(secondSelector.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true, selected: false }),
    );
    fireEvent.press(secondSelector);
    expect(
      screen.getByRole("radio", { name: "Select First run" }).props
        .accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));

    await act(async () =>
      resolveDelete({
        deleted: true,
        testRunId: "run-1",
        ownedAttachmentsRemoved: 0,
        ownedAttachmentCleanupFailures: 0,
      }),
    );
    expect(screen.queryByText("First run")).toBeNull();
    expect(screen.getByText("Second run")).toBeTruthy();
  });

  it("merges edited fields onto a fresh server ledger before patching", async () => {
    const persisted = run("run-1", "Reviewed run", "valid");
    const concurrent: ApiTestRunDocument = {
      ...persisted,
      name: "Concurrent server name",
      updated_at: "2026-08-27T14:00:00Z",
      measurements: {
        ...persisted.measurements,
        headspace_gc_mg_l: {
          value: 1.7,
          unit: "mg/L",
          standard_uncertainty: 0.08,
          distribution: "normal",
          source_id: "CAL-HEADSPACE",
          basis: "measured",
        },
      },
    };
    getTestRunsMock.mockResolvedValue([persisted]);
    getTestRunMock.mockResolvedValue(concurrent);
    patchTestRunMock.mockResolvedValue({
      ...concurrent,
      notes: "Mobile note",
    });
    render(<Harness />);
    await screen.findByText("Reviewed run");
    fireEvent.press(screen.getByRole("radio", { name: "Select Reviewed run" }));
    fireEvent.changeText(screen.getByLabelText("Notes"), "Mobile note");
    fireEvent.press(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(patchTestRunMock).toHaveBeenCalledTimes(1));

    const payload = patchTestRunMock.mock.calls[0]?.[1];
    expect(payload?.name).toBe("Concurrent server name");
    expect(payload?.notes).toBe("Mobile note");
    expect(payload?.measurements?.headspace_gc_mg_l).toEqual(
      concurrent.measurements.headspace_gc_mg_l,
    );
    expect(payload?.expected_updated_at).toBe("2026-08-27T14:00:00Z");
  });

  it("keeps dirty edits and refuses to overwrite a concurrently changed field", async () => {
    const persisted = run("run-1", "Reviewed run", "valid");
    const concurrent: ApiTestRunDocument = {
      ...persisted,
      notes: "Server note",
      updated_at: "2026-08-27T14:00:00Z",
    };
    getTestRunsMock.mockResolvedValue([persisted]);
    getTestRunMock.mockResolvedValue(concurrent);
    render(<Harness />);
    await screen.findByText("Reviewed run");
    fireEvent.press(screen.getByRole("radio", { name: "Select Reviewed run" }));
    fireEvent.changeText(screen.getByLabelText("Notes"), "Mobile note");
    fireEvent.press(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText(/Test Run changed on the server in: Notes/),
    ).toBeTruthy();
    expect(screen.getByLabelText("Notes").props.value).toBe("Mobile note");
    expect(patchTestRunMock).not.toHaveBeenCalled();
  });
});
