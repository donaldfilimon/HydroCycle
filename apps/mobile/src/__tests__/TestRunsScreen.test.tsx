import { render, screen, waitFor } from "@testing-library/react-native";

import { getTestRuns, type ApiTestRunDocument } from "../api";
import TestRunsScreen, { statusTone } from "../screens/TestRunsScreen";
import { theme } from "../theme";

jest.mock("../api", () => ({
  getTestRuns: jest.fn(),
}));

const getTestRunsMock = jest.mocked(getTestRuns);

function run(
  id: string,
  name: string,
  status: "valid" | "invalid",
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
  } as unknown as ApiTestRunDocument;
}

describe("TestRunsScreen", () => {
  beforeEach(() => {
    getTestRunsMock.mockReset();
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
    expect(screen.getByText("2 measured · 0 synthetic")).toBeTruthy();
    expect(statusTone("valid")).toBe(theme.color.pass);
    expect(statusTone("invalid")).toBe(theme.color.fail);
  });
});
