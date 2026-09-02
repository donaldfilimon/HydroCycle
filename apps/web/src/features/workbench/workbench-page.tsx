"use client";

import type { WorkbenchInputs } from "@hydrocycle/view-model";
import {
  AlertTriangle,
  RotateCcw,
  Save,
  Scale,
  Sparkles,
  Square,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AdvisorLens } from "../../components/advisor-lens";
import { PvChart, TraceChart } from "../shared/charts";
import { useHydroCycle } from "../../state/app-state";

const workbenchSchema = z.object({
  waterTemperatureC: z.number().min(-20).max(200),
  systemPressureBar: z.number().positive().max(100),
  hydrogenHeadspaceMoleFraction: z.number().min(0).max(1),
  measuredTotalMgL: z.number().min(0).nullable(),
  carrierVolumeMlPerCycle: z.number().positive().max(10_000),
  bubbleDiameterNm: z.number().positive(),
  bubbleCountPerMl: z.number().min(0),
  retentionFraction: z.number().min(0).max(1),
  displacementL: z.number().positive(),
  compressionRatio: z.number().min(1).max(40),
  speedRpm: z.number().positive().max(20_000),
  equivalenceRatio: z.number().positive().max(5),
  sparkTimingDeg: z.number().min(-90).max(90),
  recoveredHeatJ: z.number().min(0),
  seed: z.number().int(),
  cycleSamples: z.number().int().min(16).max(2_048),
});

const fields: Array<{
  name: keyof WorkbenchInputs;
  label: string;
  unit: string;
  nullable?: boolean;
  step?: string;
}> = [
  {
    name: "waterTemperatureC",
    label: "Water temperature",
    unit: "°C",
    step: "0.1",
  },
  {
    name: "systemPressureBar",
    label: "System pressure",
    unit: "bar",
    step: "0.001",
  },
  {
    name: "hydrogenHeadspaceMoleFraction",
    label: "H₂ headspace mole fraction",
    unit: "–",
    step: "0.001",
  },
  {
    name: "measuredTotalMgL",
    label: "Measured total H₂",
    unit: "mg/L",
    nullable: true,
    step: "0.001",
  },
  {
    name: "carrierVolumeMlPerCycle",
    label: "Carrier volume",
    unit: "mL/cycle",
    step: "0.1",
  },
  { name: "bubbleDiameterNm", label: "Bubble diameter", unit: "nm", step: "1" },
  { name: "bubbleCountPerMl", label: "Bubble count", unit: "/mL", step: "1" },
  {
    name: "retentionFraction",
    label: "Retention fraction",
    unit: "–",
    step: "0.001",
  },
  { name: "displacementL", label: "Displacement", unit: "L", step: "0.001" },
  {
    name: "compressionRatio",
    label: "Compression ratio",
    unit: ":1",
    step: "0.1",
  },
  { name: "speedRpm", label: "Speed", unit: "rpm", step: "1" },
  {
    name: "equivalenceRatio",
    label: "Equivalence ratio",
    unit: "–",
    step: "0.001",
  },
  { name: "sparkTimingDeg", label: "Spark timing", unit: "°CA", step: "0.1" },
  { name: "recoveredHeatJ", label: "Recovered heat", unit: "J", step: "0.1" },
  { name: "seed", label: "Random seed", unit: "–", step: "1" },
  { name: "cycleSamples", label: "Cycle samples", unit: "–", step: "1" },
];

function CylinderInstrument() {
  return (
    <svg
      className="cylinder-instrument"
      viewBox="0 0 420 520"
      role="img"
      aria-label="Homogeneous zero-dimensional single-zone cylinder schematic"
    >
      <defs>
        <linearGradient id="instrumentStroke" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#22d9ff" />
          <stop offset="1" stopColor="#9865ff" />
        </linearGradient>
      </defs>
      <path
        d="M92 120h236l-20 35v210H112V155z"
        fill="rgba(18,43,76,.22)"
        stroke="#e8f0ff"
        strokeWidth="2"
      />
      <path
        d="M126 196h168v116H126z"
        fill="rgba(31,101,255,.08)"
        stroke="url(#instrumentStroke)"
        strokeWidth="2"
      />
      <path
        d="M210 312v82M168 394h84M181 394a29 29 0 1 0 58 0 29 29 0 1 0-58 0"
        fill="none"
        stroke="#e8f0ff"
        strokeWidth="2"
      />
      <path
        d="M112 170h196M112 181h196M210 120V77M175 77v43M245 77v43M174 77h28M218 77h28"
        fill="none"
        stroke="#a8bde2"
        strokeWidth="2"
      />
      <circle
        cx="210"
        cy="254"
        r="12"
        fill="#061329"
        stroke="#2f7dff"
        strokeWidth="3"
      />
      <text x="210" y="232" textAnchor="middle" fill="#4aa3ff" fontSize="14">
        0D SINGLE-ZONE
      </text>
      <text x="210" y="285" textAnchor="middle" fill="#8aa4cd" fontSize="12">
        UNIFORM STATE · NOT CFD
      </text>
      <path
        d="M58 150a170 170 0 0 1 304 0"
        fill="none"
        stroke="#25518f"
        strokeDasharray="3 5"
      />
      <circle cx="75" cy="130" r="6" fill="#13ccff" />
      <circle cx="345" cy="130" r="6" fill="#a86cff" />
    </svg>
  );
}

