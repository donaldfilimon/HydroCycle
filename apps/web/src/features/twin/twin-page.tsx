"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Expand,
  Pause,
  Play,
  RotateCcw,
  Scan,
  Box,
} from "lucide-react";
import reference from "../../../../../packages/contracts/fixtures/twin-reference.json";
import { useHydroCycle } from "../../state/app-state";
import { GpuViewport } from "./gpu-viewport";
import type { TwinManifest, RenderOptions } from "./types";
import "./twin.css";

const manifest = reference as TwinManifest;
const camera = { yaw: 0.65, pitch: 0.42, distance: 24, pan_x: 0, pan_y: 0 };
const readable = (key: string) => key.replaceAll("_", " ");

export function TwinPage() {
  const { runtime } = useHydroCycle();
  const [variantId, setVariantId] = useState("aerosol-carrier");
  const variant =
    manifest.variants.find((item) => item.id === variantId) ??
    manifest.variants[0];
  const [selected, setSelected] = useState("ENG-601");
  const [hidden, setHidden] = useState<string[]>([]);
  const [isolated, setIsolated] = useState(false);
  const [section, setSection] = useState(true);
  const [explode, setExplode] = useState(0);
  const [frameIndex, setFrameIndex] = useState(350);
  const [playing, setPlaying] = useState(false);
  const [view, setView] = useState(camera);
  const [speed, setSpeed] = useState(30);
  const stage =
    manifest.stages.find((item) => item.id === selected) ?? manifest.stages[0];
  const frame = manifest.frames[frameIndex];
  const visible = useMemo(
    () =>
      variant.stage_ids.filter(
        (id) => !hidden.includes(id) && (!isolated || id === selected),
      ),
    [variant, hidden, isolated, selected],
  );
  const options = useMemo<RenderOptions>(
    () => ({
      ...view,
      focus_stage: isolated ? selected : undefined,
      distance: isolated ? view.distance * 0.25 : view.distance,
      frame_index: frameIndex,
      variant: variant.id,
      visible_stages: visible,
      section,
      explode,
    }),
    [view, frameIndex, variant, visible, section, explode, isolated, selected],
  );
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduce = () => {
      if (preference.matches) setPlaying(false);
    };
    preference.addEventListener("change", reduce);
    return () => {
      preference.removeEventListener("change", reduce);
    };
  }, []);
  useEffect(() => {
    if (!playing) return;
    let id = 0,
      last = 0,
      remainder = 0;
    function tick(time: number) {
      if (last && !document.hidden) {
        remainder += Math.min((time - last) / 1000, 0.1) * speed;
        const steps = Math.floor(remainder);
        if (steps > 0) {
          setFrameIndex((value) => (value + steps) % 360);
          remainder -= steps;
        }
      }
      last = time;
      id = requestAnimationFrame(tick);
    }
    id = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(id);
    };
  }, [playing, speed]);
  function chooseVariant(id: string) {
    const next = manifest.variants.find((item) => item.id === id);
    if (!next) return;
    setVariantId(id);
    setHidden([]);
    setIsolated(false);
    if (!next.stage_ids.includes(selected)) setSelected(next.stage_ids[0]);
  }
  function download() {
    const blob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hydrocycle-twin-reference.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }
  return (
    <div className="twin-page">
      <header className="twin-header">
        <div>
          <h1>Digital Twin</h1>
          <p>HydroCycle research assembly</p>
        </div>
        <button onClick={download}>
          <Download size={16} />
          Export model manifest
        </button>
      </header>
      <div className="twin-workspace">
        <aside className="twin-left" aria-label="Model configuration">
          <label className="twin-label" htmlFor="twin-variant">
            Research layout
          </label>
          <select
            id="twin-variant"
            value={variant.id}
            onChange={(event) => {
              chooseVariant(event.target.value);
            }}
          >
            {manifest.variants.map((item) => (
              <option value={item.id} key={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <p className="twin-description">{variant.description}</p>
          <div className="twin-list-title">
            <h2>Assembly</h2>
            <span>
              {visible.length} / {variant.stage_ids.length}
            </span>
          </div>
          <div className="twin-stages">
            {manifest.stages
              .filter((item) => variant.stage_ids.includes(item.id))
              .map((item) => (
                <div
                  key={item.id}
                  className={`twin-stage ${selected === item.id ? "selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    aria-label={`Show ${item.id}`}
                    checked={!hidden.includes(item.id)}
                    onChange={(event) => {
                      setHidden((previous) =>
                        event.target.checked
                          ? previous.filter((id) => id !== item.id)
                          : [...previous, item.id],
                      );
                    }}
                  />
                  <button
                    onClick={() => {
                      setSelected(item.id);
                    }}
                    aria-pressed={selected === item.id}
                  >
                    <span>{item.id}</span>
                    {item.label}
                  </button>
                </div>
              ))}
          </div>
          <button
            className="twin-isolate"
            aria-pressed={isolated}
            onClick={() => {
              setIsolated(!isolated);
            }}
          >
            <Scan size={15} />
            {isolated ? "Show assembly" : "Isolate selected"}
          </button>
          <p className="twin-disclosure">
            Five bounded layouts. Selection changes the conceptual assembly, not
            the solver or feasibility gate.
          </p>
        </aside>
        <section className="twin-center" aria-label="Interactive digital twin">
          <div className="twin-toolbar">
            <button
              aria-pressed={section}
              onClick={() => {
                setSection(!section);
              }}
            >
              <Box size={15} />
              Section
            </button>
            <button
              aria-pressed={explode > 0}
              onClick={() => {
                setExplode(explode ? 0 : 1);
              }}
            >
              <Expand size={15} />
              Exploded
            </button>
            <button
              onClick={() => {
                setView(camera);
              }}
            >
              <RotateCcw size={15} />
              Reset view
            </button>
            <span>Drag orbit · shift-drag pan · scroll zoom</span>
          </div>
          <GpuViewport
            manifest={manifest}
            options={options}
            onCamera={(patch) => {
              setView((previous) => ({ ...previous, ...patch }));
            }}
            basePath={runtime.basePath}
          />
          {visible.length === 0 && (
            <p className="twin-empty" role="status">
              All stages are hidden. Select a stage checkbox to restore the
              assembly.
            </p>
          )}
          <div className="twin-playback">
            <button
              className="twin-play"
              aria-label={playing ? "Pause animation" : "Play animation"}
              onClick={() => {
                setPlaying(!playing);
              }}
            >
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <div className="twin-timeline">
              <label htmlFor="crank-angle">
                Crank angle <strong>{frame.angle_deg}°</strong>
              </label>
              <input
                id="crank-angle"
                type="range"
                min="0"
                max="360"
                step="1"
                value={frameIndex}
                onChange={(event) => {
                  setPlaying(false);
                  setFrameIndex(Number(event.target.value));
                }}
              />
              <div>
                <span>TDC 0°</span>
                <span>BDC 180°</span>
                <span>TDC 360°</span>
              </div>
            </div>
            <label className="twin-speed">
              Playback
              <select
                aria-label="Playback speed"
                value={speed}
                onChange={(event) => {
                  setSpeed(Number(event.target.value));
                }}
              >
                <option value={15}>15° / s</option>
                <option value={30}>30° / s</option>
                <option value={60}>60° / s</option>
              </select>
            </label>
          </div>
          <div className="twin-readouts">
            <div>
              <span>Cylinder volume</span>
              <strong>
                {frame.volume_cc.toFixed(3)} <small>cc</small>
              </strong>
            </div>
            <div>
              <span>Piston travel from TDC</span>
              <strong>
                {frame.piston_travel_mm.toFixed(3)} <small>mm</small>
              </strong>
            </div>
            <div>
              <span>Geometric displacement</span>
              <strong>
                {(manifest.geometry.displacement_l * 1000).toFixed(3)}{" "}
                <small>cc</small>
              </strong>
            </div>
          </div>
          <p className="twin-motion-note">
            Python-derived rigid-body kinematics. Playback is illustrative, not
            an operating RPM or a reactive combustion simulation.
          </p>
        </section>
        <aside className="twin-inspector" aria-label="Stage inspector">
          <span className="twin-id">{stage.id}</span>
          <h2>{stage.label}</h2>
          <p>{stage.description}</p>
          <h3>Evidence</h3>
          <p>{stage.evidence}</p>
          <h3>Engineering unknowns</h3>
          <ul>
            {stage.unknowns.map((unknown) => (
              <li key={unknown}>{unknown}</li>
            ))}
          </ul>
          <h3>Reference engine geometry</h3>
          <dl>
            <dt>Bore</dt>
            <dd>{manifest.geometry.bore_mm.toFixed(3)} mm</dd>
            <dt>Stroke</dt>
            <dd>{manifest.geometry.stroke_mm.toFixed(4)} mm</dd>
            <dt>Rod centers</dt>
            <dd>{manifest.geometry.connecting_rod_mm.toFixed(4)} mm</dd>
            <dt>Compression</dt>
            <dd>{manifest.geometry.compression_ratio}:1 nominal</dd>
          </dl>
          <div className="twin-math">
            <strong>Why 60.431 cc?</strong>
            <p>
              At −10°, exact slider-crank:{" "}
              {manifest.reference_comparison.slider_crank_cc.toFixed(3)} cc.
              Legacy harmonic:{" "}
              {manifest.reference_comparison.legacy_harmonic_cc.toFixed(3)} cc.
              Difference: +
              {manifest.reference_comparison.difference_percent.toFixed(3)}%.
            </p>
            <p>{manifest.reference_comparison.explanation}</p>
          </div>
        </aside>
      </div>
      <section
        className="twin-evidence"
        aria-label="Shared mass and energy ledger"
      >
        <div>
          <h2>Mass & energy ledger</h2>
          <p>Measurements are missing. Conservation cannot yet be evaluated.</p>
        </div>
        <div>
          <h3>Hydrogen inventory · mg</h3>
          <dl>
            {Object.entries(manifest.ledger.hydrogen_mg).map(
              ([name, value]) => (
                <div key={name}>
                  <dt>{readable(name)}</dt>
                  <dd>{value === null ? "Unknown" : value}</dd>
                </div>
              ),
            )}
          </dl>
        </div>
        <div>
          <h3>Energy · J</h3>
          <dl>
            {Object.entries(manifest.ledger.energy_j).map(([name, value]) => (
              <div key={name}>
                <dt>{readable(name)}</dt>
                <dd>{value === null ? "Unknown" : value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <details className="twin-provenance">
        <summary>Model provenance, visual scope & assumptions</summary>
        <p>
          Hydrogen is the energy carrier; water is not fuel. Ultrasonic aerosol
          is liquid droplets, not molecular vapor. Phase-change energy remains
          in the ledger.
        </p>
        <ul>
          {[...manifest.assumptions, ...manifest.limitations].map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
