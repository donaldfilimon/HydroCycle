"use client";

import {
  advisorAnswerSchema,
  guidedFixtureAnswer,
  type AdvisorAnswerV1,
  type AdvisorContextV1,
} from "@hydrocycle/advisor";
import type { TestRunView } from "@hydrocycle/view-model";
import { useObject } from "@ai-sdk/react";
import { Bot, Send, Square, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useHydroCycle } from "../state/app-state";

function contextFor(
  route: AdvisorContextV1["route"],
  question: string,
  runs: TestRunView[],
  result: ReturnType<typeof useHydroCycle>["state"]["result"],
  draft: ReturnType<typeof useHydroCycle>["state"]["draft"],
): AdvisorContextV1 {
  return {
    schemaVersion: "1",
    route,
    question,
    gate: {
      passed: result.gate.passed,
      failures: result.gate.failures,
      proposedCycleAvailable: result.proposedCycle !== null,
    },
    inputs: {
      measuredTotalMgL: draft.measuredTotalMgL,
      retentionFraction: draft.retentionFraction,
      carrierVolumeMlPerCycle: draft.carrierVolumeMlPerCycle,
      recoveredHeatJ: draft.recoveredHeatJ,
    },
    result: {
      hydrogenAvailableMg: result.gate.hydrogenAvailableMg,
      hydrogenRequiredMg: result.gate.hydrogenRequiredMg,
      energyMarginJ: result.gate.energyMarginJ,
      indicatedWorkJ: result.proposedCycle?.indicatedWorkJ ?? null,
    },
    selectedRuns: runs.slice(0, 2).map((run) => ({
      id: run.id,
      status: run.status,
      totalH2MgL: run.totalH2MgL,
      retainedH2MgL: run.retainedH2MgL,
      retentionFraction: run.retentionFraction,
      persisted: run.persisted,
    })),
    modelMetadata: null,
    availableEvidence: [
      {
        id: "gate.status",
        label: "Gate status",
        value: result.gate.passed ? "passed" : "failed",
        unit: null,
      },
      {
        id: "inputs.hydrogen.measured_total_mg_l",
        label: "Measured total hydrogen",
        value: draft.measuredTotalMgL,
        unit: "mg/L",
      },
      {
        id: "inputs.hydrogen.retention_fraction",
        label: "Retention fraction",
        value: draft.retentionFraction,
        unit: null,
      },
      {
        id: "results.energy.margin_j",
        label: "Net energy margin",
        value: result.gate.energyMarginJ,
        unit: "J/cycle",
      },
      {
        id: "results.hydrogen.available_mg",
        label: "Hydrogen available",
        value: result.gate.hydrogenAvailableMg,
        unit: "mg/cycle",
      },
    ],
  };
}

function AnswerSection({
  title,
  items,
}: {
  title: string;
  items: AdvisorAnswerV1["summary"];
}) {
  if (items.length === 0) return null;
  return (
    <section className="advisor-section">
      <h3>{title}</h3>
      {items.map((item, index) => (
        <div key={`${title}-${index}`}>
          <p>{item.text}</p>
          {item.evidenceRefs.length > 0 ? (
            <code>{item.evidenceRefs.join(" · ")}</code>
          ) : null}
        </div>
      ))}
    </section>
  );
}

export function AdvisorLens({
  route,
  runs = [],
  open = true,
  onClose,
}: {
  route: AdvisorContextV1["route"];
  runs?: TestRunView[];
  open?: boolean;
  onClose?: () => void;
}) {
  const { runtime, state } = useHydroCycle();
  const [question, setQuestion] = useState(
    "Why did this evidence gate reach its current decision?",
  );
  const [fixtureAnswer, setFixtureAnswer] = useState<AdvisorAnswerV1 | null>(
    null,
  );
  const { object, submit, isLoading, stop, clear, error } = useObject({
    api: "/gateway/advisor",
    schema: advisorAnswerSchema,
  });
  const answer = useMemo(
    () =>
      fixtureAnswer ??
      (object ? (advisorAnswerSchema.safeParse(object).data ?? null) : null),
    [fixtureAnswer, object],
  );

  useEffect(() => {
    clear();
    setFixtureAnswer(null);
  }, [clear, state.advisorContextKey]);

  if (!open) return null;
  async function ask() {
    const context = contextFor(
      route,
      question,
      runs,
      state.result,
      state.draft,
    );
    if (runtime.mode === "hosted") {
      setFixtureAnswer(guidedFixtureAnswer(context));
      return;
    }
    await submit(context);
  }

  return (
    <aside className="advisor-lens" aria-label="Advisor lens">
      <header>
        <div>
          <Bot size={18} />
          <strong>ADVISOR</strong>
          <span>READ-ONLY</span>
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} aria-label="Close advisor">
            <X size={17} />
          </button>
        ) : null}
      </header>
      <div className="advisor-lens__body" aria-live="polite">
        {answer ? (
          <>
            <AnswerSection title="Why this decision" items={answer.summary} />
            <AnswerSection title="Observations" items={answer.observations} />
            <AnswerSection title="Limitations" items={answer.limitations} />
            <AnswerSection
              title="Next evidence checks"
              items={answer.suggestedEvidenceChecks}
            />
            <p className="advisor-safety">{answer.safetyReminder}</p>
          </>
        ) : (
          <div className="advisor-empty">
            <Bot size={28} />
            <p>
              Ask for an evidence-bound explanation. No controls are available
              from this lens.
            </p>
          </div>
        )}
        {error ? <p className="advisor-error">{error.message}</p> : null}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void ask();
        }}
      >
        <label className="sr-only" htmlFor={`advisor-${route}`}>
          Question for the read-only advisor
        </label>
        <textarea
          id={`advisor-${route}`}
          maxLength={1_000}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
        {isLoading ? (
          <button type="button" onClick={stop}>
            <Square size={15} /> Stop
          </button>
        ) : (
          <button type="submit" disabled={!question.trim()}>
            <Send size={15} /> Ask advisor
          </button>
        )}
      </form>
    </aside>
  );
}
