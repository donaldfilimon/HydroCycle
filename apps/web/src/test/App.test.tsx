import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../App";

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
    expect(operator).toHaveValue("Demo operator");
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

  it("guards dirty evaluation and export, discards visibly, and retains the unload warning", async () => {
    const user = userEvent.setup();
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Workbench" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Test Runs" }));
    const operator = screen.getByLabelText("Operator");
    await user.type(operator, " edited");
    await user.click(screen.getByRole("button", { name: /run model/i }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      /discard unsaved changes/i,
    );
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: /cancel/i,
      }),
    );
    expect(operator).toHaveValue("Demo operator edited");

    await user.click(screen.getByRole("button", { name: /^export$/i }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: /discard changes/i,
      }),
    );
    expect(operator).toHaveValue("Demo operator");
    expect(anchorClick).toHaveBeenCalledOnce();

    await user.type(operator, " changed again");
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
    await user.type(screen.getByLabelText("Operator"), " edited");
    await user.click(
      within(workspace as HTMLElement).getByRole("button", { name: /delete/i }),
    );
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      /discard unsaved changes/i,
    );
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: /discard changes/i,
      }),
    );
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent(/locally owned attachments/i);
    await user.click(within(dialog).getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