function lifecycle(resultPassed: boolean, running: boolean, stale: boolean) {
  if (running) return "CALCULATING";
  if (stale) return "STALE";
  return resultPassed ? "COMPLETE" : "FAILED GATE";
}

export function WorkbenchPage() {
  const { state, dispatch, runSimulation, cancelSimulation, isDraftStale } =
    useHydroCycle();
  const [formError, setFormError] = useState<string | null>(null);
  const [advisorOpen, setAdvisorOpen] = useState(true);
  const form = useForm<WorkbenchInputs>({
    defaultValues: state.draft,
    mode: "onBlur",
  });
  const result = state.result;
  const cycle = result.proposedCycle ?? result.motoredBaseline;

  async function submit(values: WorkbenchInputs) {
    const checked = workbenchSchema.safeParse(values);
    if (!checked.success) {
      setFormError(
        checked.error.issues[0]?.message ?? "Review the operating point.",
      );
      return;
    }
    setFormError(null);
    dispatch({ type: "patch-draft", patch: checked.data });
    await runSimulation(undefined, values);
  }

  return (
    <div className="workbench-route">
      <header className="workbench-header">
        <div>
          <h1>WORKBENCH</h1>
          <p>0D SINGLE-ZONE HYDROGEN–WATER SIMULATION · LOCAL EVIDENCE-GATED</p>
        </div>
        <dl>
          <div>
            <dt>MODEL MODE</dt>
            <dd>
              0D SINGLE-ZONE
              <br />
              HOMOGENEOUS
            </dd>
          </div>
          <div>
            <dt>TRUTH</dt>
            <dd>
              HYDROGEN IS FUEL
              <br />
              WATER IS THERMAL/CARRIER ONLY
            </dd>
          </div>
        </dl>
        <div
          className={`gate-banner ${result.gate.passed ? "is-pass" : "is-fail"}`}
        >
          <span>GATE STATUS</span>
          <strong>
            {result.gate.passed ? "PASSED" : "FAILED / MOTORED-ONLY"}
          </strong>
        </div>
      </header>
      <div className={`workbench-grid ${advisorOpen ? "has-advisor" : ""}`}>
        <form className="experiment-rail" onSubmit={form.handleSubmit(submit)}>
          <header>
            <h2>EXPERIMENT</h2>
            <button
              type="button"
              onClick={() => {
                form.reset(state.draft);
                dispatch({ type: "reset-draft" });
              }}
            >
              <RotateCcw size={14} /> RESET
            </button>
          </header>
          <label>
            SCENARIO
            <select
              {...form.register("fixture")}
              onChange={(event) => {
                form.setValue(
                  "fixture",
                  event.target.value as WorkbenchInputs["fixture"],
                );
                dispatch({
                  type: "patch-draft",
                  patch: {
                    fixture: event.target.value as WorkbenchInputs["fixture"],
                  },
                });
              }}
            >
              <option value="literature">Baseline · literature evidence</option>
              <option value="artificial-pass">
                Artificial pass · synthetic
              </option>
              <option value="water-injection">
                Separate H₂ + water injection
              </option>
            </select>
          </label>
          <h3>
            CURRENT INPUTS <span>EDITABLE</span>
          </h3>
          <div className="experiment-fields">
            {fields.map((field) => (
              <label key={field.name}>
                <span>{field.label}</span>
                <input
                  type="number"
                  step={field.step}
                  {...form.register(field.name, {
                    setValueAs: (raw: string) =>
                      field.nullable && raw === "" ? null : Number(raw),
                    onChange: (event) =>
                      dispatch({
                        type: "patch-draft",
                        patch: {
                          [field.name]:
                            field.nullable && event.target.value === ""
                              ? null
                              : Number(event.target.value),
                        },
                      }),
                  })}
                />
                <small>{field.unit}</small>
              </label>
            ))}
          </div>
          {state.frozen ? (
            <section className="frozen-set">
              <h3>
                SUBMITTED INPUT SET <span>FROZEN</span>
              </h3>
              {fields.slice(0, 8).map((field) => (
                <div key={field.name}>
                  <span>{field.label}</span>
                  <code>
                    {String(state.frozen?.inputs[field.name] ?? "Missing")}
                  </code>
                </div>
              ))}
            </section>
          ) : null}
          {formError || state.error ? (
            <p className="form-error">
              <AlertTriangle size={14} />
              {formError ?? state.error}
            </p>
          ) : null}
          {state.running ? (
            <button
              className="run-button"
              type="button"
              onClick={cancelSimulation}
            >
              <Square size={16} /> CANCEL MODEL
            </button>
          ) : (
            <button className="run-button" type="submit">
              <Sparkles size={16} /> RUN MODEL
            </button>
          )}
        </form>
        <section className="cycle-theatre">
          <h2>
            OPERATING POINT{" "}
            <span>
              {isDraftStale
                ? "CURRENT INPUTS DIFFER FROM RESULT"
                : "CURRENT INPUTS"}
            </span>
          </h2>
          <div className="cycle-theatre__body">
            <CylinderInstrument />
            <div className="instrument-readouts">
              <div>
                <span>P</span>
                <strong>{state.draft.systemPressureBar.toFixed(3)}</strong>
                <small>bar</small>
              </div>
              <div>
                <span>T</span>
                <strong>
                  {(state.draft.waterTemperatureC + 273.15).toFixed(1)}
                </strong>
                <small>K</small>
              </div>
              <div>
                <span>V</span>
                <strong>{state.draft.displacementL.toFixed(4)}</strong>
                <small>L</small>
              </div>
              <div>
                <span>
                  m<sub>total</sub>
                </span>
                <strong>
                  {result.gate.hydrogenAvailableMg === null
                    ? "MISSING"
                    : result.gate.hydrogenAvailableMg.toFixed(5)}
                </strong>
                <small>mg H₂</small>
              </div>
            </div>
          </div>
          <div className="phase-strip">
            <span>PHASE</span>
            {[
              "UNTOUCHED",
              "EDITED",
              "CALCULATING",
              "COMPLETE",
              "FAILED GATE",
              "ABORTED",
              "STALE",
              "OFFLINE",
            ].map((item) => (
              <div
                key={item}
                className={
                  lifecycle(result.gate.passed, state.running, isDraftStale) ===
                  item
                    ? "is-active"
                    : ""
                }
              >
                <i />
                {item}
              </div>
            ))}
          </div>
        </section>
        <section className="trace-rail">
          <h2>THERMODYNAMIC TRACES</h2>
          <TraceChart
            cycle={cycle}
            field="pressure"
            color="#3f82ff"
            label="PRESSURE"
            unit="bar"
          />
          <TraceChart
            cycle={cycle}
            field="temperature"
            color="#13ccff"
            label="TEMPERATURE"
            unit="K"
          />
          <TraceChart
            cycle={cycle}
            field="heat"
            color="#ffb000"
            label="NET HEAT RATE"
            unit="J/deg"
          />
          <PvChart cycle={cycle} />
          <p className="trace-note">
            <span /> MOTORED BASELINE{" "}
            {result.proposedCycle ? "+ PROPOSED CYCLE" : "ONLY"}
          </p>
          {!result.gate.passed ? (
            <p className="trace-warning">
              Reactive trace withheld: feasibility gate failed.
            </p>
          ) : null}
        </section>
        {advisorOpen ? (
          <AdvisorLens
            route="workbench"
            onClose={() => setAdvisorOpen(false)}
          />
        ) : (
          <button className="advisor-open" onClick={() => setAdvisorOpen(true)}>
            <Sparkles size={16} /> OPEN ADVISOR
          </button>
        )}
      </div>
      <footer className="workbench-actions">
        <button>
          <Scale size={16} /> COMPARE CURRENT VS SUBMITTED
        </button>
        <button>
          <Save size={16} /> SAVE AS TEST RUN
        </button>
        <button onClick={() => setAdvisorOpen(true)}>
          <Sparkles size={16} /> ASK ADVISOR
        </button>
      </footer>
    </div>
  );
}
