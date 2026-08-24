import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const packageRoot = new URL("../", import.meta.url);

describe("committed contract artifacts", () => {
  it("publishes the required versioned API routes and no command route", async () => {
    const openApiText = await readFile(
      new URL("openapi.json", packageRoot),
      "utf8",
    );
    const openApi = JSON.parse(openApiText) as {
      paths: Record<string, unknown>;
    };

    expect(Object.keys(openApi.paths).sort()).toEqual(
      [
        "/api/v1/health",
        "/api/v1/model-metadata",
        "/api/v1/simulations",
        "/api/v1/simulations/{simulation_id}",
        "/api/v1/test-runs",
        "/api/v1/test-runs/import",
        "/api/v1/test-runs/{test_run_id}",
        "/api/v1/test-runs/{test_run_id}/export",
      ].sort(),
    );
    expect(Object.keys(openApi.paths).join(" ")).not.toMatch(
      /actuator|command|ignition|injector|throttle/i,
    );
  });

  it.each([
    ["hydrogen_decay.csv", "time_s,total_h2_mg_L,uncertainty_mg_L\n"],
    ["bubble_distribution.csv", "diameter_nm,number_per_mL\n"],
    ["pressure_trace.csv", "crank_angle_deg,pressure_bar,uncertainty_bar\n"],
  ])(
    "keeps %s as the exact header-only import template",
    async (name, expected) => {
      const content = await readFile(
        new URL(`templates/${name}`, packageRoot),
        "utf8",
      );
      expect(content).toBe(expected);
    },
  );
});
