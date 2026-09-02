import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import type { ReactNode } from "react";
import { Alert } from "react-native";

import App from "../../App";
import {
  getTestRuns,
  getTestRun,
  patchTestRun,
  postSimulation,
  type ApiSimulationResult,
  type ApiTestRunDocument,
} from "../api";

jest.mock("../api", () => ({
  createTestRun: jest.fn(),
  getHealth: jest.fn(() => new Promise(() => undefined)),
  getTestRuns: jest.fn().mockResolvedValue([]),
  getTestRun: jest.fn(),
  patchTestRun: jest.fn(),
  postSimulation: jest.fn(),
}));

jest.mock("react-native-safe-area-context", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  const provider = ({ children }: { children: ReactNode }) =>
    React.createElement(View, null, children);
  const safeArea = ({
    children,
    ...props
  }: {
    children: ReactNode;
    edges?: string[];
    testID?: string;
  }) => React.createElement(View, props, children);
  return { SafeAreaProvider: provider, SafeAreaView: safeArea };
});

const mockGetTestRuns = jest.mocked(getTestRuns);
const mockGetTestRun = jest.mocked(getTestRun);
const mockPatchTestRun = jest.mocked(patchTestRun);
const mockPostSimulation = jest.mocked(postSimulation);

function reviewedRun(): ApiTestRunDocument {
  return {
    id: "reviewed-mobile-run",
    name: "Reviewed mobile evidence",
    status: "valid",
    is_demo_synthetic: false,
    operator: "Mobile operator",
    sample_id: "MOBILE-42",
    notes: "Reviewed on the web client",
    provenance: {
      source: "headspace GC export",
      method: "headspace GC",
      is_demo_synthetic: false,
    },
    measurements: {
      total_h2_mg_l: {
        value: 2.5,
        unit: "mg/L",
        standard_uncertainty: 0.1,
        distribution: "normal",
        source_id: "CAL-MOBILE",
        basis: "measured",
      },
    },
    calibration_references: [
      {
        id: "CAL-MOBILE",
        instrument: "GC",
        method: "headspace GC",
        applies_to: [],
      },
    ],
    comparisons: { items: [] },
    evidence: [],
    attachments: [],
    simulation_ids: [],
    created_at: "2026-08-27T12:00:00Z",
    updated_at: "2026-08-27T13:00:00Z",
  };
}

function simulationResult(): ApiSimulationResult {
  return {
    result_id: "linked-simulation-1",
    gate: {
      passed: false,
      failures: ["insufficient_h2"],
      hydrogen_available: { value: 1, unit: "mg/cycle" },
      hydrogen_required: { value: 2, unit: "mg/cycle" },
      hydrogen_mass_margin_mg_per_cycle: -1,
    },
    loading: {
      mode: "measured_total",
      dissolved_h2_mg_l: { value: null, unit: "mg/L" },
      bubble_contained_h2_mg_l: { value: null, unit: "mg/L" },
      total_h2_mg_l: { value: 2.5, unit: "mg/L" },
    },
    motored_baseline: {
      crank_angle_deg: [-1, 1],
      pressure_pa: [100_000, 110_000],
      temperature_k: [300, 305],
    },
    proposed_cycle: null,
    reproducibility: {
      schema_version: "1.0.0",
      model_version: "test-model",
      solver_version: "test-solver",
      python_version: "3.13",
      cantera_available: false,
      cantera_version: null,
      mechanism: null,
      random_seed: 42,
    },
  } as unknown as ApiSimulationResult;
}

