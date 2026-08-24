import { describe, expect, it } from "vitest";

import { CANONICAL_UNITS, UNIT_DEFINITIONS } from "../src/units";

describe("canonical unit registry", () => {
  it("defines conversion metadata for every declared unit", () => {
    expect(Object.keys(UNIT_DEFINITIONS).sort()).toEqual(
      [...CANONICAL_UNITS].sort(),
    );
  });

  it("converts pressure and concentration to SI without ambiguity", () => {
    expect(UNIT_DEFINITIONS.bar.siScale).toBe(100_000);
    expect(UNIT_DEFINITIONS.Pa.siScale).toBe(1);
    expect(UNIT_DEFINITIONS["mg/L"].siScale).toBe(0.001);
  });
});
