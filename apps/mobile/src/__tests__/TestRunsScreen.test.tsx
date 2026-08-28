import {
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";

import { createTestRun, getTestRuns, type ApiTestRunDocument } from "../api";
import TestRunsScreen, {
  hasRecordedMeasurements,
  statusTone,
} from "../screens/TestRunsScreen";
import { theme } from "../theme";

jest.mock("../api", () => ({
  createTestRun: jest.fn(),
  getTestRuns: jest.fn(),
}));

const getTestRunsMock = jest.mocked(getTestRuns);
const createTestRunMock = jest.mocked(createTestRun);

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
    created_at: "2026-08-27T12:00:00Z",
    simulation_ids: [],
    measurements: {
      total_h2_mg_l: { value: 1.5, unit: "mg/L" },
    },
  } as unknown as ApiTestRunDocument;
}

describe("TestRunsScreen", () => {
  beforeEach(() => {
    getTestRunsMock.mockReset();
    createTestRunMock.mockReset();
  });

  it("renders populated valid and invalid runs distinctly", async () => {
    getTestRunsMock.mockResolvedValue([
      run("valid-1", "Reviewed run", "valid"),
      run("invalid-1", "Rejected run", "invalid"),
    ]);

    render(<TestRunsScreen />);

    await waitFor(() => {
      expect(screen.getByText("Reviewed run")).toBeTruthy();
      expect(screen.getByText("Rejected run")).toBeTruthy();
    });
    expect(
      screen.getByText("2 measured · 0 unmeasured · 0 synthetic"),
    ).toBeTruthy();
    expect(statusTone("valid")).toBe(theme.color.pass);
    expect(statusTone("invalid")).toBe(theme.color.fail);
  });

  it("creates an additive empty draft and prepends the returned document", async () => {
    const user = userEvent.setup();
    getTestRunsMock.mockResolvedValue([]);
    const draft = run("draft-1", "Mobile draft", "draft");
    draft.measurements = {};
    createTestRunMock.mockResolvedValue(draft);

    render(<TestRunsScreen />);
    await screen.findByText("No persisted runs");
    await user.press(screen.getByRole("button", { name: "Create draft" }));

    await screen.findByText("Mobile draft");
    expect(createTestRunMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: "draft", is_demo_synthetic: false }),
    );
    expect(
      screen.getByText("0 measured · 1 unmeasured · 0 synthetic"),
    ).toBeTruthy();
    expect(hasRecordedMeasurements(draft)).toBe(false);
  });
});
