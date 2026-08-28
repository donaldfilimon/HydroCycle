import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import type { ReactNode } from "react";

import App from "../../App";
import { getTestRuns } from "../api";

jest.mock("../api", () => ({
  createTestRun: jest.fn(),
  getHealth: jest.fn(() => new Promise(() => undefined)),
  getTestRuns: jest.fn().mockResolvedValue([]),
  postSimulation: jest.fn(),
}));

jest.mock("react-native-safe-area-context", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  const passthrough = ({ children }: { children: ReactNode }) =>
    React.createElement(View, null, children);
  return { SafeAreaProvider: passthrough, SafeAreaView: passthrough };
});

const mockGetTestRuns = jest.mocked(getTestRuns);

describe("mobile tab state", () => {
  beforeEach(() => {
    mockGetTestRuns.mockClear();
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
});
