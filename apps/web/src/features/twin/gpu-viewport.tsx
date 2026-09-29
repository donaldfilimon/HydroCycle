"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent, KeyboardEvent } from "react";
import type {
  RenderOptions,
  TwinManifest,
  TwinModule,
  TwinRenderer,
} from "./types";

// React Strict Mode may mount twice while WASM is still instantiating. Share
// initialization so callbacks never cross two wasm-bindgen module instances.
const modules = new Map<string, Promise<TwinModule>>();
function loadRenderer(moduleUrl: string): Promise<TwinModule> {
  const existing = modules.get(moduleUrl);
  if (existing) return existing;
  const pending = (async () => {
    const module = (await import(
      /* webpackIgnore: true */ /* turbopackIgnore: true */ moduleUrl
    )) as unknown as TwinModule;
    await module.default();
    return module;
  })();
  modules.set(moduleUrl, pending);
  void pending.catch(() => {
    modules.delete(moduleUrl);
  });
  return pending;
}

export function GpuViewport({
  manifest,
  options,
  onCamera,
  basePath,
}: {
  manifest: TwinManifest;
  options: RenderOptions;
  onCamera: (patch: Partial<RenderOptions>) => void;
  basePath: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<TwinRenderer | null>(null);
  const current = useRef(options);
  current.current = options;
  const [status, setStatus] = useState("Loading Rust renderer…");
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const drag = useRef<{ x: number; y: number; pan: boolean } | null>(null);
  useEffect(() => {
    const lifetime = { closed: false };
    let observer: ResizeObserver | undefined;
    let active: TwinRenderer | null = null;
    async function start() {
      if (!canvas.current) return;
      try {
        const moduleUrl = `${basePath}/twin-gpu/hydrocycle_twin.js`;
        const module = await loadRenderer(moduleUrl);
        if (lifetime.closed) return;
        active = await module.TwinRenderer.create(
          canvas.current,
          JSON.stringify(manifest),
        );
        // Cleanup can run while the asynchronous adapter request is pending.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (lifetime.closed) {
          active.free();
          return;
        }
        renderer.current = active;
        const draw = () => {
          if (!canvas.current || !active || lifetime.closed) return;
          const rect = canvas.current.getBoundingClientRect();
          const ratio = Math.min(window.devicePixelRatio, 2);
          active.resize(
            Math.max(1, Math.round(rect.width * ratio)),
            Math.max(1, Math.round(rect.height * ratio)),
          );
          active.configure(JSON.stringify(current.current));
          active.render();
        };
        draw();
        observer = new ResizeObserver(() => {
          try {
            draw();
          } catch (error) {
            setFailed(true);
            setStatus(String(error));
          }
        });
        observer.observe(canvas.current);
        setStatus("WebGPU · Rust / wgpu · rasterized");
      } catch (error) {
        if (!lifetime.closed) {
          setFailed(true);
          setStatus(error instanceof Error ? error.message : String(error));
        }
      }
    }
    void start();
    return () => {
      lifetime.closed = true;
      observer?.disconnect();
      renderer.current = null;
      active?.free();
      active = null;
    };
  }, [manifest, basePath, retry]);
  useEffect(() => {
    try {
      renderer.current?.configure(JSON.stringify(options));
      renderer.current?.render();
    } catch (error) {
      setFailed(true);
      setStatus(String(error));
    }
  }, [options]);
  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.x,
      dy = event.clientY - drag.current.y;
    if (drag.current.pan)
      onCamera({
        pan_x: options.pan_x - dx * 0.01,
        pan_y: options.pan_y + dy * 0.01,
      });
    else
      onCamera({
        yaw: options.yaw + dx * 0.008,
        pitch: Math.max(-1.25, Math.min(1.4, options.pitch + dy * 0.008)),
      });
    drag.current = { ...drag.current, x: event.clientX, y: event.clientY };
  }
  function key(event: KeyboardEvent<HTMLCanvasElement>) {
    const patches: Partial<Record<string, Partial<RenderOptions>>> = {
      ArrowLeft: { yaw: options.yaw - 0.1 },
      ArrowRight: { yaw: options.yaw + 0.1 },
      ArrowUp: { pitch: Math.min(1.4, options.pitch + 0.1) },
      ArrowDown: { pitch: Math.max(-1.25, options.pitch - 0.1) },
      "+": { distance: Math.max(2, options.distance - 1) },
      "-": { distance: Math.min(45, options.distance + 1) },
    };
    const patch = patches[event.key];
    if (patch) {
      event.preventDefault();
      onCamera(patch);
    }
  }
  return (
    <div className="twin-viewport">
      <canvas
        ref={canvas}
        aria-label="HydroCycle three-dimensional model. Drag to orbit, shift-drag to pan. Arrow keys orbit; plus and minus zoom."
        tabIndex={0}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            pan: event.shiftKey || event.button === 2,
          };
        }}
        onPointerMove={move}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onContextMenu={(event) => {
          event.preventDefault();
        }}
        onKeyDown={key}
        onWheel={(event) => {
          onCamera({
            distance: Math.max(
              2,
              Math.min(45, options.distance + event.deltaY * 0.015),
            ),
          });
        }}
      />
      <div className="twin-render-status" role="status">
        {failed ? "Renderer unavailable" : status}
      </div>
      {failed && (
        <div className="twin-fallback" role="alert">
          <h2>3D rendering is unavailable</h2>
          <p>{status}</p>
          <p>
            The stage inspector, exact kinematic samples and manifest export
            remain available. Use a browser with WebGPU enabled and GPU access.
          </p>
          <button
            onClick={() => {
              setFailed(false);
              setStatus("Retrying renderer…");
              setRetry((value) => value + 1);
            }}
          >
            Retry GPU
          </button>
        </div>
      )}
      <div className="twin-canvas-note">
        Conceptual apparatus · bubble and aerosol glyphs NOT TO SCALE
      </div>
    </div>
  );
}
