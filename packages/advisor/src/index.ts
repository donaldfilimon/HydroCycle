import { z } from "zod";

export const ADVISOR_SAFETY_REMINDER =
  "Read-only evidence guidance. Hydrogen is the fuel; water is only a carrier, diluent, phase-change load, or thermal working fluid. No hardware controls are executed.";

export const advisorProviderSchema = z.enum(["local-ollama", "guided-fixture"]);

export const evidenceReferenceSchema = z
  .object({
    id: z.string().min(1).max(160),
    label: z.string().min(1).max(200),
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
    unit: z.string().max(40).nullable(),
  })
  .strict();

export const gateEvidenceSchema = z
  .object({
    passed: z.boolean(),
    failures: z.array(z.string().max(120)).max(32),
    proposedCycleAvailable: z.boolean(),
  })
  .strict();

export const advisorInputEvidenceSchema = z
  .object({
    measuredTotalMgL: z.number().finite().nullable(),
    retentionFraction: z.number().finite().nullable(),
    carrierVolumeMlPerCycle: z.number().finite().nullable(),
    recoveredHeatJ: z.number().finite().nullable(),
  })
  .strict();

export const advisorResultEvidenceSchema = z
  .object({
    hydrogenAvailableMg: z.number().finite().nullable(),
    hydrogenRequiredMg: z.number().finite().nullable(),
    energyMarginJ: z.number().finite().nullable(),
    indicatedWorkJ: z.number().finite().nullable(),
  })
  .strict();

export const advisorRunEvidenceSchema = z
  .object({
    id: z.string().min(1).max(120),
    status: z.enum(["draft", "needs_review", "valid", "invalid"]),
    totalH2MgL: z.number().finite().nullable(),
    retainedH2MgL: z.number().finite().nullable(),
    retentionFraction: z.number().finite().nullable(),
    persisted: z.boolean(),
  })
  .strict();

export const advisorModelMetadataSchema = z
  .object({
    solver: z.string().max(120).nullable(),
    python: z.string().max(80).nullable(),
    cantera: z.string().max(80).nullable(),
    mechanism: z.string().max(200).nullable(),
    seed: z.number().int().nullable(),
  })
  .strict();

export const advisorContextSchema = z
  .object({
    schemaVersion: z.literal("1"),
    route: z.enum(["summary", "workbench", "test-runs"]),
    question: z.string().trim().min(1).max(1_000),
    gate: gateEvidenceSchema,
    inputs: advisorInputEvidenceSchema,
    result: advisorResultEvidenceSchema.nullable(),
    selectedRuns: z.array(advisorRunEvidenceSchema).max(2),
    modelMetadata: advisorModelMetadataSchema.nullable(),
    availableEvidence: z.array(evidenceReferenceSchema).max(128),
  })
  .strict();

export const advisorStatementSchema = z
  .object({
    text: z.string().trim().min(1).max(800),
    evidenceRefs: z.array(z.string().min(1).max(160)).max(12),
  })
  .strict();

export const advisorAnswerSchema = z
  .object({
    schemaVersion: z.literal("1"),
    provider: advisorProviderSchema,
    summary: z.array(advisorStatementSchema).max(4),
    observations: z.array(advisorStatementSchema).max(8),
    limitations: z.array(advisorStatementSchema).max(8),
    suggestedEvidenceChecks: z.array(advisorStatementSchema).max(8),
    safetyReminder: z.literal(ADVISOR_SAFETY_REMINDER),
  })
  .strict();

export type AdvisorProvider = z.infer<typeof advisorProviderSchema>;
export type AdvisorEvidenceReference = z.infer<typeof evidenceReferenceSchema>;
export type AdvisorContextV1 = z.infer<typeof advisorContextSchema>;
export type AdvisorStatement = z.infer<typeof advisorStatementSchema>;
export type AdvisorAnswerV1 = z.infer<typeof advisorAnswerSchema>;

