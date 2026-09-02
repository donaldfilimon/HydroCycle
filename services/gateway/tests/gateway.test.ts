import { describe, expect, it } from "vitest";

import { parseAdvisorRequest } from "../src/advisor";
import { isAllowedModelPath } from "../src/proxy";
import { GATEWAY_HOST, GATEWAY_PORT } from "../src/server";

describe("loopback gateway", () => {
  it("has an immutable loopback bind", () => {
    expect(GATEWAY_HOST).toBe("127.0.0.1");
    expect(GATEWAY_PORT).toBe(8_787);
  });

  it("allows only HydroCycle model routes", () => {
    expect(isAllowedModelPath("/api/v1/health")).toBe(true);
    expect(isAllowedModelPath("/api/v1/test-runs/R-001/export")).toBe(true);
    expect(isAllowedModelPath("/api/v1/admin")).toBe(false);
    expect(isAllowedModelPath("/api/v1/test-runs/../../etc/passwd")).toBe(
      false,
    );
    expect(isAllowedModelPath("http://example.com/api/v1/health")).toBe(false);
  });

  it("rejects unknown advisor fields and oversized questions", () => {
    const base = {
      schemaVersion: "1",
      route: "summary",
      question: "Why?",
      gate: { passed: false, failures: [], proposedCycleAvailable: false },
      inputs: {
        measuredTotalMgL: null,
        retentionFraction: null,
        carrierVolumeMlPerCycle: null,
        recoveredHeatJ: null,
      },
      result: null,
      selectedRuns: [],
      modelMetadata: null,
      availableEvidence: [],
    };
    expect(() =>
      parseAdvisorRequest(JSON.stringify({ ...base, secret: "no" })),
    ).toThrow();
    expect(() =>
      parseAdvisorRequest(
        JSON.stringify({ ...base, question: "x".repeat(1_001) }),
      ),
    ).toThrow();
  });
});
