import {
  ArrowRight,
  Beaker,
  CircleHelp,
  ExternalLink,
  Eye,
  Flame,
  Gauge,
  Info,
  ShieldAlert,
  Snowflake,
  Waves,
} from "lucide-react";

import type { SimulationView, TestRunView } from "@hydrocycle/view-model";
import { GateStatus } from "../components/GateStatus";
import { SensitivityBars } from "../components/Charts";
import { CylinderSchematic } from "../components/CylinderSchematic";

interface SummaryScreenProps {
  simulation: SimulationView;
  selectedRun: TestRunView | null;
  uncertaintyVisible: boolean;
  onToggleUncertainty: () => void;
  onOpenWorkbench: () => void;
}

const format = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 });

function Metric({
  label,
  value,
  interval,
  note,
}: {
  label: string;
  value: string;
  interval?: string | undefined;
  note: string;
}) {
  return (
    <div className="summary-metric">
      <span>
        {label} <Info size={13} aria-hidden="true" />
      </span>
      <strong>{value}</strong>
      {interval ? <small>{interval}</small> : null}
      <em>{note}</em>
    </div>
  );
}

export function SummaryScreen({
  simulation,
  selectedRun,
  uncertaintyVisible,
  onToggleUncertainty,
  onOpenWorkbench,
}: SummaryScreenProps) {
  const energyKjL = (simulation.loading.initialTotalMgL * 120) / 1_000;
  const carrierVolumeL = Math.max(
    1e-9,
    simulation.sampleVolumeMlPerCycle / 1_000,
  );
  const waterBurdenKjL =
    simulation.gate.energyTerms.vaporizationJ / carrierVolumeL / 1_000;
  const sensibleHeatingKjL =
    simulation.gate.energyTerms.sensibleHeatingJ / carrierVolumeL / 1_000;
  const waterInjectionScenario =
    simulation.scenario === "hydrogen_fuel_with_water_injection";
  const requiredRatio =
    simulation.gate.hydrogenRequiredMg /
    Math.max(1e-12, simulation.gate.hydrogenAvailableMg);
  const interval = simulation.loading.intervalMgL;
  const summaryCycle = simulation.proposedCycle ?? simulation.motoredBaseline;
  const summaryCycleIndex = summaryCycle.crankAngle.reduce(
    (best, angle, index) =>
      Math.abs(angle + 10) <
      Math.abs((summaryCycle.crankAngle[best] ?? -10) + 10)
        ? index
        : best,
    0,
  );
  const conclusion = simulation.gate.passed
    ? "The bounded input clears the mass-and-energy gate; inspect the proposed single-zone cycle."
    : "Current loading does not carry enough retained hydrogen to sustain the selected operating point.";
  const selectedRunEligible =
    selectedRun !== null &&
    selectedRun.persisted &&
    !selectedRun.synthetic &&
    (selectedRun.status === "needs_review" || selectedRun.status === "valid");
  const selectedMeasurementCount = selectedRunEligible
    ? selectedRun.measurementDatasetCount
    : 0;
  const literatureEvidence = simulation.evidence.filter(
    (item) => item.basis === "literature",
  );
  const assumptionEvidence = simulation.evidence.filter(
    (item) => item.basis === "user_assumption",
  );

  return (
    <div className="summary-screen screen-frame">
      <section className="summary-overview" aria-labelledby="summary-title">
        <div className="summary-overview__heading">
          <h1 id="summary-title">Concept feasibility at a glance</h1>
          <div>
            <span>Conclusion</span>
            <strong>
              Hydrogen is the fuel; water is the carrier and thermal load.
            </strong>
            <p>{conclusion}</p>
          </div>
        </div>

        <div className="summary-overview__body">
          <div className="summary-overview__main">
            <div className="summary-metrics">
              <Metric
                label={
                  waterInjectionScenario
                    ? "Carrier-water H₂ loading"
                    : simulation.measuredTotalMgL === null
                      ? "Derived total H₂ reference"
                      : "Measured total H₂"
                }
                value={`${format.format(simulation.loading.initialTotalMgL)} mg H₂/L`}
                interval={
                  uncertaintyVisible
                    ? `[${format.format(interval.low)} – ${format.format(interval.high)}]`
                    : undefined
                }
                note={
                  simulation.measuredTotalMgL === null
                    ? "NIST dissolved reference + explicit bubble estimate"
                    : "Measured total replaces all derived loading"
                }
              />
              <Metric
                label={
                  waterInjectionScenario
                    ? "Separate H₂ chemical energy"
                    : "Chemical energy carried (LHV)"
                }
                value={
                  waterInjectionScenario
                    ? `${format.format(simulation.gate.energyTerms.hydrogenChemicalJ)} J/cycle`
                    : `${format.format(energyKjL)} kJ/L`
                }
                interval={
                  uncertaintyVisible ? "≈120 MJ/kg H₂ basis" : undefined
                }
                note={
                  waterInjectionScenario
                    ? "Hydrogen is supplied separately from the injected water"
                    : "Hydrogen chemical energy only"
                }
              />
              <Metric
                label={
                  waterInjectionScenario
                    ? "Water-injection phase load"
                    : "Carrier liquid-to-vapor burden"
                }
                value={`${format.format(waterBurdenKjL)} kJ/L`}
                interval={
                  uncertaintyVisible
                    ? `${format.format(sensibleHeatingKjL)} kJ/L sensible heating in this case`
                    : undefined
                }
                note={
                  waterInjectionScenario
                    ? "Charge-cooling / diluent load; never chemical energy"
                    : "Positive system load unless recovered heat is measured"
                }
              />
              <div className="summary-gate-metric">
                <span>Feasibility gate</span>
                <GateStatus gate={simulation.gate} compact />
                <em>
                  {simulation.gate.passed
                    ? "Reactive trace available"
                    : `Required/available H₂ ratio ≈ ${format.format(requiredRatio)}`}
                </em>
              </div>
            </div>

            <section className="energy-theater" aria-labelledby="pathway-title">
              <div className="energy-theater__header">
                <h2 id="pathway-title">
                  {waterInjectionScenario
                    ? "Separate-hydrogen + water-injection pathway"
                    : "Energy pathway per litre of carrier"}
                </h2>
                <div>
                  <label className="toggle-control">
                    <input type="checkbox" checked readOnly />
                    <span /> LHV basis
                  </label>
                  <button
                    className="theater-button"
                    type="button"
                    onClick={onToggleUncertainty}
                  >
                    <Eye size={14} aria-hidden="true" />
                    {uncertaintyVisible
                      ? "Hide uncertainty"
                      : "Show uncertainty"}
                  </button>
                  <button
                    className="theater-button"
                    type="button"
                    onClick={onOpenWorkbench}
                  >
                    Open in Workbench{" "}
                    <ExternalLink size={13} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div
                className="energy-flow"
                role="img"
                aria-label="Energy-flow comparison showing hydrogen chemical energy, water heating, vaporization burden, losses, and indicated work"
              >
                <div className="energy-flow__stage energy-flow__stage--input">
                  <span>
                    {waterInjectionScenario
                      ? "Separately supplied H₂"
                      : "H₂ chemical energy"}
                  </span>
                  <strong>
                    {waterInjectionScenario
                      ? `${format.format(simulation.gate.energyTerms.hydrogenChemicalJ)} J/cycle`
                      : `${format.format(energyKjL)} kJ/L`}
                  </strong>
                  <i
                    style={{
                      height: `${Math.max(18, Math.min(80, 18 + Math.log10(energyKjL + 1) * 22))}px`,
                    }}
                  />
                </div>
                <ArrowRight className="energy-flow__arrow" aria-hidden="true" />
                <div className="energy-flow__stage energy-flow__stage--burden">
                  <span>
                    {waterInjectionScenario
                      ? "Injected-water heating"
                      : "Carrier water heating"}
                  </span>
                  <strong>−{format.format(sensibleHeatingKjL)} kJ/L</strong>
                  <i />
                </div>
                <ArrowRight className="energy-flow__arrow" aria-hidden="true" />
                <div className="energy-flow__stage energy-flow__stage--burden energy-flow__stage--large">
                  <span>
                    {waterInjectionScenario
                      ? "Water phase load"
                      : "Upstream vaporization"}
                  </span>
                  <strong>−{format.format(waterBurdenKjL)} kJ/L</strong>
                  <i />
                </div>
                <ArrowRight className="energy-flow__arrow" aria-hidden="true" />
                <div className="energy-flow__stage energy-flow__stage--loss">
                  <span>Wall / cycle loss</span>
                  <strong>
                    {simulation.gate.passed
                      ? `−${format.format(simulation.gate.energyTerms.wallLossJ)} J/cycle`
                      : "Not evaluated"}
                  </strong>
                  <i />
                </div>
                <ArrowRight className="energy-flow__arrow" aria-hidden="true" />
                <div
                  className={
                    simulation.gate.passed
                      ? "energy-flow__work is-reached"
                      : "energy-flow__work"
                  }
                >
                  <span>Indicated work</span>
                  <strong>
                    {simulation.proposedCycle
                      ? `${format.format(simulation.proposedCycle.indicatedWorkJ)} J`
                      : "Suppressed"}
                  </strong>
                </div>
              </div>

              {!simulation.gate.passed ? (
                <div className="energy-gap-callout" role="alert">
                  <ShieldAlert size={18} aria-hidden="true" />
                  <span>
                    <strong>
                      Energy and hydrogen gap prevents combustion evaluation.
                    </strong>
                    The motored baseline and sensitivities remain available; the
                    proposed reactive trace is null.
                  </span>
                </div>
              ) : null}

              <div
                className="energy-scale"
                aria-label="Logarithmic energy-density comparison"
              >
                <span className="energy-scale__axis" />
                <div
                  className="energy-scale__marker energy-scale__marker--reference"
                  style={{ left: "11%" }}
                >
                  <i />
                  <span>
                    Ambient dissolved H₂
                    <br />≈ 0.189 kJ/L
                  </span>
                </div>
                <div
                  className="energy-scale__marker energy-scale__marker--threshold"
                  style={{ left: "58%" }}
                >
                  <i />
                  <span>
                    Selected engine-cycle demand
                    <br />
                    model-dependent
                  </span>
                </div>
                <div
                  className="energy-scale__marker energy-scale__marker--fuel"
                  style={{ left: "90%" }}
                >
                  <i />
                  <span>
                    Conventional fuel scale
                    <br />
                    orders of magnitude higher
                  </span>
                </div>
              </div>

              <aside
                className="summary-cycle-schematic"
                aria-label="Homogeneous cycle scope"
              >
                <CylinderSchematic
                  angleDeg={summaryCycle.crankAngle[summaryCycleIndex] ?? -10}
                  temperatureK={
                    summaryCycle.temperatureK[summaryCycleIndex] ?? 298
                  }
                  hydrogenMg={
                    summaryCycle.h2Mg[summaryCycleIndex] ??
                    simulation.gate.hydrogenAvailableMg
                  }
                  liquidWaterMg={
                    summaryCycle.waterLiquidMg[summaryCycleIndex] ?? 0
                  }
                  vaporWaterMg={
                    summaryCycle.waterVaporMg[summaryCycleIndex] ?? 0
                  }
                  reducedMotion
                  passed={simulation.gate.passed}
                />
                <p>
                  Homogeneous pressure, temperature, and composition only. No
                  spatial field is generated.
                </p>
              </aside>
            </section>
          </div>

          <aside className="decision-rail" aria-labelledby="decision-title">
            <h2 id="decision-title">Decision</h2>
            <div className="decision-item">
              <Beaker aria-hidden="true" />
              <span>
                <strong>Proceed with bench measurement</strong>
                <p>
                  Measure total hydrogen by headspace GC or another mass method,
                  then resolve retention under intake-relevant handling.
                </p>
              </span>
            </div>
            <div className="decision-item">
              <Flame aria-hidden="true" />
              <span>
                <strong>Do not treat water as fuel</strong>
                <p>
                  Water contributes no chemical energy in this model. It creates
                  heating and phase-change demands.
                </p>
              </span>
            </div>
            <div className="decision-item">
              <Snowflake aria-hidden="true" />
              <span>
                <strong>Preserve water injection as a separate scenario</strong>
                <p>
                  Evaluate charge cooling and relative thermal-NOₓ risk while
                  hydrogen remains separately supplied fuel.
                </p>
              </span>
            </div>

            <section className="evidence-quality">
              <h3>
                Evidence quality <CircleHelp size={14} aria-hidden="true" />
              </h3>
              <details>
                <summary>
                  <span className="evidence-dot evidence-dot--measured" />
                  Selected Test Run measurements
                  <em>
                    {selectedMeasurementCount} dataset
                    {selectedMeasurementCount === 1 ? "" : "s"}
                  </em>
                </summary>
                <p>
                  {selectedRunEligible
                    ? `${selectedRun.name} contributes ${selectedMeasurementCount} canonical measurement dataset${selectedMeasurementCount === 1 ? "" : "s"} in its ${selectedRun.status.replace("_", " ")} persisted record.`
                    : selectedRun?.synthetic
                      ? "The selected synthetic demo is not counted as operator measurement evidence."
                      : "No eligible reviewed persisted Test Run is selected; draft, invalid, and volatile runs count as zero datasets."}
                </p>
              </details>
              <details>
                <summary>
                  <span className="evidence-dot evidence-dot--literature" />
                  Global literature ledger
                  <em>
                    {literatureEvidence.length} record
                    {literatureEvidence.length === 1 ? "" : "s"}
                  </em>
                </summary>
                <p>
                  {literatureEvidence.length === 0
                    ? "No literature record is attached to the current simulation."
                    : literatureEvidence.map((item) => item.title).join(" · ")}
                </p>
              </details>
              <details>
                <summary>
                  <span className="evidence-dot evidence-dot--user_assumption" />
                  Current model assumptions
                  <em>
                    {assumptionEvidence.length} record
                    {assumptionEvidence.length === 1 ? "" : "s"}
                  </em>
                </summary>
                <p>
                  {assumptionEvidence.length === 0
                    ? "No user-assumption record is attached to the current simulation."
                    : assumptionEvidence.map((item) => item.title).join(" · ")}
                </p>
              </details>
              <a
                href="https://webbook.nist.gov/cgi/cbook.cgi?Mask=877&Source=1970TAK5793&Units=SI"
                target="_blank"
                rel="noreferrer"
              >
                Review NIST source <ExternalLink size={12} aria-hidden="true" />
              </a>
            </section>
          </aside>
        </div>
      </section>

      <section className="model-answers" aria-labelledby="answers-title">
        <h2 id="answers-title">What the model can answer</h2>
        <div>
          <article>
            <Beaker aria-hidden="true" />
            <span>
              <h3>Loading — how much H₂ is actually carried?</h3>
              <p>
                Separates dissolved, bubble-contained, released, retained, and
                unaccounted hydrogen without double counting.
              </p>
              <button type="button" onClick={onOpenWorkbench}>
                Open in Workbench <ArrowRight size={14} />
              </button>
            </span>
          </article>
          <article>
            <Waves aria-hidden="true" />
            <span>
              <h3>Retention — how much reaches the intake?</h3>
              <p>
                Uses a measured series when available; otherwise exposes the
                first-order decay assumption and uncertainty.
              </p>
              <button type="button" onClick={onOpenWorkbench}>
                Open in Workbench <ArrowRight size={14} />
              </button>
            </span>
          </article>
          <article>
            <Gauge aria-hidden="true" />
            <span>
              <h3>Cycle — what pressure and work follow if the gate passes?</h3>
              <p>
                Returns a bounded homogeneous 0D cycle only after the
                mass-and-energy feasibility gate succeeds.
              </p>
              <button type="button" onClick={onOpenWorkbench}>
                Open in Workbench <ArrowRight size={14} />
              </button>
            </span>
          </article>
        </div>
      </section>

      <section
        className="summary-sensitivity"
        aria-labelledby="summary-sensitivity-title"
      >
        <h2 id="summary-sensitivity-title">What changes the conclusion?</h2>
        <SensitivityBars
          data={simulation.sensitivities.map((item) => ({
            label: item.label,
            value: item.normalized,
            tone: item.direction,
          }))}
        />
      </section>
    </div>
  );
}
