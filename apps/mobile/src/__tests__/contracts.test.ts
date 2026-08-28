import { defaultSimulationInput } from "@hydrocycle/contracts";
import { DEFAULT_INPUTS, makeSimulationFixture } from "@hydrocycle/view-model";

/**
 * Pins the `@hydrocycle/contracts` source alias, which is declared in three
 * places that must agree: `tsconfig.json` paths, `metro.config.js`
 * extraNodeModules, and the Jest moduleNameMapper. Metro's half is covered by
 * the bundle export in `scripts/check-mobile.sh`; without this test the Jest
 * half is unexercised, because no other test imports the package.
 */
describe("contracts source alias", () => {
  it("resolves the package entry point", () => {
    expect(defaultSimulationInput).toBeDefined();
    expect(typeof defaultSimulationInput).toBe("object");
  });

  it("exposes the generated fixture the Summary screen submits", () => {
    const input = defaultSimulationInput as unknown as Record<string, unknown>;
    expect(Object.keys(input).length).toBeGreaterThan(0);
    expect(input).toHaveProperty("bubble_population");
  });
});

describe("view-model source alias", () => {
  it("preserves the failed-gate fixture through the package entry point", () => {
    const fixture = makeSimulationFixture("literature", DEFAULT_INPUTS);
    expect(fixture.gate.passed).toBe(false);
    expect(fixture.proposedCycle).toBeNull();
    expect(fixture.motoredBaseline.pressureBar.length).toBeGreaterThan(20);
  });
});
