import { createHydroCycleClient, type components } from "@hydrocycle/contracts";

import {
  API_BASE_URL,
  HEALTH_TIMEOUT_MS,
  SIMULATION_TIMEOUT_MS,
} from "./config";

export type ApiSimulationInput = components["schemas"]["SimulationInput"];
export type ApiSimulationResult = components["schemas"]["SimulationResult"];

/**
 * Unlike `apps/web`, there is no dev-server proxy here, so the client is given
 * the explicit loopback origin resolved for this platform.
 */
const client = createHydroCycleClient(API_BASE_URL);

function errorMessage(error: unknown, response: Response): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") return JSON.stringify(error);
  return `${response.status} ${response.statusText}`;
}

async function withTimeout<T>(
  timeoutMs: number,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

export async function getHealth(): Promise<Record<string, unknown>> {
  return withTimeout(HEALTH_TIMEOUT_MS, async (signal) => {
    const { data, error, response } = await client.GET("/api/v1/health", {
      signal,
    });
    if (!data) throw new Error(errorMessage(error, response));
    return data;
  });
}

export async function postSimulation(
  request: ApiSimulationInput,
): Promise<ApiSimulationResult> {
  return withTimeout(SIMULATION_TIMEOUT_MS, async (signal) => {
    const { data, error, response } = await client.POST("/api/v1/simulations", {
      body: request,
      signal,
    });
    if (!data) throw new Error(errorMessage(error, response));
    return data;
  });
}
