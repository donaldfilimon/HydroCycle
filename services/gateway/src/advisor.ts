import {
  ADVISOR_SAFETY_REMINDER,
  advisorAnswerSchema,
  advisorContextSchema,
  validateAdvisorPolicy,
  type AdvisorAnswerV1,
  type AdvisorContextV1,
} from "@hydrocycle/advisor";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { Output, streamText } from "ai";

const MAX_CONTEXT_BYTES = 128 * 1024;
const DEFAULT_MODEL = "gemma4:12b-mlx";
const MODEL_NAME = /^[A-Za-z0-9._:-]{1,80}$/;

class Semaphore {
  private active = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async use<T>(operation: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) {
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
    this.active += 1;
    try {
      return await operation();
    } finally {
      this.active -= 1;
      this.waiters.shift()?.();
    }
  }
}

const generationSlots = new Semaphore(2);

function configuredModel(): string {
  const candidate = process.env.HYDROCYCLE_OLLAMA_MODEL ?? DEFAULT_MODEL;
  if (!MODEL_NAME.test(candidate)) {
    throw new Error("HYDROCYCLE_OLLAMA_MODEL is not a valid local model name.");
  }
  return candidate;
}

function advisorPrompt(context: AdvisorContextV1): string {
  return [
    "Answer only from the supplied HydroCycle evidence context.",
    "Return only one JSON object, with no Markdown fence and no preamble.",
    'Use exactly these top-level keys: "schemaVersion", "provider", "summary", "observations", "limitations", "suggestedEvidenceChecks", and "safetyReminder".',
    'Set "schemaVersion" to "1" and "provider" to "local-ollama". Each of the four statement arrays contains objects with only "text" and "evidenceRefs".',
    "Do not repeat the input context or add analysis, route, question, gate, inputs, result, selectedRuns, modelMetadata, or availableEvidence fields.",
    "Every numeric statement must cite one or more supplied evidence ids.",
    "Hydrogen is the fuel. Water is only a carrier, diluent, phase-change load, or possible thermal working fluid.",
    "Never recommend hardware actuation, ignition, injection, throttle, control-loop, or disposition actions.",
    "A failed gate has no proposed reactive cycle. Describe the motored baseline and evidence gaps only.",
    `Use this safetyReminder verbatim: ${ADVISOR_SAFETY_REMINDER}`,
    JSON.stringify(context),
  ].join("\n\n");
}

export function parseAdvisorRequest(raw: string): AdvisorContextV1 {
  if (new TextEncoder().encode(raw).byteLength > MAX_CONTEXT_BYTES) {
    throw new Error("Advisor context exceeds the 128 KiB limit.");
  }
  return advisorContextSchema.parse(JSON.parse(raw) as unknown);
}

export async function generateLocalAdvisorAnswer(
  context: AdvisorContextV1,
  signal: AbortSignal,
): Promise<AdvisorAnswerV1> {
  return generationSlots.use(async () => {
    const ollama = createOpenAICompatible({
      name: "hydrocycle-ollama",
      baseURL: "http://127.0.0.1:11434/v1",
      supportsStructuredOutputs: true,
    });
    const result = streamText({
      model: ollama(configuredModel()),
      prompt: advisorPrompt(context),
      output: Output.object({ schema: advisorAnswerSchema }),
      maxOutputTokens: 1_500,
      reasoning: "none",
      temperature: 0,
      maxRetries: 0,
      timeout: { totalMs: 90_000, firstChunkMs: 15_000, chunkMs: 15_000 },
      abortSignal: signal,
    });
    const output = await result.output;
    const answer = advisorAnswerSchema.parse({
      ...output,
      schemaVersion: "1",
      provider: "local-ollama",
      safetyReminder: ADVISOR_SAFETY_REMINDER,
    });
    return validateAdvisorPolicy(answer, context);
  });
}

export function chunkedObjectResponse(answer: AdvisorAnswerV1): Response {
  const encoded = new TextEncoder().encode(JSON.stringify(answer));
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let offset = 0; offset < encoded.length; offset += 256) {
        controller.enqueue(encoded.slice(offset, offset + 256));
      }
      controller.close();
    },
  });
  return new Response(body, {
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}
