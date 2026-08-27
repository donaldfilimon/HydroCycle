import {
  AlertTriangle,
  Atom,
  BookOpen,
  ChevronDown,
  CircleHelp,
  ExternalLink,
  Layers3,
  Pause,
  PanelRightOpen,
  Play,
  RotateCcw,
  ShieldCheck,
  StepBack,
  StepForward,
  Thermometer,
  X,
} from "lucide-react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { LineChart, type ChartSeries } from "../components/Charts";
import { CylinderSchematic } from "../components/CylinderSchematic";
import { NumberField } from "../components/FormField";
import type { SimulationView, TestRunView, WorkbenchInputs } from "../domain";

interface WorkbenchScreenProps {
  simulation: SimulationView;
  inputs: WorkbenchInputs;
  measurementRun: TestRunView | null;
  cursorDeg: number;
  reducedMotion: boolean;
  staticDemo: boolean;
  onCursorChange: (value: number) => void;
  onReducedMotionChange: (value: boolean) => void;
  onInputChange: (
    key: keyof WorkbenchInputs,
    value: WorkbenchInputs[keyof WorkbenchInputs],
  ) => void;
  onRun: () => void;
}

const evidenceTabs = ["measured", "literature", "user_assumption"] as const;
type EvidenceTab = (typeof evidenceTabs)[number];

function evidenceTabId(tab: EvidenceTab) {
  return `evidence-tab-${tab.replace("_", "-")}`;
}

function nearestIndex(values: number[], target: number) {
  let index = 0;
  let distance = Number.POSITIVE_INFINITY;
  values.forEach((value, candidate) => {
    const next = Math.abs(value - target);
    if (next < distance) {
      index = candidate;
      distance = next;
    }
  });
  return index;
}

function seriesFrom(
  x: number[],
  y: number[],
  label: string,
  color: string,
  dashed = false,
  lower?: number[] | null,
  upper?: number[] | null,
): ChartSeries {
  return {
    label,
    color,
    dashed,
    points: x.map((value, index) => ({
      x: value,
      value: y[index] ?? 0,
      ...(lower?.[index] !== undefined ? { low: lower[index] } : {}),
      ...(upper?.[index] !== undefined ? { high: upper[index] } : {}),
    })),
  };
}

function EvidenceCard({
  title,
  source,
  value,
  note,
  impact,
}: {
  title: string;
  source: string;
  value: string;
  note: string;
  impact: "High" | "Moderate";
}) {
  return (
    <article className="evidence-card">
      <div className="evidence-card__heading">
        <strong>{title}</strong>
        <em>Impact: {impact}</em>
      </div>
      <dl>
        <div>
          <dt>Source / basis</dt>
          <dd>{source}</dd>
        </div>
        <div>
          <dt>Value</dt>
          <dd>{value}</dd>
        </div>
      </dl>
      <p>{note}</p>
      <details>
        <summary>What would change the result?</summary>
        <p>
          Replace the current basis with a calibrated measurement and propagate
          its stated uncertainty.
        </p>
      </details>
    </article>
  );
}