describe("mobile tab state", () => {
  beforeEach(() => {
    mockGetTestRuns.mockReset();
    mockGetTestRuns.mockResolvedValue([]);
    mockGetTestRun.mockReset();
    mockPatchTestRun.mockReset();
    mockPostSimulation.mockReset();
    jest.restoreAllMocks();
  });

  it("reserves the bottom safe area for reachable tab navigation", () => {
    render(<App />);

    expect(screen.getByTestId("app-safe-area").props.edges).toEqual(
      expect.arrayContaining(["top", "left", "right", "bottom"]),
    );
  });

  it("preserves Workbench edits while visiting the other screens", () => {
    render(<App />);

    fireEvent.press(screen.getByRole("tab", { name: "Workbench" }));
    fireEvent.changeText(screen.getByLabelText("Speed"), "2400");
    expect(screen.getByLabelText("Speed").props.value).toBe("2400");

    fireEvent.press(screen.getByRole("tab", { name: "Summary" }));
    expect(screen.queryByLabelText("Speed")).toBeNull();

    fireEvent.press(screen.getByRole("tab", { name: "Workbench" }));
    expect(screen.getByLabelText("Speed").props.value).toBe("2400");
  });

  it("reloads Test Runs when the tab is revisited", async () => {
    render(<App />);

    fireEvent.press(screen.getByRole("tab", { name: "Test Runs" }));
    await waitFor(() => expect(mockGetTestRuns).toHaveBeenCalledTimes(1));

    fireEvent.press(screen.getByRole("tab", { name: "Summary" }));
    fireEvent.press(screen.getByRole("tab", { name: "Test Runs" }));
    await waitFor(() => expect(mockGetTestRuns).toHaveBeenCalledTimes(2));
  });

  it("uses selected reviewed evidence, links it, and shares the result with Summary", async () => {
    mockGetTestRuns.mockResolvedValue([reviewedRun()]);
    mockGetTestRun.mockResolvedValue(reviewedRun());
    mockPostSimulation.mockResolvedValue(simulationResult());
    render(<App />);

    fireEvent.press(screen.getByRole("tab", { name: "Test Runs" }));
    await screen.findByText("Reviewed mobile evidence");
    fireEvent.press(
      screen.getByRole("radio", { name: "Select Reviewed mobile evidence" }),
    );
    fireEvent.press(screen.getByRole("tab", { name: "Workbench" }));
    fireEvent.press(screen.getByRole("button", { name: "Run simulation" }));

    await waitFor(() => expect(mockPostSimulation).toHaveBeenCalledTimes(1));
    const [request, persistence] = mockPostSimulation.mock.calls[0] ?? [];
    expect(request?.sample?.measured_total_h2_mg_l).toEqual(
      expect.objectContaining({ value: 2.5, basis: "measured" }),
    );
    expect(persistence).toEqual({ testRunId: "reviewed-mobile-run" });
    await screen.findByText("FAILED");

    fireEvent.press(screen.getByRole("tab", { name: "Summary" }));
    expect(screen.getByText("Selected persisted Test Run")).toBeTruthy();
    expect(screen.getByText("linked-simulation-1")).toBeTruthy();
    expect(screen.getByText("test-model")).toBeTruthy();
    expect(mockPostSimulation).toHaveBeenCalledTimes(1);
  });

  it("does not offer a false cancel while a persisted evaluation is running", async () => {
    mockPostSimulation.mockImplementation(() => new Promise(() => undefined));
    render(<App />);
    fireEvent.press(screen.getByRole("tab", { name: "Workbench" }));
    fireEvent.press(screen.getByRole("button", { name: "Run simulation" }));
    await waitFor(() => expect(mockPostSimulation).toHaveBeenCalledTimes(1));
    expect(
      screen.getByRole("button", { name: "Reset" }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ disabled: true }));
    expect(screen.queryByRole("button", { name: /cancel/i })).toBeNull();
  });

  it("does not let discard navigation unmount an in-flight save", async () => {
    mockGetTestRuns.mockResolvedValue([reviewedRun()]);
    mockGetTestRun.mockResolvedValue(reviewedRun());
    let resolvePatch!: (run: ApiTestRunDocument) => void;
    mockPatchTestRun.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePatch = resolve;
        }),
    );
    const alert = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    render(<App />);
    fireEvent.press(screen.getByRole("tab", { name: "Test Runs" }));
    await screen.findByText("Reviewed mobile evidence");
    fireEvent.press(
      screen.getByRole("radio", { name: "Select Reviewed mobile evidence" }),
    );
    fireEvent.changeText(screen.getByLabelText("Name"), "Saved name");
    fireEvent.press(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Saving…");

    fireEvent.press(screen.getByRole("tab", { name: "Summary" }));

    expect(alert).toHaveBeenCalledWith(
      "Test Run operation in progress",
      "Wait for the server-authoritative response before leaving this screen.",
    );
    expect(screen.getByText("Edit selected run")).toBeTruthy();
    await act(async () =>
      resolvePatch({ ...reviewedRun(), name: "Saved name" }),
    );
    await screen.findByDisplayValue("Saved name");
  });

  it("does not reselect an old run when its linked simulation finishes late", async () => {
    const first = reviewedRun();
    const second = {
      ...reviewedRun(),
      id: "second-run",
      name: "Second reviewed run",
    };
    mockGetTestRuns.mockResolvedValue([first, second]);
    let resolveSimulation!: (result: ApiSimulationResult) => void;
    mockPostSimulation.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSimulation = resolve;
        }),
    );
    render(<App />);
    fireEvent.press(screen.getByRole("tab", { name: "Test Runs" }));
    await screen.findByText("Reviewed mobile evidence");
    fireEvent.press(
      screen.getByRole("radio", { name: "Select Reviewed mobile evidence" }),
    );
    fireEvent.press(screen.getByRole("tab", { name: "Workbench" }));
    fireEvent.press(screen.getByRole("button", { name: "Run simulation" }));
    await waitFor(() => expect(mockPostSimulation).toHaveBeenCalledTimes(1));

    fireEvent.press(screen.getByRole("tab", { name: "Test Runs" }));
    await screen.findByText("Second reviewed run");
    fireEvent.press(
      screen.getByRole("radio", { name: "Select Second reviewed run" }),
    );
    await act(async () => resolveSimulation(simulationResult()));
    fireEvent.press(screen.getByRole("tab", { name: "Summary" }));

    expect(screen.getByText("Second reviewed run")).toBeTruthy();
    expect(screen.getByText("Stale Test Run link")).toBeTruthy();
  });

  it("links a late simulation without overwriting edits to the same run", async () => {
    const original = reviewedRun();
    const saved = { ...original, name: "Saved during simulation" };
    mockGetTestRuns.mockResolvedValue([original]);
    mockGetTestRun.mockResolvedValue(original);
    mockPatchTestRun.mockResolvedValue(saved);
    let resolveSimulation!: (result: ApiSimulationResult) => void;
    mockPostSimulation.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSimulation = resolve;
        }),
    );
    render(<App />);
    fireEvent.press(screen.getByRole("tab", { name: "Test Runs" }));
    await screen.findByText("Reviewed mobile evidence");
    fireEvent.press(
      screen.getByRole("radio", { name: "Select Reviewed mobile evidence" }),
    );
    fireEvent.press(screen.getByRole("tab", { name: "Workbench" }));
    fireEvent.press(screen.getByRole("button", { name: "Run simulation" }));
    await waitFor(() => expect(mockPostSimulation).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByRole("tab", { name: "Test Runs" }));
    await screen.findByText("Reviewed mobile evidence");
    fireEvent.changeText(screen.getByLabelText("Name"), saved.name);
    fireEvent.press(screen.getByRole("button", { name: "Save" }));
    await screen.findByDisplayValue(saved.name);

    await act(async () => resolveSimulation(simulationResult()));
    fireEvent.press(screen.getByRole("tab", { name: "Summary" }));

    expect(screen.getByText(saved.name)).toBeTruthy();
    expect(screen.queryByText("Stale Test Run link")).toBeNull();
  });

  it("confirms before leaving Test Runs with a dirty editor", async () => {
    mockGetTestRuns.mockResolvedValue([reviewedRun()]);
    const alert = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    render(<App />);
    fireEvent.press(screen.getByRole("tab", { name: "Test Runs" }));
    await screen.findByText("Reviewed mobile evidence");
    fireEvent.press(
      screen.getByRole("radio", { name: "Select Reviewed mobile evidence" }),
    );
    fireEvent.changeText(screen.getByLabelText("Name"), "Unsaved name");

    fireEvent.press(screen.getByRole("tab", { name: "Summary" }));

    expect(alert).toHaveBeenCalledWith(
      "Discard Test Run edits?",
      "Unsaved changes will be lost.",
      expect.arrayContaining([
        expect.objectContaining({ text: "Cancel", style: "cancel" }),
        expect.objectContaining({ text: "Discard", style: "destructive" }),
      ]),
    );
    expect(screen.getByText("Edit selected run")).toBeTruthy();
    const buttons = alert.mock.calls[0]?.[2];
    act(() => buttons?.find((button) => button.text === "Cancel")?.onPress?.());
    expect(screen.getByText("Edit selected run")).toBeTruthy();
    act(() =>
      buttons?.find((button) => button.text === "Discard")?.onPress?.(),
    );
    expect(screen.queryByText("Edit selected run")).toBeNull();
    expect(screen.getByText(/Canonical contract fixture/)).toBeTruthy();
  });
});
