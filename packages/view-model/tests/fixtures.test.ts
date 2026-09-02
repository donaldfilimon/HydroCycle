import { describe, expect, it } from "vitest";

import {
  DEFAULT_INPUTS,
  demoRuns,
  makeRetentionTrace,
  makeSimulationFixture,
} from "../src";

describe("frontend deterministic fixtures", () => {
  it("keeps the literature comparison gate failed and reactive trace null", () => {
    const result = makeSimulationFixture("literature", DEFAULT_INPUTS);
    expect(result.gate.passed).toBe(false);
    expect(result.gate.failures).toContain("insufficient_h2");
    expect(result.proposedCycle).toBeNull();
    expect(result.motoredBaseline.pressureBar.length).toBeGreaterThan(20);
  });

  it("reaches the cycle path only through an explicitly artificial pass fixture", () => {
    const result = makeSimulationFixture("artificial-pass", {
      ...DEFAULT_INPUTS,
      measuredTotalMgL: 62_000,
    });
    expect(result.label).toMatch(/artificial pass.*synthetic/i);
    expect(result.gate.passed).toBe(true);
    expect(result.proposedCycle).not.toBeNull();
    expect(result.proposedCycle?.indicatedWorkJ).toBeGreaterThan(0);
  });

  it("uses measured total as the loading mode without adding bubble content", () => {
    const measured = makeSimulationFixture("literature", {
      ...DEFAULT_INPUTS,
      measuredTotalMgL: 3.2,
    });
    expect(measured.loading.mode).toBe("measured_total");
    expect(measured.loading.initialTotalMgL).toBe(3.2);
    expect(measured.loading.dissolvedMgL).toBe(0);
    expect(measured.loading.bubbleContainedMgL).toBe(0);
  });

  it("is deterministic for identical inputs and seed", () => {
    const first = makeSimulationFixture("literature", DEFAULT_INPUTS);
    const second = makeSimulationFixture("literature", DEFAULT_INPUTS);
    expect(first).toEqual(second);
    expect(first.resultHash).toBe(second.resultHash);
  });

  it("does not share mutable fixture arrays between results", () => {
    const first = makeSimulationFixture("literature", DEFAULT_INPUTS);
    first.motoredBaseline.crankAngle[0] = 999;
    first.evidence[0]!.title = "mutated";

    const second = makeSimulationFixture("literature", DEFAULT_INPUTS);
    expect(second.motoredBaseline.crankAngle[0]).toBe(-180);
    expect(second.evidence[0]?.title).not.toBe("mutated");
  });

  it("fits high-retention endpoints without imposing artificial decay", () => {
    const trace = makeRetentionTrace({
      ...demoRuns[0]!,
      totalH2MgL: 10,
      retainedH2MgL: 9.9,
      elapsedS: 10,
    });

    expect(trace.modeled.at(-1)?.value).toBeCloseTo(9.9, 12);
  });
});
