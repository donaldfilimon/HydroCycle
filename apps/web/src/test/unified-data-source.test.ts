import { DEFAULT_INPUTS } from "@hydrocycle/view-model";
import { describe, expect, it } from "vitest";

import { FixtureHydroCycleDataSource } from "../data/fixture";

describe("hosted fixture data source", () => {
  it("is deterministic and preserves null separately from zero", async () => {
    const source = new FixtureHydroCycleDataSource();
    const first = await source.simulate({
      ...DEFAULT_INPUTS,
      measuredTotalMgL: null,
      recoveredHeatJ: 0,
    });
    const second = await source.simulate({
      ...DEFAULT_INPUTS,
      measuredTotalMgL: null,
      recoveredHeatJ: 0,
    });
    expect(first.resultHash).toBe(second.resultHash);
    expect(first.measuredTotalMgL).toBeNull();
    expect(first.gate.energyTerms.recoveredHeatJ).toBe(0);
  });

  it("keeps mutations session-only and enforces revision tokens", async () => {
    const source = new FixtureHydroCycleDataSource();
    const created = await source.createTestRun({
      name: "Session evidence",
      status: "draft",
      is_demo_synthetic: true,
    });
    await expect(
      source.patchTestRun(created.id, {
        expected_updated_at: "2000-01-01T00:00:00Z",
        status: "valid",
      }),
    ).rejects.toThrow(/changed/i);
    const updated = await source.patchTestRun(created.id, {
      expected_updated_at: created.updatedAt,
      status: "valid",
    });
    expect(updated.status).toBe("valid");
    source.resetSession();
    await expect(source.getTestRun(created.id)).rejects.toThrow(/not found/i);
  });

  it("refuses raw file import without probing a local service", async () => {
    const source = new FixtureHydroCycleDataSource();
    await expect(
      source.importTestRun({ file: new File(["{}"], "run.json") }),
    ).rejects.toThrow(/local validated model service/i);
  });
});
