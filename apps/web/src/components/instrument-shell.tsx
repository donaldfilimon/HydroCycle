"use client";

import {
  Activity,
  Beaker,
  BookOpen,
  Database,
  Gauge,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { WaveMark } from "./wave-mark";
import { useHydroCycle } from "../state/app-state";

const routes = [
  { href: "/summary", label: "Summary", icon: Gauge },
  { href: "/workbench", label: "Workbench", icon: Beaker },
  { href: "/test-runs", label: "Test Runs", icon: Activity },
] as const;

export function InstrumentShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { runtime } = useHydroCycle();
  const workbench = pathname.endsWith("/workbench");
  return (
    <div
      className={`instrument-shell ${workbench ? "instrument-shell--dark" : ""}`}
    >
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <aside className="instrument-nav" aria-label="Primary navigation">
        <Link
          className="instrument-brand"
          href="/summary"
          aria-label="HydroCycle Summary"
        >
          <WaveMark className="instrument-brand__mark" />
          <span>HYDROCYCLE</span>
        </Link>
        <nav>
          {routes.map(({ href, label, icon: Icon }) => {
            const active = pathname.endsWith(href);
            return (
              <Link
                key={href}
                className={active ? "is-active" : ""}
                href={href}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={20} strokeWidth={1.5} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="instrument-nav__meta">
          <div>
            <Database size={16} />
            <span>{runtime.mode === "local" ? "LOCAL" : "FIXTURE"}</span>
          </div>
          <div>
            <BookOpen size={16} />
            <span>0D / SINGLE-ZONE</span>
          </div>
          <Settings2 size={16} aria-hidden="true" />
        </div>
      </aside>
      <div className="instrument-content">
        {runtime.mode === "hosted" ? (
          <div className="fixture-disclosure" role="note">
            PUBLIC FIXTURE MODE · deterministic examples · session-only edits ·
            no local network probing
          </div>
        ) : null}
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {routes.map(({ href, label, icon: Icon }) => {
          const active = pathname.endsWith(href);
          return (
            <Link
              key={href}
              className={active ? "is-active" : ""}
              href={href}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={19} strokeWidth={1.6} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
