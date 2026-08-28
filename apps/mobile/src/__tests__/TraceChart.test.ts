import { chartPoints } from "../components/TraceChart";

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
});
