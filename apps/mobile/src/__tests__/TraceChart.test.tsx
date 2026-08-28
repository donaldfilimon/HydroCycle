import { render, screen } from "@testing-library/react-native";

import { chartPoints, TraceChart } from "../components/TraceChart";

describe("chartPoints", () => {
  it("maps aligned finite scalar traces into SVG points", () => {
    const points = chartPoints([-180, 0, 180], [1, 10, 1]);
    expect(points?.split(" ")).toHaveLength(3);
    expect(points).not.toContain("NaN");
  });

  it("rejects missing or misaligned traces", () => {
    expect(chartPoints([], [])).toBeNull();
    expect(chartPoints([0, 1], [1])).toBeNull();
  });

  it("announces an unavailable trace instead of a cosmetic range", () => {
    render(<TraceChart title="Pressure" x={[0, 1]} values={[1]} unit="bar" />);
    expect(screen.getByLabelText("Pressure. Trace unavailable.")).toBeTruthy();
    expect(screen.getByText("Trace unavailable")).toBeTruthy();
  });
});
