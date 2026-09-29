import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TwinPage } from "../features/twin/twin-page";
import type { RenderOptions } from "../features/twin/types";
import { runtimeConfigFromEnvironment } from "../lib/runtime";
import { HydroCycleProviders } from "../state/app-state";

vi.mock("../features/twin/gpu-viewport", () => ({
  GpuViewport: ({ options }: { options: RenderOptions }) => (
    <div data-testid="renderer-options">{JSON.stringify(options)}</div>
  ),
}));

function showTwin() {
  render(
    <HydroCycleProviders runtime={runtimeConfigFromEnvironment()}>
      <TwinPage />
    </HydroCycleProviders>,
  );
}

function rendererOptions(): RenderOptions {
  return JSON.parse(
    screen.getByTestId("renderer-options").textContent,
  ) as RenderOptions;
}

function chooseLayout(id: string) {
  fireEvent.change(screen.getByRole("combobox", { name: "Research layout" }), {
    target: { value: id },
  });
}

describe("digital twin interactions", () => {
  it("offers five bounded variants and sends their selected stages to the renderer", () => {
    showTwin();
    const layout = screen.getByRole("combobox", { name: "Research layout" });
    expect(within(layout).getAllByRole("option")).toHaveLength(5);
    for (const id of [
      "conditioning-metrology",
      "aerosol-carrier",
      "upstream-vaporized",
      "separate-h2-water",
      "motored-baseline",
    ]) {
      chooseLayout(id);
      expect(rendererOptions().variant).toBe(id);
      const shown = screen
        .getAllByRole("checkbox")
        .map((input) => input.getAttribute("aria-label")?.replace("Show ", ""));
      expect(new Set(rendererOptions().visible_stages)).toEqual(new Set(shown));
    }
    expect(screen.queryByRole("checkbox", { name: "Show NBG-104" })).toBeNull();
    chooseLayout("separate-h2-water");
    expect(
      screen.getByRole<HTMLInputElement>("checkbox", {
        name: "Show H2-EXT",
      }).checked,
    ).toBe(true);
  });

  it("selects a stage, isolates it, handles the hidden empty state and restores the assembly", () => {
    showTwin();
    fireEvent.click(
      screen.getByRole("button", { name: /NBG-104 Nanobubble conditioner/ }),
    );
    const inspector = screen.getByRole("complementary", {
      name: "Stage inspector",
    });
    expect(
      within(inspector).getByRole("heading", {
        name: "Nanobubble conditioner",
      }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Isolate selected" }));
    expect(rendererOptions().visible_stages).toEqual(["NBG-104"]);
    fireEvent.click(screen.getByRole("checkbox", { name: "Show NBG-104" }));
    expect(rendererOptions().visible_stages).toEqual([]);
    expect(screen.getByRole("status").textContent).toContain(
      "All stages are hidden",
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Show NBG-104" }));
    expect(screen.queryByRole("status")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show assembly" }));
    expect(rendererOptions().visible_stages.length).toBeGreaterThan(1);
  });

  it("clears isolation and hidden stages when changing variants, including selection fallback", () => {
    showTwin();
    fireEvent.click(screen.getByRole("button", { name: "Isolate selected" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Show ENG-601" }));
    chooseLayout("conditioning-metrology");
    expect(
      screen
        .getByRole("button", { name: "Isolate selected" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
    const inspector = screen.getByRole("complementary", {
      name: "Stage inspector",
    });
    expect(
      within(inspector).getByRole("heading", { name: "Feedwater" }),
    ).toBeTruthy();
    chooseLayout("aerosol-carrier");
    expect(
      screen.getByRole<HTMLInputElement>("checkbox", {
        name: "Show ENG-601",
      }).checked,
    ).toBe(true);
  });

  it("updates section and exploded controls without altering physical timeline values", () => {
    showTwin();
    expect(rendererOptions().section).toBe(true);
    expect(rendererOptions().explode).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Section" }));
    fireEvent.click(screen.getByRole("button", { name: "Exploded" }));
    expect(rendererOptions().section).toBe(false);
    expect(rendererOptions().explode).toBe(1);
    expect(rendererOptions().frame_index).toBe(350);
    expect(
      screen
        .getByRole("button", { name: "Section" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
    expect(
      screen
        .getByRole("button", { name: "Exploded" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("scrubs the Python-derived volume and travel readouts and pauses playback", () => {
    showTwin();
    const viewport = screen.getByRole("region", {
      name: "Interactive digital twin",
    });
    const crank = screen.getByRole("slider", { name: /Crank angle/ });
    fireEvent.click(screen.getByRole("button", { name: "Play animation" }));
    expect(
      screen.getByRole("button", { name: "Pause animation" }),
    ).toBeTruthy();
    fireEvent.change(crank, { target: { value: "180" } });
    expect(rendererOptions().frame_index).toBe(180);
    expect(screen.getByRole("button", { name: "Play animation" })).toBeTruthy();
    expect(viewport.textContent).toContain("555.553 cc");
    expect(viewport.textContent).toContain("86.076 mm");
    fireEvent.change(crank, { target: { value: "0" } });
    expect(viewport.textContent).toContain("55.555 cc");
    expect(viewport.textContent).toContain("0.000 mm");
    fireEvent.change(crank, { target: { value: "360" } });
    expect(rendererOptions().frame_index).toBe(360);
    expect(viewport.textContent).toContain("55.555 cc");
  });

  it("keeps unknown hydrogen and energy inventories visibly distinct from zero", () => {
    showTwin();
    const ledger = screen.getByRole("region", {
      name: "Shared mass and energy ledger",
    });
    expect(ledger.textContent).toContain(
      "Conservation cannot yet be evaluated",
    );
    for (const name of [
      "dissolved",
      "bubble contained",
      "free",
      "transferred",
      "input electricity",
      "hydrogen chemical",
      "phase change",
      "shaft work",
      "recovered heat",
    ]) {
      const label = within(ledger).getByText(name, { exact: true });
      expect(label.nextElementSibling?.textContent).toBe("Unknown");
    }
    expect(
      within(ledger).getAllByText("Unknown", { exact: true }),
    ).toHaveLength(9);
  });
});
