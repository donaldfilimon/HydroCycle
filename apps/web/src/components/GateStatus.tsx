import { Check, CircleX, TriangleAlert } from "lucide-react";

import type { GateView } from "@hydrocycle/view-model";

interface GateStatusProps {
  gate: GateView;
  compact?: boolean;
}

const failureLabels: Record<string, string> = {
  invalid_data: "Invalid input data",
  mass_balance_failed: "Mass balance failed",
  insufficient_h2: "Insufficient retained H₂",
  preheat_deficit: "Carrier preheat deficit",
  outside_model_domain: "Outside model domain",
};

export function GateStatus({ gate, compact = false }: GateStatusProps) {
  const statusClass = gate.passed
    ? "gate-status gate-status--pass"
    : "gate-status gate-status--fail";
  return (
    <section className={statusClass} aria-label="Feasibility gate result">
      <span className="gate-status__icon" aria-hidden="true">
        {gate.passed ? <Check /> : compact ? <TriangleAlert /> : <CircleX />}
      </span>
      <span>
        <strong>{gate.passed ? "Pass" : "Failed"}</strong>
        <small>
          {gate.passed
            ? "Mass and energy thresholds met for this bounded input."
            : gate.failures
                .map((failure) => failureLabels[failure] ?? failure)
                .join(" · ")}
        </small>
      </span>
    </section>
  );
}
