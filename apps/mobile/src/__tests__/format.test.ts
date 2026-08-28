import {
  ABSENT,
  formatNumber,
  formatText,
  formatWithUnit,
  humanizeFailureCode,
  visibleFailureCodes,
} from "../format";

describe("invariant 3: missing measurements stay null, never zero", () => {
  it.each([null, undefined, Number.NaN, Number.POSITIVE_INFINITY])(
    "renders %p as the absent marker rather than a number",
    (value) => {
      expect(formatNumber(value as number | null | undefined)).toBe(ABSENT);
    },
  );

  it("never renders an absent value as 0", () => {
    expect(formatNumber(null)).not.toBe("0.00");
    expect(formatWithUnit(null, "mg/L")).not.toContain("0");
  });

  it("still renders a genuine measured zero as zero", () => {
    expect(formatNumber(0)).toBe("0.00");
    expect(formatWithUnit(0, "mg/L", 1)).toBe("0.0 mg/L");
  });

  it("keeps the unit off an absent value", () => {
    expect(formatWithUnit(undefined, "mg/cycle")).toBe(ABSENT);
  });

  it("treats blank text as absent", () => {
    expect(formatText("")).toBe(ABSENT);
    expect(formatText("   ")).toBe(ABSENT);
    expect(formatText(null)).toBe(ABSENT);
    expect(formatText("gri30.yaml")).toBe("gri30.yaml");
  });
});

describe("visibleFailureCodes", () => {
  it("suppresses the API pass sentinel", () => {
    expect(visibleFailureCodes(["pass"])).toEqual([]);
  });

  it("preserves real failure codes", () => {
    expect(visibleFailureCodes(["insufficient_h2", "preheat_deficit"])).toEqual(
      ["insufficient_h2", "preheat_deficit"],
    );
  });
});

describe("formatNumber precision", () => {
  it("honours the requested fraction digits", () => {
    expect(formatNumber(1.23456, 3)).toBe("1.235");
    expect(formatNumber(42, 0)).toBe("42");
  });
});

describe("humanizeFailureCode", () => {
  it("turns gate failure codes into readable text", () => {
    expect(humanizeFailureCode("mass_balance_failed")).toBe(
      "Mass balance failed",
    );
    expect(humanizeFailureCode("insufficient_h2")).toBe("Insufficient h2");
  });

  it("does not invent text for an empty code", () => {
    expect(humanizeFailureCode("")).toBe(ABSENT);
  });
});
