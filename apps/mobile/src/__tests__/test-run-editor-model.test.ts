import { demoRuns, type TestRunView } from "@hydrocycle/view-model";

import {
  draftFor,
  editedRunFor,
  mergeTestRunEdit,
} from "../test-run-editor-model";

function run(): TestRunView {
  const source = demoRuns[0]!;
  return {
    ...source,
    provenance: { ...source.provenance },
    standardUncertainty: { ...source.standardUncertainty },
    simulationIds: [...source.simulationIds],
  };
}

describe("Test Run editor model", () => {
  it("parses the editor draft without coercing blanks to zero", () => {
    const original = run();
    const draft = draftFor(original);
    draft.operator = "   ";
    draft.values.totalH2MgL = "";
    draft.uncertainties.totalH2MgL = "";

    const edited = editedRunFor(original, draft, "draft");

    expect(edited.operator).toBeNull();
    expect(edited.totalH2MgL).toBeNull();
    expect(edited.standardUncertainty.totalH2MgL).toBeNull();
  });

  it("merges non-overlapping server changes into the local edit", () => {
    const original = run();
    const local = {
      ...original,
      operator: "Mobile operator",
    };
    const latest = {
      ...original,
      reviewNotes: "Saved on the web",
      updatedAt: "2026-09-02T12:05:00Z",
      timestamp: "2026-09-02T12:05:00Z",
      simulationIds: ["linked-result"],
    };

    const merged = mergeTestRunEdit(original, local, latest);

    expect(merged.operator).toBe("Mobile operator");
    expect(merged.reviewNotes).toBe("Saved on the web");
    expect(merged.updatedAt).toBe("2026-09-02T12:05:00Z");
    expect(merged.simulationIds).toEqual(["linked-result"]);
  });

  it("rejects same-field conflicts and names the field", () => {
    const original = run();
    const local = { ...original, reviewNotes: "Mobile note" };
    const latest = { ...original, reviewNotes: "Web note" };

    expect(() => mergeTestRunEdit(original, local, latest)).toThrow(
      "Test Run changed on the server in: Notes",
    );
  });
});
