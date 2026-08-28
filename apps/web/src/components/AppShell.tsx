import {
  AlertTriangle,
  Download,
  FlaskConical,
  Play,
  Upload,
} from "lucide-react";
import type { ReactNode } from "react";

import type { Screen } from "@hydrocycle/view-model";
import { Brand } from "./Brand";

const navItems: { screen: Screen; label: string }[] = [
  { screen: "summary", label: "Summary" },
  { screen: "workbench", label: "Workbench" },
  { screen: "test-runs", label: "Test Runs" },
];

interface AppShellProps {
  active: Screen;
  busy: boolean;
  gatePassed: boolean;
  staticDemo: boolean;
  onNavigate: (screen: Screen) => void;
  onRun: () => void;
  onImport: () => void;
  onExport: () => void;
  dialogOpen: boolean;
  children: ReactNode;
}

export function AppShell({
  active,
  busy,
  gatePassed,
  staticDemo,
  onNavigate,
  onRun,
  onImport,
  onExport,
  dialogOpen,
  children,
}: AppShellProps) {
  return (
    <div className={`app-shell app-shell--${active}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="topbar" inert={dialogOpen ? true : undefined}>
        <button
          className="brand-button"
          type="button"
          onClick={() => onNavigate("summary")}
        >
          <Brand />
        </button>
        <nav className="topnav" aria-label="Primary">
          {navItems.map((item) => (
            <button
              className={
                item.screen === active
                  ? "topnav__item is-active"
                  : "topnav__item"
              }
              type="button"
              aria-current={item.screen === active ? "page" : undefined}
              key={item.screen}
              onClick={() => onNavigate(item.screen)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="topbar__actions">
          <button
            className="button button--quiet"
            type="button"
            onClick={onImport}
            disabled={staticDemo}
            title={
              staticDemo ? "Import requires the local application" : undefined
            }
          >
            <Upload size={16} aria-hidden="true" />
            <span>Import run</span>
          </button>
          <button
            className="button button--quiet"
            type="button"
            onClick={onExport}
          >
            <Download size={16} aria-hidden="true" />
            <span>Export</span>
          </button>
          <button
            className="button button--primary"
            type="button"
            onClick={onRun}
            disabled={busy}
          >
            {busy ? (
              <FlaskConical
                className="spin-once"
                size={16}
                aria-hidden="true"
              />
            ) : (
              <Play size={16} fill="currentColor" aria-hidden="true" />
            )}
            <span>
              {busy
                ? "Evaluating…"
                : staticDemo
                  ? "Load demo fixture"
                  : "Run model"}
            </span>
          </button>
          {active === "workbench" ? (
            <span className="topbar-safety">
              <AlertTriangle size={16} aria-hidden="true" />
              Simulation only — not validated for engine control.
            </span>
          ) : null}
        </div>
      </header>

      {staticDemo ? (
        <div className="demo-strip" role="note">
          Static fixture preview. No model service, persistence, or measured
          data is available in this hosted preview. Run HydroCycle locally for
          computed results.
        </div>
      ) : null}

      <div
        className="safety-strip"
        role="note"
        inert={dialogOpen ? true : undefined}
      >
        <span className="safety-strip__lead">
          <AlertTriangle size={17} aria-hidden="true" />
          Simulation only — not validated for engine control.
        </span>
        <span className="safety-strip__scope">
          0D single-zone model <i /> Cantera thermochemistry <i /> No hardware
          control
        </span>
      </div>

      <div
        className={
          gatePassed
            ? "mobile-gate mobile-gate--pass"
            : "mobile-gate mobile-gate--fail"
        }
        role="status"
        inert={dialogOpen ? true : undefined}
      >
        {gatePassed
          ? "Gate passed — synthetic/model-domain result"
          : "Gate failed — reactive trace suppressed"}
      </div>

      <main
        id="main-content"
        tabIndex={-1}
        inert={dialogOpen ? true : undefined}
      >
        {children}
      </main>
    </div>
  );
}
