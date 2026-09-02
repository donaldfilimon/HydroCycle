import { describe, expect, it } from "vitest";

import {
  ADVISOR_SAFETY_REMINDER,
  advisorAnswerSchema,
  advisorContextSchema,
  guidedFixtureAnswer,
  validateAdvisorPolicy,
} from "../src";

const context = advisorContextSchema.parse({
  schemaVersion: "1",
  route: "summary",
  question: "Why did this gate fail?",
  gate: {
    passed: false,
    failures: ["insufficient_h2"],
    proposedCycleAvailable: false,
  },
  inputs: {
    measuredTotalMgL: null,
    retentionFraction: 0.72,
    carrierVolumeMlPerCycle: 0.5,
    recoveredHeatJ: 0,
  },
  result: null,
  selectedRuns: [],
  modelMetadata: null,
  availableEvidence: [
    { id: "gate.status", label: "Gate status", value: "failed", unit: null },
    {
      id: "inputs.hydrogen.measured_total_mg_l",
      label: "Measured total hydrogen",
      value: null,
      unit: "mg/L",
    },
  ],
});

describe("advisor contracts", () => {
  it("produces deterministic schema-valid fixture guidance", () => {
    const answer = guidedFixtureAnswer(context);
    expect(advisorAnswerSchema.parse(answer).provider).toBe("guided-fixture");
    expect(answer.safetyReminder).toBe(ADVISOR_SAFETY_REMINDER);
  });

  it("rejects unreferenced numeric claims", () => {
    const answer = guidedFixtureAnswer(context);
    answer.observations.push({ text: "The margin is 12 J.", evidenceRefs: [] });
    expect(() => validateAdvisorPolicy(answer, context)).toThrow(/Numeric/);
  });

  it("rejects water-as-fuel and failed-gate contradictions", () => {
    const answer = guidedFixtureAnswer(context);
    answer.summary = [{ text: "Water is the fuel.", evidenceRefs: [] }];
    expect(() => validateAdvisorPolicy(answer, context)).toThrow(/water/i);

    answer.summary = [
      { text: "The feasibility gate passed.", evidenceRefs: ["gate.status"] },
    ];
    expect(() => validateAdvisorPolicy(answer, context)).toThrow(/gate/i);
  });
});
