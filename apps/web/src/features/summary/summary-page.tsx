"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CloudCog,
  Droplets,
  MessageSquareText,
  Sigma,
  Waves,
} from "lucide-react";
import Link from "next/link";

import {
  AdvisorLens,
  useAdvisorDisclosure,
} from "../../components/advisor-lens";
import { useHydroCycle } from "../../state/app-state";

function value(value: number | null, digits = 2): string {
  return value === null ? "Missing" : value.toFixed(digits);
}

export function SummaryPage() {
  const { state, runtime } = useHydroCycle();
  const [advisorOpen, setAdvisorOpen] = useAdvisorDisclosure();
  const { result } = state;
  const gate = result.gate;
  const terms = [
    ["Total H₂ Loading (Measured Total)", result.measuredTotalMgL, "mg H₂/L"],
    [
      "Retention at Intake",
      result.loading.retentionFraction === null
        ? null
        : result.loading.retentionFraction * 100,
      "%",
    ],
    ["H₂ Available per Cycle", gate.hydrogenAvailableMg, "mg H₂/cycle"],
    ["H₂ Chemical Energy (LHV)", gate.energyTerms.hydrogenChemicalJ, "J/cycle"],
    ["Water Sensible Heating", gate.energyTerms.sensibleHeatingJ, "J/cycle"],
    ["Water Phase-Change Load", gate.energyTerms.vaporizationJ, "J/cycle"],
    ["Recovered Heat", gate.energyTerms.recoveredHeatJ, "J/cycle"],
    ["Estimated Wall Loss", gate.energyTerms.wallLossJ, "J/cycle"],
    ["Target Indicated Work", gate.energyTerms.targetIndicatedWorkJ, "J/cycle"],
    ["Net Usable Energy Margin", gate.energyMarginJ, "J/cycle"],
  ] as const;
  return (
    <div className="summary-route">
      <div className="route-grid route-grid--summary">
        <section className="summary-main">
          <header className="route-heading">
            <div>
              <h1>SUMMARY</h1>
              <span>Evidence-Gated Feasibility</span>
            </div>
            <code>
              {runtime.mode === "local" ? "LOCAL MODEL" : "PUBLIC FIXTURE"} ·{" "}
              {result.resultHash}
            </code>
          </header>
          <section className="decision-aperture">
            <div
              className={`gate-orbit ${gate.passed ? "is-pass" : "is-fail"}`}
            >
              <div>{gate.passed ? <CheckCircle2 /> : <AlertTriangle />}</div>
              <strong>{gate.passed ? "GATE PASSED" : "GATE FAILED"}</strong>
              <span>
                {gate.passed
                  ? "PROPOSED CYCLE AVAILABLE"
                  : "MOTORED BASELINE ONLY"}
              </span>
            </div>
            <div className="decision-copy">
              <span>CONCLUSION</span>
              <h2>
                {gate.passed
                  ? "Evidence supports evaluation of the proposed reactive cycle."
                  : "Evidence is insufficient to demonstrate net positive indicated work from hydrogen."}
              </h2>
              <div className="provenance-line">
                {gate.passed ? (
                  <CheckCircle2 size={17} />
                ) : (
                  <AlertTriangle size={17} />
                )}
                <p>
                  {gate.passed
                    ? "Complete enough for this bounded 0D feasibility result."
                    : "Evidence gaps prevent feasibility; no reactive cycle is shown."}
                </p>
              </div>
            </div>
          </section>
          <section className="energy-horizon">
            <div className="energy-chain">
              <h2>
                ENERGY HORIZON{" "}
                <span>HydroCycle Energy Chain (Evidence-Based)</span>
              </h2>
              {terms.map(([label, amount], index) => (
                <div key={label} className={index >= 8 ? "is-terminal" : ""}>
                  <span>{label}</span>
                  <ArrowRight size={14} />
                  <code>{value(amount)}</code>
                </div>
              ))}
            </div>
            <div className="energy-table-wrap">
              <table>
                <caption className="sr-only">Energy evidence terms</caption>
                <thead>
                  <tr>
                    <th>Term</th>
                    <th>Value</th>
                    <th>Status</th>
                    <th>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {terms.map(([label, amount, unit]) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      <td>{value(amount)}</td>
                      <td>{amount === null ? "Missing" : "Available"}</td>
                      <td>{unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="evidence-domains">
            <article>
              <Waves />
              <h3>HYDROGEN LOADING</h3>
              <dl>
                <div>
                  <dt>Total H₂</dt>
                  <dd>{value(result.measuredTotalMgL)} mg/L</dd>
                </div>
                <div>
                  <dt>Retained</dt>
                  <dd>{value(result.loading.retainedMgL)} mg/L</dd>
                </div>
                <div>
                  <dt>Available</dt>
                  <dd>{value(gate.hydrogenAvailableMg)} mg/cycle</dd>
                </div>
              </dl>
              <p>
                Use calibrated measured total H₂ only. Never add a derived
                dissolved-plus-bubble estimate.
              </p>
            </article>
            <article>
              <Droplets />
              <h3>WATER ROLE</h3>
              <dl>
                <div>
                  <dt>Carrier / diluent</dt>
                  <dd>Yes</dd>
                </div>
                <div>
                  <dt>Sensible load</dt>
                  <dd>{value(gate.energyTerms.sensibleHeatingJ)} J</dd>
                </div>
                <div>
                  <dt>Phase-change load</dt>
                  <dd>{value(gate.energyTerms.vaporizationJ)} J</dd>
                </div>
              </dl>
              <p>
                Water transports and absorbs heat. It never contributes chemical
                fuel energy.
              </p>
            </article>
            <article>
              <CloudCog />
              <h3>THERMAL NOₓ RISK</h3>
              <dl>
                <div>
                  <dt>Peak temperature</dt>
                  <dd>
                    {value(
                      result.proposedCycle?.adiabaticTemperatureK ?? null,
                      0,
                    )}{" "}
                    K
                  </dd>
                </div>
                <div>
                  <dt>Model domain</dt>
                  <dd>0D homogeneous</dd>
                </div>
                <div>
                  <dt>Spatial evidence</dt>
                  <dd>Unavailable</dd>
                </div>
              </dl>
              <p>
                No flame fronts, gradients, kinetics fields, or CFD claims are
                produced.
              </p>
            </article>
            <article>
              <Sigma />
              <h3>UNCERTAINTY</h3>
              <dl>
                <div>
                  <dt>Input coverage</dt>
                  <dd>
                    {result.measuredTotalMgL === null ? "Partial" : "Measured"}
                  </dd>
                </div>
                <div>
                  <dt>Model structure</dt>
                  <dd>High</dd>
                </div>
                <div>
                  <dt>Overall</dt>
                  <dd>{gate.passed ? "Bounded" : "High"}</dd>
                </div>
              </dl>
              <p>
                Null is shown as missing. Numeric zero remains a real observed
                or computed zero.
              </p>
            </article>
          </section>
          <footer className="summary-actions">
            <Link href="/workbench">
              <span>OPEN IN WORKBENCH</span>
              <small>Review inputs and assumptions</small>
              <ArrowRight />
            </Link>
            <Link href="/test-runs">
              <span>COMPARE IN TEST RUNS</span>
              <small>Baseline and scenario comparison</small>
              <ArrowRight />
            </Link>
            {!advisorOpen ? (
              <button type="button" onClick={() => setAdvisorOpen(true)}>
                <span>ASK ADVISOR</span>
                <small>Read-only evidence guidance</small>
                <MessageSquareText />
              </button>
            ) : null}
          </footer>
        </section>
        {advisorOpen ? (
          <AdvisorLens route="summary" onClose={() => setAdvisorOpen(false)} />
        ) : null}
      </div>
    </div>
  );
}
