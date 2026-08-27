import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App, {
  mapApiTestRun,
  testRunPatchPayload,
  testRunPayload,
} from "../App";
import type { ApiTestRunDocument } from "../api";

describe("HydroCycle application flows", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("offline test API")),
    );
  });

  it("leads with the direct failure conclusion and keeps sensitivity available", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /concept feasibility at a glance/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /current loading does not carry enough retained hydrogen/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /what changes the conclusion/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/reactive trace suppressed/i)).toBeInTheDocument();
  });

  it("keeps the Pages build fixture-only without probing the local API", async () => {
    const user = userEvent.setup();
    render(<App staticDemo />);
    expect(
      screen.getByText(/static fixture preview.*no model service/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /import run/i })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /load demo fixture/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Test Runs" }));
    const operator = screen.getByLabelText("Operator");
    await user.clear(operator);
    await user.type(operator, "Static reviewer");
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    expect(
      screen.getByText(
        /persistence requires the local HydroCycle application/i,
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(fetch).not.toHaveBeenCalled());
  });

  it("shows and hides uncertainty without losing the evidence basis", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText(/1\.225 – 1\.915/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /hide uncertainty/i }));
    expect(screen.queryByText(/1\.225 – 1\.915/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/NIST Henry-law reference at 298\.15 K/i),
    ).toBeInTheDocument();
  });

  it("labels the workbench cylinder as a single-zone schematic and suppresses failed trace", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Workbench" }));
    expect(
      screen.getAllByText(/single-zone state.*schematic, not CFD/i).length,
    ).toBeGreaterThan(0);
    const cylinder = screen.getByRole("img", {
      name: /single-zone cylinder schematic/i,
    });
    expect(cylinder.querySelector("linearGradient")).not.toBeInTheDocument();
    expect(
      cylinder.querySelector(".zone-fill")?.getAttribute("fill"),
    ).not.toMatch(/^url\(/);
    expect(screen.getByRole("alert")).toHaveTextContent(
      /proposed reactive trace is null/i,
    );
    expect(
      screen.getByRole("link", { name: /view equations & uncertainty/i }),
    ).toHaveAttribute("href", "/api/v1/model-metadata");
    expect(
      screen.getByText(/ambient H₂ LFL: 4 vol%.*not an engine-performance/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /view equations & source ledger/i }),
    ).toHaveAttribute("href", "/api/v1/model-metadata");
  });

  it("loads the explicitly synthetic artificial pass and exposes a proposed P–V cycle", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Workbench" }));
    await user.selectOptions(
      screen.getByLabelText(/fixture \/ preset/i),
      "artificial-pass",
    );
    await user.click(screen.getByRole("button", { name: /re-run gate/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/passed within bounded model/i),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByText(/proposed reactive trace is null/i),
    ).not.toBeInTheDocument();
    expect(screen.getByText("P–V loop")).toBeInTheDocument();
    expect(
      screen.getByText(/its deliberately high H₂ loading/i),
    ).toHaveTextContent(/artificial pass fixture.*synthetic/i);
  });

  it("preserves missing measurements as null in the evidence rail", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Workbench" }));
    await user.click(screen.getByRole("tab", { name: "Measured" }));
    expect(screen.getByText("Not measured")).toBeInTheDocument();
    expect(screen.getAllByText("null").length).toBeGreaterThan(0);
  });

  it("keeps seeded test data visibly synthetic and retains unsaved state when persistence is offline", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Test Runs" }));
    expect(
      screen.getByText(/all seeded examples are demo \/ synthetic/i),
    ).toBeInTheDocument();
    const operator = screen.getByLabelText("Operator");
    await user.clear(operator);
    await user.type(operator, "Review operator");
    expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() =>
      expect(screen.getByText(/run was not persisted/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
  });

  it("round-trips test-run identity and provenance without PATCH erasure", () => {
    const document: ApiTestRunDocument = {
      id: "run-provenance-1",
      name: "Imported provenance run",
      status: "draft",
      operator: "Operator One",
      sample_id: "SAMPLE-42",
      notes: "Preserve this review note",
      is_demo_synthetic: false,
      provenance: {
        source: "canonical JSON import",
        method: "headspace GC method",
        ui_origin: "import endpoint",
        import_sha256: "a".repeat(64),
        source_test_run_id: "source-run-7",
        is_demo_synthetic: false,
      },
      measurements: {
        total_h2_mg_l: {
          value: 2.1,
          unit: "mg/L",
          standard_uncertainty: 0.08,
          distribution: "normal",
          source_id: "CAL-IDENTITY",
          basis: "measured",
        },
        "bubble_distribution.csv": [
          { diameter_nm: 120, number_per_mL: 3_000_000 },
          { diameter_nm: 220, number_per_mL: 800_000 },
        ],
      },
      calibration_references: [
        {
          id: "CAL-IDENTITY",
          instrument: "GC fixture",
          method: "method text distinct from identity",
          applies_to: [],
          notes: "Preserve calibration metadata",
        },
        {
          id: "CAL-SECONDARY",
          instrument: "temperature fixture",
          method: "secondary method",
          applies_to: [],
        },
      ],
      comparisons: {
        items: [
          {
            id: "comparison-1",
            kind: "retention",
            label: "Measured/model comparison",
            measured_value: 0.7,
            modeled_value: 0.68,
            unit: "fraction",
          },
        ],
      },
      attachments: [],
      simulation_ids: ["b".repeat(64)],
      evidence: [
        {
          id: "evidence-1",
          created_at: "2026-08-24T12:00:00Z",
          kind: "measured",
          title: "Local headspace result",
          author_or_publisher: "HydroCycle fixture",
          publication_date: "2026-08-24",
          url: "https://example.com/method",
          method: "headspace GC",
          value_or_range: "2.1",
          unit: "mg/L",
          uncertainty: "0.08 mg/L standard uncertainty",
          applicability_note: "Applies to sample SAMPLE-42 only.",
        },
      ],
      created_at: "2026-08-24T12:00:00Z",
      updated_at: "2026-08-24T12:30:00Z",
    };

    const view = mapApiTestRun(document);
    expect(view.sampleId).toBe("SAMPLE-42");
    expect(view.calibrationReference).toBe("CAL-IDENTITY");
    expect(view.provenance.import_sha256).toBe("a".repeat(64));
    expect(view.calibrationReferences).toHaveLength(2);
    expect(view.comparisons.items).toHaveLength(1);
    expect(view.testRunEvidence).toHaveLength(1);
    expect(view.bubbleDistribution).toEqual([
      { diameterNm: 120, numberPerMl: 3_000_000 },
      { diameterNm: 220, numberPerMl: 800_000 },
    ]);
    expect(view.measurementDatasetCount).toBe(2);

    const createPayload = testRunPayload(view);
    expect(createPayload.sample_id).toBe("SAMPLE-42");
    expect(createPayload.calibration_references?.[0]?.id).toBe("CAL-IDENTITY");
    expect(createPayload.calibration_references).toHaveLength(2);
    expect(createPayload.provenance?.import_sha256).toBe("a".repeat(64));
    expect(createPayload.provenance?.source_test_run_id).toBe("source-run-7");
    expect(createPayload.comparisons?.items).toHaveLength(1);
    expect(createPayload.evidence).toHaveLength(1);
    expect(
      createPayload.measurements?.["bubble_distribution.csv"],
    ).toHaveLength(2);

    const patchPayload = testRunPatchPayload(view);
    expect(patchPayload.sample_id).toBe("SAMPLE-42");
    expect(patchPayload.provenance?.source).toBe("canonical JSON import");
    expect(patchPayload).not.toHaveProperty("comparisons");
    expect(patchPayload).not.toHaveProperty("evidence");
  });

  it("exposes the read-only future DAQ boundary with no command control", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Test Runs" }));
    expect(
      screen.getByText(
        /read-only interface reserved for a later validated phase/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /not available/i }),
    ).toBeDisabled();
    expect(
      screen.getByText(/no actuator commands; no ControlSink exists/i),
    ).toBeInTheDocument();
  });

  it("provides distinct inspectable Test Runs tabs and expandable quality evidence", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Test Runs" }));

    await user.click(screen.getByRole("tab", { name: "Loading" }));
    expect(
      screen.getByText(/authoritative total-H₂ mass measurements replace/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Bubbles" }));
    expect(
      screen.getByText(/cannot establish gas identity or total H₂/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Retention" }));
    expect(
      screen.getByText(/retained fraction \(derived\)/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Engine trace" }));
    expect(
      screen.getByText(
        /modeled pressure cannot be treated as hardware-predictive/i,
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /expand all/i }));
    expect(document.querySelectorAll(".quality-row[open]")).toHaveLength(5);
    expect(screen.getByText(/^Units$/).closest("summary")).toHaveAccessibleName(
      /units.*status: passed/i,
    );
    expect(
      screen.getByText(/^Replicates$/).closest("summary"),
    ).toHaveAccessibleName(/replicates.*status: review required/i);
    await user.click(screen.getByRole("button", { name: /collapse all/i }));
    expect(document.querySelectorAll(".quality-row[open]")).toHaveLength(0);
  });

  it("uses one accessible confirmation path for dirty product and primary navigation", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Test Runs" }));
    const operator = screen.getByLabelText("Operator");
    await user.type(operator, " edited");

    await user.click(screen.getByRole("button", { name: /HydroCycle home/i }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent(/discard unsaved changes/i);
    expect(dialog).toHaveTextContent(/this Test Run has unsaved changes/i);
    expect(
      within(dialog).getByRole("button", { name: /cancel/i }),
    ).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(
      screen.getByRole("heading", { name: /Synthetic-003/i }),
    ).toBeInTheDocument();
    expect(operator).toHaveValue("Demo operator edited");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /HydroCycle home/i }),
      ).toHaveFocus(),
    );

    await user.click(screen.getByRole("button", { name: "Workbench" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: /discard changes/i,
      }),
    );
    expect(
      screen.getByRole("region", {
        name: /bounded zero-dimensional engine-cycle workbench/i,
      }),
    ).toBeInTheDocument();
  });

  it("guards dirty new and import actions while preserving the draft on cancellation", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Test Runs" }));
    const operator = screen.getByLabelText("Operator");
    await user.type(operator, " edited");

    await user.click(screen.getByRole("button", { name: "New run" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: /cancel/i,
      }),
    );
    expect(operator).toHaveValue("Demo operator edited");

    await user.click(screen.getByRole("button", { name: /import run/i }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: /discard changes/i,
      }),
    );
    expect(
      screen.getByRole("dialog", { name: /import measured data/i }),
    ).toBeInTheDocument();
  });

  it("requires confirmation before a dirty run selection discards edits", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Test Runs" }));
    const operator = screen.getByLabelText("Operator");
    await user.type(operator, " edited");

    await user.click(screen.getByRole("button", { name: /^Synthetic-002$/ }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: /cancel/i,
      }),
    );
    expect(
      screen.getByRole("heading", { name: /Synthetic-003/i }),
    ).toBeInTheDocument();
    expect(operator).toHaveValue("Demo operator edited");

    await user.click(screen.getByRole("button", { name: /^Synthetic-002$/ }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: /discard changes/i,
      }),
    );
    expect(
      screen.getByRole("heading", { name: /Synthetic-002/i }),
    ).toBeInTheDocument();
  });

  it("does not guard clean navigation, evaluation, or export, and retains the unload warning", async () => {
    const user = userEvent.setup();
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Workbench" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Test Runs" }));
    await user.type(screen.getByLabelText("Operator"), " edited");
    await user.click(screen.getByRole("button", { name: /run model/i }));
    await user.click(screen.getByRole("button", { name: /^export$/i }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(anchorClick).toHaveBeenCalledOnce();

    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
  });

  it("explains why neutral CFD export is unavailable without an owned pass result", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Test Runs" }));
    expect(
      screen.getByRole("button", {
        name: /export neutral 0D CFD boundary/i,
      }),
    ).toBeDisabled();
    expect(
      screen.getByText(/unavailable until this persisted run owns/i),
    ).toBeInTheDocument();
  });

  it("rejects malformed CSV with actionable canonical-header errors", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /import run/i }));
    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();
    const malformed = new File(["bad,value\n2,3\n1,4"], "hydrogen_decay.csv", {
      type: "text/csv",
    });
    fireEvent.change(input as HTMLInputElement, {
      target: { files: [malformed] },
    });
    const dialog = screen.getByRole("dialog");
    await waitFor(() =>
      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        /header must match one canonical series/i,
      ),
    );
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      /strictly increasing/i,
    );
  });

  it("requires explicit confirmation before deleting a run", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Test Runs" }));
    const workspace = screen
      .getByRole("heading", { name: /Synthetic-003/i })
      .closest(".run-workspace");
    expect(workspace).not.toBeNull();
    await user.click(
      within(workspace as HTMLElement).getByRole("button", { name: /delete/i }),
    );
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent(/locally owned attachments/i);
    await user.click(within(dialog).getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