export function WorkbenchScreen({
  simulation,
  inputs,
  measurementRun,
  cursorDeg,
  reducedMotion,
  staticDemo,
  onCursorChange,
  onReducedMotionChange,
  onInputChange,
  onRun,
}: WorkbenchScreenProps) {
  const [evidenceTab, setEvidenceTab] = useState<EvidenceTab>("literature");
  const [playing, setPlaying] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState(
    () => window.matchMedia("(max-width: 1180px)").matches,
  );
  const evidenceTriggerRef = useRef<HTMLButtonElement>(null);
  const evidenceCloseRef = useRef<HTMLButtonElement>(null);
  const evidenceRailRef = useRef<HTMLElement>(null);
  const cycle = simulation.proposedCycle ?? simulation.motoredBaseline;
  const index = nearestIndex(cycle.crankAngle, cursorDeg);
  const pressure = cycle.pressureBar[index] ?? 1;
  const temperature = cycle.temperatureK[index] ?? 298;
  const volume = cycle.volumeCm3[index] ?? 500;
  const availableH2 = cycle.h2Mg[index] ?? simulation.gate.hydrogenAvailableMg;
  const liquidWaterMg = cycle.waterLiquidMg[index] ?? 0;
  const vaporWaterMg = cycle.waterVaporMg[index] ?? 0;
  const productWaterVaporMg = cycle.h2oVaporMg[index] ?? 0;
  const oxygenMg = cycle.o2Mg[index] ?? 0;
  const nitrogenMg = cycle.n2Mg[index] ?? 0;

  useEffect(() => {
    if (!playing) return;
    const step = reducedMotion ? 15 : 3;
    const timer = window.setInterval(
      () => {
        if (document.hidden) return;
        if (cursorDeg >= 180) {
          setPlaying(false);
          return;
        }
        onCursorChange(Math.min(180, cursorDeg + step));
      },
      reducedMotion ? 220 : 80,
    );
    return () => window.clearInterval(timer);
  }, [cursorDeg, onCursorChange, playing, reducedMotion]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1180px)");
    const update = () => {
      setDrawerMode(media.matches);
      if (!media.matches) setEvidenceOpen(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!drawerMode || !evidenceOpen) return;
    const background = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".topbar, .safety-strip, .mobile-gate, .gate-ribbon, .synthetic-fixture-banner, .measurement-source-banner, .parameter-rail, .cycle-theater",
      ),
    );
    background.forEach((element) => {
      element.inert = true;
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setEvidenceOpen(false);
        window.requestAnimationFrame(() => evidenceTriggerRef.current?.focus());
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        evidenceRailRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    window.requestAnimationFrame(() => evidenceCloseRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      background.forEach((element) => {
        element.inert = false;
      });
    };
  }, [drawerMode, evidenceOpen]);

  const chartSeries = useMemo(() => {
    const baseline = simulation.motoredBaseline;
    const proposed = simulation.proposedCycle;
    return {
      pressure: [
        seriesFrom(
          baseline.crankAngle,
          baseline.pressureBar,
          "Motored baseline",
          "#a8bbc8",
          true,
          baseline.pressureLower95Bar,
          baseline.pressureUpper95Bar,
        ),
        ...(proposed
          ? [
              seriesFrom(
                proposed.crankAngle,
                proposed.pressureBar,
                "Proposed 0D cycle",
                "#25c9ed",
                false,
                proposed.pressureLower95Bar,
                proposed.pressureUpper95Bar,
              ),
            ]
          : []),
      ],
      temperature: [
        seriesFrom(
          baseline.crankAngle,
          baseline.temperatureK,
          "Motored baseline",
          "#a8bbc8",
          true,
          baseline.temperatureLower95K,
          baseline.temperatureUpper95K,
        ),
        ...(proposed
          ? [
              seriesFrom(
                proposed.crankAngle,
                proposed.temperatureK,
                "Proposed 0D cycle",
                "#f6b73c",
                false,
                proposed.temperatureLower95K,
                proposed.temperatureUpper95K,
              ),
            ]
          : []),
      ],
      heat: [
        seriesFrom(
          cycle.crankAngle,
          cycle.heatReleaseJDeg,
          "Combustion heat",
          "#ff4e62",
        ),
        seriesFrom(
          cycle.crankAngle,
          cycle.wallHeatJDeg,
          "Wall heat",
          "#ffad3c",
        ),
        seriesFrom(
          cycle.crankAngle,
          cycle.vaporizationJDeg,
          "Phase change",
          "#3acfee",
        ),
      ],
      pv: [
        {
          label: simulation.proposedCycle
            ? "Proposed 0D cycle"
            : "Motored baseline",
          color: simulation.proposedCycle ? "#25c9ed" : "#a8bbc8",
          dashed: !simulation.proposedCycle,
          points: cycle.volumeCm3.map((x, pointIndex) => ({
            x,
            value: cycle.pressureBar[pointIndex] ?? 0,
          })),
        },
      ],
    };
  }, [cycle, simulation.motoredBaseline, simulation.proposedCycle]);

  function updateNumber(key: keyof WorkbenchInputs, value: number | null) {
    onInputChange(key, value);
  }

  function openEvidenceDrawer() {
    setEvidenceOpen(true);
    window.requestAnimationFrame(() => evidenceCloseRef.current?.focus());
  }

  function closeEvidenceDrawer() {
    setEvidenceOpen(false);
    window.requestAnimationFrame(() => evidenceTriggerRef.current?.focus());
  }

  function moveEvidenceTab(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    current: EvidenceTab,
  ) {
    let nextIndex: number | null = null;
    const currentIndex = evidenceTabs.indexOf(current);
    if (event.key === "ArrowRight")
      nextIndex = (currentIndex + 1) % evidenceTabs.length;
    if (event.key === "ArrowLeft") {
      nextIndex =
        (currentIndex - 1 + evidenceTabs.length) % evidenceTabs.length;
    }
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = evidenceTabs.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = evidenceTabs[nextIndex];
    if (!next) return;
    setEvidenceTab(next);
    window.requestAnimationFrame(() =>
      document.getElementById(evidenceTabId(next))?.focus(),
    );
  }

  return (
    <div className="workbench-screen">
      <section
        className={
          simulation.gate.passed
            ? "gate-ribbon gate-ribbon--pass"
            : "gate-ribbon gate-ribbon--fail"
        }
        aria-label="Mass and energy gate"
      >
        <div className="gate-ribbon__title">
          <span>Mass &amp; energy</span>
          <strong>gate</strong>
        </div>
        <div className="gate-ribbon__metric">
          <span>Hydrogen available</span>
          <strong>{availableH2.toPrecision(4)} mg/cycle</strong>
          <small>
            Required: {simulation.gate.hydrogenRequiredMg.toFixed(2)} mg/cycle
          </small>
        </div>
        <div className="gate-ribbon__metric">
          <span>Chemical energy</span>
          <strong>
            {simulation.gate.energyTerms.hydrogenChemicalJ.toFixed(2)} J/cycle
          </strong>
          <small>H₂ LHV only</small>
        </div>
        <div className="gate-ribbon__metric">
          <span>Water phase burden</span>
          <strong>
            {simulation.gate.energyTerms.vaporizationJ.toFixed(1)} J/cycle
          </strong>
          <small>
            Recovered: {simulation.gate.energyTerms.recoveredHeatJ.toFixed(1)}{" "}
            J/cycle
          </small>
        </div>
        <div className="gate-ribbon__result">
          <span>Gate result</span>
          <strong>
            {simulation.gate.passed
              ? "passed within bounded model"
              : simulation.gate.failures.join(" + ")}
          </strong>
          <small>
            {simulation.gate.passed
              ? "Proposed 0D trace enabled."
              : "Reactive cylinder trace suppressed; motored baseline retained."}
          </small>
        </div>
      </section>

      {inputs.fixture === "artificial-pass" ? (
        <p className="synthetic-fixture-banner" role="note">
          Artificial pass fixture — synthetic only. Its deliberately high H₂
          loading and recovered-heat input prove the cycle path is reachable;
          they are not experimental claims.
        </p>
      ) : null}

      {measurementRun ? (
        <section
          className="measurement-source-banner"
          aria-label="Active measurement source"
        >
          <strong>Selected Test Run overlay active</strong>
          <span>
            {measurementRun.name} · {measurementRun.status.replace("_", " ")}
            {measurementRun.sampleId
              ? ` · sample ${measurementRun.sampleId}`
              : ""}
          </span>
          <small>
            Available total H₂, decay-series, sample-state, and bubble-bin data
            replace their corresponding literature inputs. Bubble bins remain a
            non-authoritative diagnostic with visibly assumed uncertainty;
            engine and carrier-delivery controls remain explicit assumptions.
          </small>
        </section>
      ) : null}

      <div className="workbench-grid">
        <aside className="parameter-rail" aria-label="Model parameters">
          <div className="parameter-rail__title">
            <strong>Hydrogen loading</strong>
            <span>and cycle model</span>
          </div>

          <label className="preset-select">
            <span>Fixture / preset</span>
            <select
              value={inputs.fixture}
              onChange={(event) =>
                onInputChange("fixture", event.currentTarget.value)
              }
            >
              <option value="literature">
                {measurementRun
                  ? "Selected Test Run + model assumptions"
                  : "Literature comparison"}
              </option>
              <option value="artificial-pass">
                Artificial pass (synthetic)
              </option>
              <option value="water-injection">H₂ + water injection</option>
            </select>
          </label>

          <details open>
            <summary>
              Fluid state <ChevronDown size={14} />
            </summary>
            <NumberField
              id="water-temperature"
              label="Water temperature"
              value={inputs.waterTemperatureC}
              unit="°C"
              min={0}
              max={100}
              onChange={(value) => updateNumber("waterTemperatureC", value)}
            />
            <NumberField
              id="system-pressure"
              label="Carrier system pressure"
              value={inputs.systemPressureBar}
              unit="bar"
              min={0.2}
              max={20}
              step={0.01}
              onChange={(value) => updateNumber("systemPressureBar", value)}
            />
            <NumberField
              id="hydrogen-headspace-fraction"
              label="Headspace H₂ mole fraction"
              value={inputs.hydrogenHeadspaceMoleFraction}
              unit="fraction"
              min={0}
              max={1}
              step={0.01}
              help={`Henry partial pressure = system pressure × mole fraction (${(inputs.systemPressureBar * inputs.hydrogenHeadspaceMoleFraction).toFixed(3)} bar). The exact default 1.0 is an explicit pure-H₂ headspace assumption.`}
              onChange={(value) => {
                if (value === null) return;
                updateNumber(
                  "hydrogenHeadspaceMoleFraction",
                  Math.min(Math.max(value, 0), 1),
                );
              }}
            />
            <NumberField
              id="henry-model-uncertainty"
              label="Henry/model uncertainty"
              value={inputs.henryModelRelativeUncertainty}
              unit="fraction (1σ)"
              min={0}
              max={2}
              step={0.01}
              help="Propagated loading-model uncertainty; 0.15 is the visible default assumption."
              onChange={(value) =>
                updateNumber("henryModelRelativeUncertainty", value)
              }
            />
            <p className="model-assumption-copy">
              Henry loading scale: 1.00 ±{" "}
              {inputs.henryModelRelativeUncertainty.toFixed(2)} (1σ), normal;
              basis: user assumption; source:
              henry-reference-and-temperature-model-uncertainty.
            </p>
            <NumberField
              id="measured-total-h2"
              label="Measured total H₂"
              value={inputs.measuredTotalMgL}
              unit="mg/L"
              min={0}
              nullable
              help="Blank uses derived loading. A measured total replaces the dissolved + bubble estimate."
              onChange={(value) => updateNumber("measuredTotalMgL", value)}
            />
            <NumberField
              id="measured-total-h2-uncertainty"
              label="H₂ standard uncertainty"
              value={inputs.measuredTotalUncertaintyMgL}
              unit="mg/L (1σ)"
              min={0}
              step={0.01}
              onChange={(value) =>
                updateNumber("measuredTotalUncertaintyMgL", value)
              }
            />
            <label className="source-field" htmlFor="measured-total-source">
              <span>H₂ measurement source ID</span>
              <input
                id="measured-total-source"
                value={inputs.measuredTotalSourceId}
                placeholder="Required for measured basis"
                onChange={(event) =>
                  onInputChange(
                    "measuredTotalSourceId",
                    event.currentTarget.value,
                  )
                }
              />
            </label>
            <NumberField
              id="carrier-volume"
              label="Carrier per cycle"
              value={inputs.carrierVolumeMlPerCycle}
              unit="mL"
              min={0}
              max={50}
              step={0.01}
              onChange={(value) =>
                updateNumber("carrierVolumeMlPerCycle", value)
              }
            />
          </details>

          <details open>
            <summary>
              Bubble population <ChevronDown size={14} />
            </summary>
            <NumberField
              id="bubble-diameter"
              label="Median diameter"
              value={inputs.bubbleDiameterNm}
              unit="nm"
              min={10}
              max={100_000}
              step={1}
              onChange={(value) => updateNumber("bubbleDiameterNm", value)}
            />
            <NumberField
              id="bubble-count"
              label="Number density"
              value={inputs.bubbleCountPerMl}
              unit="#/mL"
              min={0}
              step={1000}
              onChange={(value) => updateNumber("bubbleCountPerMl", value)}
            />
            <NumberField
              id="bubble-model-uncertainty"
              label="Bubble-gas model uncertainty"
              value={inputs.bubbleModelRelativeUncertainty}
              unit="fraction (1σ)"
              min={0}
              max={3}
              step={0.05}
              help="Wide propagated allowance for gas identity and content beyond size/count uncertainty."
              onChange={(value) =>
                updateNumber("bubbleModelRelativeUncertainty", value)
              }
            />
            <p className="model-assumption-copy">
              Bubble H₂ content scale: mean 1.00 ±{" "}
              {inputs.bubbleModelRelativeUncertainty.toFixed(2)} (1σ), positive
              lognormal; basis: user assumption; source:
              bubble-gas-identity-and-content-uncertainty.
            </p>
            <NumberField
              id="retention"
              label="Retention at intake"
              value={inputs.retentionFraction}
              unit="fraction"
              min={0}
              max={1}
              step={0.01}
              onChange={(value) => updateNumber("retentionFraction", value)}
            />
            <NumberField
              id="retention-uncertainty"
              label="Retention uncertainty"
              value={inputs.retentionStandardUncertainty}
              unit="fraction (1σ)"
              min={0}
              max={1}
              step={0.01}
              onChange={(value) =>
                updateNumber("retentionStandardUncertainty", value)
              }
            />
          </details>

          <details open>
            <summary>
              Engine geometry <ChevronDown size={14} />
            </summary>
            <NumberField
              id="displacement"
              label="Displacement"
              value={inputs.displacementL}
              unit="L"
              min={0.05}
              max={10}
              step={0.01}
              onChange={(value) => updateNumber("displacementL", value)}
            />
            <NumberField
              id="compression-ratio"
              label="Compression ratio"
              value={inputs.compressionRatio}
              unit=":1"
              min={4}
              max={30}
              step={0.1}
              onChange={(value) => updateNumber("compressionRatio", value)}
            />
            <NumberField
              id="speed"
              label="Engine speed"
              value={inputs.speedRpm}
              unit="rpm"
              min={100}
              max={10_000}
              step={50}
              onChange={(value) => updateNumber("speedRpm", value)}
            />
          </details>

          <details open>
            <summary>
              Combustion <ChevronDown size={14} />
            </summary>
            <NumberField
              id="equivalence-ratio"
              label="Target equivalence ratio"
              value={inputs.equivalenceRatio}
              unit="φ"
              min={0.1}
              max={2}
              step={0.01}
              onChange={(value) => updateNumber("equivalenceRatio", value)}
            />
            <NumberField
              id="spark-timing"
              label="Ignition timing"
              value={inputs.sparkTimingDeg}
              unit="°CA"
              min={-60}
              max={20}
              step={1}
              onChange={(value) => updateNumber("sparkTimingDeg", value)}
            />
            <NumberField
              id="heat-recovery"
              label="Measured recovered heat"
              value={inputs.recoveredHeatJ}
              unit="J/cycle"
              min={0}
              step={10}
              onChange={(value) => updateNumber("recoveredHeatJ", value)}
            />
            <NumberField
              id="heat-recovery-uncertainty"
              label="Recovery uncertainty"
              value={inputs.recoveredHeatUncertaintyJ}
              unit="J/cycle (1σ)"
              min={0}
              step={1}
              onChange={(value) =>
                updateNumber("recoveredHeatUncertaintyJ", value)
              }
            />
            <label className="source-field" htmlFor="heat-recovery-source">
              <span>Recovery source ID</span>
              <input
                id="heat-recovery-source"
                value={inputs.recoveredHeatSourceId}
                placeholder="Required for measured basis"
                onChange={(event) =>
                  onInputChange(
                    "recoveredHeatSourceId",
                    event.currentTarget.value,
                  )
                }
              />
            </label>
          </details>

          <details>
            <summary>
              Quantity contract <ChevronDown size={14} />
            </summary>
            <div className="quantity-contract">
              <p>
                Every submitted quantity carries value, canonical unit, 1σ
                uncertainty, distribution, source ID, and evidence basis.
              </p>
              <dl>
                <div>
                  <dt>Temperature</dt>
                  <dd>±0.25 K · assumption</dd>
                </div>
                <div>
                  <dt>Pressure</dt>
                  <dd>±0.01 bar · assumption</dd>
                </div>
                <div>
                  <dt>Bubble size/count</dt>
                  <dd>±20% / ±50% · diagnostic only</dd>
                </div>
                <div>
                  <dt>Geometry / speed</dt>
                  <dd>declared 1σ · synthetic</dd>
                </div>
              </dl>
            </div>
          </details>

          <div className="parameter-note">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>
              CFD export contains homogeneous boundary states only. No spatial
              field is generated.
            </span>
          </div>
          <label className="compact-select">
            <span>Cycle uncertainty samples</span>
            <select
              value={inputs.cycleSamples}
              onChange={(event) =>
                onInputChange("cycleSamples", Number(event.currentTarget.value))
              }
            >
              <option value="32">32</option>
              <option value="64">64</option>
              <option value="128">128</option>
              <option value="256">256</option>
            </select>
          </label>
          <label className="toggle-row">
            <span>Reduced-motion mode</span>
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(event) =>
                onReducedMotionChange(event.currentTarget.checked)
              }
            />
          </label>
          <button
            className="button button--primary parameter-run"
            type="button"
            onClick={onRun}
          >
            <Play size={15} fill="currentColor" />
            {staticDemo ? "Load demo fixture" : "Re-run gate"}
          </button>
        </aside>

        <section
          className="cycle-theater"
          aria-label="Bounded zero-dimensional engine-cycle workbench"
        >
          <div className="cycle-theater__meta">
            <span>
              0D single-zone model <i /> Cantera thermochemistry <i /> No
              hardware control
            </span>
            <span>
              Seed {simulation.seed} ·{" "}
              {cycle.acceptedUncertaintySamples ?? inputs.cycleSamples} accepted
              trace samples
            </span>
            <button
              ref={evidenceTriggerRef}
              className="evidence-drawer-trigger"
              type="button"
              aria-controls="evidence-rail"
              aria-expanded={evidenceOpen}
              onClick={openEvidenceDrawer}
            >
              <PanelRightOpen size={14} /> Assumptions &amp; evidence
            </button>
          </div>

          <div className="cycle-stage">
            <section
              className="state-ledger"
              aria-labelledby="state-ledger-title"
            >
              <span>Crank angle</span>
              <strong>{cursorDeg.toFixed(1)}°CA</strong>
              <small>
                {cursorDeg < 0
                  ? "before TDC"
                  : cursorDeg > 0
                    ? "after TDC"
                    : "at TDC"}
              </small>
              <h2 id="state-ledger-title">In-cylinder state</h2>
              <dl>
                <div>
                  <dt>Pressure</dt>
                  <dd>{pressure.toFixed(2)} bar</dd>
                </div>
                <div>
                  <dt>Temperature</dt>
                  <dd>{temperature.toFixed(0)} K</dd>
                </div>
                <div>
                  <dt>Volume</dt>
                  <dd>{volume.toFixed(2)} cm³</dd>
                </div>
                <div>
                  <dt>H₂ available</dt>
                  <dd>{availableH2.toPrecision(4)} mg</dd>
                </div>
                <div>
                  <dt>H₂O product vapor</dt>
                  <dd>{productWaterVaporMg.toFixed(3)} mg</dd>
                </div>
                <div>
                  <dt>Carrier vapor</dt>
                  <dd>{vaporWaterMg.toFixed(3)} mg</dd>
                </div>
                <div>
                  <dt>Carrier liquid</dt>
                  <dd>{liquidWaterMg.toFixed(3)} mg</dd>
                </div>
              </dl>
              <p>
                Uniform state; finite-rate spatial behavior is outside this
                model.
              </p>
            </section>

            <CylinderSchematic
              angleDeg={cursorDeg}
              temperatureK={temperature}
              hydrogenMg={availableH2}
              liquidWaterMg={liquidWaterMg}
              vaporWaterMg={vaporWaterMg}
              reducedMotion={reducedMotion}
              passed={simulation.gate.passed}
            />

            <aside className="species-rail">
              <section>
                <h2>Species / phase ledger</h2>
                <span className="ledger-subtitle">homogeneous inventory</span>
                <table>
                  <thead>
                    <tr>
                      <th>Species</th>
                      <th>State / fraction</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>H₂</td>
                      <td>{availableH2.toExponential(3)} mg</td>
                    </tr>
                    <tr>
                      <td>O₂</td>
                      <td>{oxygenMg.toFixed(3)} mg</td>
                    </tr>
                    <tr>
                      <td>N₂</td>
                      <td>{nitrogenMg.toFixed(3)} mg</td>
                    </tr>
                    <tr>
                      <td>H₂O product(g)</td>
                      <td>{productWaterVaporMg.toFixed(3)} mg</td>
                    </tr>
                    <tr>
                      <td>carrier H₂O(g)</td>
                      <td>{vaporWaterMg.toFixed(3)} mg</td>
                    </tr>
                    <tr>
                      <td>carrier H₂O(l)</td>
                      <td>{liquidWaterMg.toFixed(3)} mg</td>
                    </tr>
                  </tbody>
                </table>
              </section>
              <section className="model-scope">
                <h2>Model scope</h2>
                <p>
                  Homogeneous single-zone thermodynamics with a bounded
                  heat-release closure.
                </p>
                <ul>
                  <li>No spatial resolution</li>
                  <li>No flow field</li>
                  <li>No flame structure</li>
                  <li>No particle trajectories</li>
                  <li>No numeric emissions claim</li>
                </ul>
                {staticDemo ? (
                  <span className="static-demo-unavailable">
                    Equations are available in the local application.
                  </span>
                ) : (
                  <a href="/api/v1/model-metadata" target="_blank">
                    View equations &amp; uncertainty <ExternalLink size={12} />
                  </a>
                )}
              </section>
            </aside>
          </div>

          <section
            className="energy-equation"
            aria-labelledby="energy-equation-title"
          >
            <div>
              <h2 id="energy-equation-title">Energy balance</h2>
              <small>single-zone first law</small>
            </div>
            <div
              className="equation"
              aria-label="d U by d theta equals combustion heat minus pressure d V by d theta minus wall heat minus vaporization heat"
            >
              <span>dU/dθ</span>
              <b>=</b>
              <span className="equation--comb">
                Q̇<sub>comb</sub>
              </span>
              <b>−</b>
              <span className="equation--work">P dV/dθ</span>
              <b>−</b>
              <span className="equation--wall">
                Q̇<sub>wall</sub>
              </span>
              <b>−</b>
              <span className="equation--vap">
                Q̇<sub>vap</sub>
              </span>
            </div>
            <div className="instant-terms">
              <span>
                <i className="term-comb" />
                Combustion {(cycle.heatReleaseJDeg[index] ?? 0).toFixed(2)}{" "}
                J/deg
              </span>
              <span>
                <i className="term-work" />
                Boundary work model
              </span>
              <span>
                <i className="term-wall" />
                Wall {(cycle.wallHeatJDeg[index] ?? 0).toFixed(2)} J/deg
              </span>
              <span>
                <i className="term-vap" />
                Phase {(cycle.vaporizationJDeg[index] ?? 0).toFixed(2)} J/deg
              </span>
              <strong>
                {simulation.proposedCycle
                  ? `Work ${simulation.proposedCycle.indicatedWorkJ.toFixed(1)} J`
                  : "Reactive work N/A"}
              </strong>
            </div>
            <p
              className={
                cycle.energyConservationResidualFraction > 0.005
                  ? "conservation-residual is-warning"
                  : "conservation-residual"
              }
            >
              First-law residual{" "}
              {(cycle.energyConservationResidualFraction * 100).toFixed(3)}%{" "}
              {cycle.energyConservationResidualFraction <= 0.005
                ? "≤ 0.5% acceptance bound"
                : "> 0.5% — result requires review"}
            </p>
          </section>

          {!simulation.gate.passed ? (
            <div className="trace-suppressed" role="alert">
              <AlertTriangle size={17} />
              Proposed reactive trace is null because the feasibility gate
              failed. Dashed traces below are motored only.
            </div>
          ) : null}

          <div className="cycle-charts">
            <LineChart
              compact
              title="Pressure vs. crank angle"
              description="Motored pressure and, when enabled, proposed homogeneous-cycle pressure versus crank angle."
              xLabel="Crank angle (°CA)"
              yLabel="Pressure (bar)"
              series={chartSeries.pressure}
              cursorX={cursorDeg}
              onCursorChange={onCursorChange}
            />
            <LineChart
              compact
              title="Temperature vs. crank angle"
              description="Motored temperature and, when enabled, proposed homogeneous-cycle temperature versus crank angle."
              xLabel="Crank angle (°CA)"
              yLabel="Temperature (K)"
              series={chartSeries.temperature}
              cursorX={cursorDeg}
              onCursorChange={onCursorChange}
            />
            <LineChart
              compact
              title="Heat-release terms"
              description="Single-zone combustion, wall, and phase-change heat terms versus crank angle."
              xLabel="Crank angle (°CA)"
              yLabel="Heat (J/deg)"
              series={chartSeries.heat}
              cursorX={cursorDeg}
              onCursorChange={onCursorChange}
            />
            <LineChart
              compact
              title="P–V loop"
              description="Pressure-volume loop for the motored or gate-enabled homogeneous cycle."
              xLabel="Volume (cm³)"
              yLabel="Pressure (bar)"
              series={chartSeries.pv}
              cursorPointIndex={index}
            />
          </div>

          <section className="cycle-timeline" aria-label="Crank-angle timeline">
            <div className="phase-band" aria-hidden="true">
              <span>Intake</span>
              <span>Compression</span>
              <span>Ignition window</span>
              <span>Expansion</span>
              <span>Exhaust</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={cursorDeg}
              aria-label="Crank angle cursor"
              onChange={(event) =>
                onCursorChange(Number(event.currentTarget.value))
              }
            />
            <div className="timeline-controls">
              <button
                type="button"
                aria-label="Reset to bottom dead center"
                onClick={() => onCursorChange(-180)}
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                aria-label="Step backward"
                onClick={() => onCursorChange(cursorDeg - 1)}
              >
                <StepBack size={16} />
              </button>
              <button
                type="button"
                aria-label={playing ? "Pause timeline" : "Play timeline"}
                onClick={() => setPlaying((value) => !value)}
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button
                type="button"
                aria-label="Step forward"
                onClick={() => onCursorChange(cursorDeg + 1)}
              >
                <StepForward size={16} />
              </button>
              <strong>{cursorDeg.toFixed(1)}°CA</strong>
            </div>
          </section>
        </section>

        {drawerMode && evidenceOpen ? (
          <button
            className="drawer-backdrop"
            type="button"
            tabIndex={-1}
            aria-label="Close assumptions and evidence drawer"
            onClick={closeEvidenceDrawer}
          />
        ) : null}
        {!drawerMode || evidenceOpen ? (
          <aside
            ref={evidenceRailRef}
            id="evidence-rail"
            className={evidenceOpen ? "evidence-rail is-open" : "evidence-rail"}
            aria-label="Assumptions and evidence"
            role={drawerMode ? "dialog" : undefined}
            aria-modal={drawerMode ? true : undefined}
            aria-labelledby="evidence-rail-title"
          >
            <button
              ref={evidenceCloseRef}
              className="drawer-close"
              type="button"
              aria-label="Close evidence drawer"
              onClick={closeEvidenceDrawer}
            >
              <X size={16} />
            </button>
            <h2 id="evidence-rail-title">Assumptions &amp; evidence</h2>
            <div
              className="evidence-tabs"
              role="tablist"
              aria-label="Evidence basis"
            >
              {evidenceTabs.map((tab) => (
                <button
                  id={evidenceTabId(tab)}
                  type="button"
                  role="tab"
                  aria-selected={evidenceTab === tab}
                  aria-controls="evidence-tabpanel"
                  tabIndex={evidenceTab === tab ? 0 : -1}
                  className={evidenceTab === tab ? "is-active" : ""}
                  key={tab}
                  onClick={() => setEvidenceTab(tab)}
                  onKeyDown={(event) => moveEvidenceTab(event, tab)}
                >
                  {tab === "user_assumption"
                    ? "Assumption"
                    : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div
              id="evidence-tabpanel"
              role="tabpanel"
              aria-labelledby={evidenceTabId(evidenceTab)}
            >
              {evidenceTab === "measured" ? (
                <>
                  <EvidenceCard
                    title="Total H₂ measurement"
                    source={
                      simulation.measuredTotalMgL === null
                        ? "Not measured"
                        : "Authoritative total-H₂ input"
                    }
                    value={
                      simulation.measuredTotalMgL === null
                        ? "null"
                        : `${simulation.measuredTotalMgL} mg/L`
                    }
                    note={
                      simulation.measuredTotalMgL === null
                        ? "The default is a derived literature comparison, not a sample measurement."
                        : "Measured total H₂ replaces the derived dissolved-plus-bubble estimate."
                    }
                    impact="High"
                  />
                  <EvidenceCard
                    title="Retention time series"
                    source="Not attached"
                    value="null"
                    note="The current first-order retention assumption is visible in the Assumption tab."
                    impact="High"
                  />
                </>
              ) : null}

              {evidenceTab === "literature" ? (
                <>
                  <EvidenceCard
                    title="Dissolved H₂ reference"
                    source="NIST Henry-law data, 298.15 K"
                    value="0.00078 mol/(kg·bar)"
                    note="Derived reference: approximately 1.57 mg H₂/L at one bar."
                    impact="High"
                  />
                  <EvidenceCard
                    title="Hydrogen LHV basis"
                    source="NIST water-vapor formation enthalpy"
                    value="≈120 MJ/kg H₂"
                    note="Water contributes no chemical energy."
                    impact="High"
                  />
                  <EvidenceCard
                    title="Ambient H₂-rich water range"
                    source="Comparison literature"
                    value="1.6–2.2 mg/L"
                    note="A comparison range only; it is never promoted to a measurement."
                    impact="Moderate"
                  />
                </>
              ) : null}

              {evidenceTab === "user_assumption" ? (
                <>
                  <EvidenceCard
                    title="Retained H₂ at intake"
                    source="First-order user assumption"
                    value={`${(inputs.retentionFraction * 100).toFixed(1)}% ± ${(inputs.retentionStandardUncertainty * 100).toFixed(1)}% (1σ)`}
                    note="User-assumption basis; replace with a measured handling-and-decay series."
                    impact="High"
                  />
                  <EvidenceCard
                    title="Synthetic engine geometry"
                    source="Demonstration default"
                    value={`${inputs.displacementL.toFixed(2)} L, ${inputs.compressionRatio.toFixed(1)}:1`}
                    note="No physical engine or hardware predictive claim is attached."
                    impact="Moderate"
                  />
                </>
              ) : null}
            </div>

            <section className="rail-summary">
              <h3>
                <Atom size={15} /> Thermochemistry
              </h3>
              <p>
                Cantera + pinned gri30.yaml metadata are recorded by the model
                service.
              </p>
              <h3>
                <Thermometer size={15} /> Thermal-NOₓ indicator
              </h3>
              <p>
                {cycle.thermalNoxRisk} relative risk; no numeric g/kWh claim.
              </p>
              <h3>
                <ShieldCheck size={15} /> Safety reference
              </h3>
              <p>
                Ambient H₂ LFL: 4 vol%. Reference only; not an
                engine-performance criterion.
              </p>
              <h3>
                <Layers3 size={15} /> Model limitation
              </h3>
              <p>
                Pressure prediction requires calibration against a measured
                engine trace.
              </p>
            </section>
            {staticDemo ? (
              <p className="static-demo-unavailable">
                <BookOpen size={15} /> Source ledger available locally
              </p>
            ) : (
              <a
                className="button button--outline rail-button"
                href="/api/v1/model-metadata"
                target="_blank"
                rel="noreferrer"
              >
                <BookOpen size={15} /> View equations &amp; source ledger
              </a>
            )}
            <p className="rail-footnote">
              <CircleHelp size={13} /> All uncertainty bands are 95% intervals
              unless noted.
            </p>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