const numericClaim = /\d/;
const forbiddenControlClaim =
  /\b(actuat(?:e|or)|ignite|ignition command|injector command|throttle command|closed[- ]loop control|disposition command)\b/i;
const waterFuelClaim =
  /\bwater\b.{0,48}\b(fuel|chemical energy|combust(?:s|ion)|powers? the engine)\b|\b(fuel|chemical energy)\b.{0,48}\bwater\b/i;
const falsePassClaim =
  /\b(gate|feasibility)\b.{0,32}\b(pass(?:ed|es)?|feasible)\b/i;

export function validateAdvisorPolicy(
  answer: AdvisorAnswerV1,
  context: AdvisorContextV1,
): AdvisorAnswerV1 {
  const references = new Set(context.availableEvidence.map((item) => item.id));
  const statements = [
    ...answer.summary,
    ...answer.observations,
    ...answer.limitations,
    ...answer.suggestedEvidenceChecks,
  ];

  for (const statement of statements) {
    if (
      numericClaim.test(statement.text) &&
      statement.evidenceRefs.length === 0
    ) {
      throw new Error("Numeric advisory claims require evidence references.");
    }
    if (statement.evidenceRefs.some((id) => !references.has(id))) {
      throw new Error(
        "Advisor answer referenced evidence outside its context.",
      );
    }
    if (forbiddenControlClaim.test(statement.text)) {
      throw new Error(
        "Advisor answer included a hardware-control recommendation.",
      );
    }
    if (waterFuelClaim.test(statement.text)) {
      throw new Error(
        "Advisor answer incorrectly assigned fuel energy to water.",
      );
    }
    if (!context.gate.passed && falsePassClaim.test(statement.text)) {
      throw new Error(
        "Advisor answer contradicted the failed feasibility gate.",
      );
    }
  }

  if (!context.gate.passed && context.gate.proposedCycleAvailable) {
    throw new Error("A failed gate cannot expose a proposed reactive cycle.");
  }
  return answer;
}

export function guidedFixtureAnswer(
  context: AdvisorContextV1,
): AdvisorAnswerV1 {
  const missingMeasuredTotal = context.inputs.measuredTotalMgL === null;
  const gateRef = context.availableEvidence.find(
    (item) => item.id === "gate.status",
  );
  const measuredRef = context.availableEvidence.find(
    (item) => item.id === "inputs.hydrogen.measured_total_mg_l",
  );
  const primaryRef = gateRef?.id ? [gateRef.id] : [];

  const answer: AdvisorAnswerV1 = {
    schemaVersion: "1",
    provider: "guided-fixture",
    summary: [
      {
        text: context.gate.passed
          ? "The current evidence gate passes for this deterministic fixture."
          : "The current evidence gate does not support a proposed reactive cycle; only the motored baseline is available.",
        evidenceRefs: primaryRef,
      },
    ],
    observations: missingMeasuredTotal
      ? [
          {
            text: "Measured total hydrogen loading is unavailable, so it remains missing rather than being treated as zero.",
            evidenceRefs: measuredRef ? [measuredRef.id] : [],
          },
        ]
      : [
          {
            text: "Measured total hydrogen replaces any derived dissolved-plus-bubble estimate for this evidence context.",
            evidenceRefs: measuredRef ? [measuredRef.id] : [],
          },
        ],
    limitations: [
      {
        text: "This is a homogeneous, single-zone model and does not provide spatial or CFD evidence.",
        evidenceRefs: [],
      },
    ],
    suggestedEvidenceChecks: missingMeasuredTotal
      ? [
          {
            text: "Obtain a calibrated measured total hydrogen loading before interpreting feasibility.",
            evidenceRefs: measuredRef ? [measuredRef.id] : [],
          },
        ]
      : [
          {
            text: "Confirm retention and recovered-heat evidence under the same intake conditions.",
            evidenceRefs: [],
          },
        ],
    safetyReminder: ADVISOR_SAFETY_REMINDER,
  };
  return validateAdvisorPolicy(answer, context);
}
