import { DEFAULT_INPUTS, simulationRequest } from "@hydrocycle/view-model";

/**
 * The Workbench screen builds its request with the same shared mapper the web
 * client uses. These tests pin the properties that matter for the invariants,
 * so a mobile-side "convenience" change cannot quietly weaken them.
 */
describe("shared simulationRequest, as used by the mobile Workbench", () => {
  it("builds a request from the shared defaults", () => {
    const request = simulationRequest(DEFAULT_INPUTS);
    expect(request.schema_version).toBe("1.0.0");
    expect(request.scenario).toBe("upstream_vaporized_carrier");
    expect(request.sample).toBeDefined();
  });

  it("keeps an absent measured total null rather than zero (invariant 3)", () => {
    const request = simulationRequest({
      ...DEFAULT_INPUTS,
      measuredTotalMgL: null,
    });
    expect(request.sample?.measured_total_h2_mg_l?.value).toBeNull();
    expect(request.sample?.measured_total_h2_mg_l?.value).not.toBe(0);
  });

  it("marks an unsourced user-entered total as unreviewed, not measured", () => {
    const request = simulationRequest({
      ...DEFAULT_INPUTS,
      measuredTotalMgL: 2.5,
      measuredTotalSourceId: "",
    });
    const quantity = request.sample?.measured_total_h2_mg_l;
    expect(quantity?.basis).toBe("user_assumption");
    expect(quantity?.source_id).toBe("user-entered-total-h2-unreviewed");
  });

  it("promotes a sourced measured total to the measured basis", () => {
    const request = simulationRequest({
      ...DEFAULT_INPUTS,
      measuredTotalMgL: 2.5,
      measuredTotalSourceId: "lab-gc-001",
    });
    expect(request.sample?.measured_total_h2_mg_l?.basis).toBe("measured");
  });

  it("switches scenario when water injection is selected", () => {
    const request = simulationRequest({
      ...DEFAULT_INPUTS,
      scenario: "hydrogen_fuel_with_water_injection",
    });
    expect(request.scenario).toBe("hydrogen_with_water_injection");
  });

  it("does not mutate the shared defaults", () => {
    const before = JSON.stringify(DEFAULT_INPUTS);
    simulationRequest({ ...DEFAULT_INPUTS, speedRpm: 2400 });
    expect(JSON.stringify(DEFAULT_INPUTS)).toBe(before);
  });
});
