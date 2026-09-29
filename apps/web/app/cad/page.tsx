import type { Metadata } from "next";

import { runtimeConfigFromEnvironment } from "../../src/lib/runtime";

export const metadata: Metadata = { title: "CAD Workspace" };

export default function Page() {
  const { basePath } = runtimeConfigFromEnvironment();
  const documentUrl = `${basePath}/hydrocycle-cad.html`;

  return (
    <section aria-label="HydroCycle conceptual CAD workspace">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: "0.5rem",
          padding: "0.75rem 1rem",
          fontSize: "0.8rem",
        }}
      >
        <span>Independent concept geometry · not a thermodynamic solver</span>
        <a href={documentUrl} target="_blank" rel="noreferrer">
          Open full CAD workspace
        </a>
      </div>
      <iframe
        src={documentUrl}
        title="HydroCycle interactive CAD model"
        sandbox="allow-scripts allow-downloads"
        style={{
          display: "block",
          width: "100%",
          height: "calc(100dvh - 132px)",
          minHeight: "720px",
          border: 0,
          background: "#091525",
        }}
      />
    </section>
  );
}
