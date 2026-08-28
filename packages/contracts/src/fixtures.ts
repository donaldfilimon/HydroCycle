import defaultSimulationInputJson from "../fixtures/simulation-input.default.json";
import measuredTotalSimulationInputJson from "../fixtures/simulation-input.measured-total.json";
import waterInjectionSimulationInputJson from "../fixtures/simulation-input.water-injection.json";

import type { components } from "./api.generated";

type SimulationInput = components["schemas"]["SimulationInput"];

/**
 * Deterministic schema examples, re-exported as typed modules.
 *
 * These are the same generated files `bun run contracts` writes into
 * `fixtures/`. They are surfaced through the package entry point rather than
 * as deep `./fixtures/*.json` subpath imports because Metro (React Native)
 * does not resolve JSON through an `exports` wildcard, so a deep import
 * type-checks but fails to bundle. Importing them here keeps one spelling
 * that works in Vite, Vitest, Metro, and Jest alike.
 */
export const defaultSimulationInput =
  defaultSimulationInputJson as unknown as SimulationInput;

export const measuredTotalSimulationInput =
  measuredTotalSimulationInputJson as unknown as SimulationInput;

export const waterInjectionSimulationInput =
  waterInjectionSimulationInputJson as unknown as SimulationInput;
