import { createHydroCycleClient, type components } from "@hydrocycle/contracts";
import * as FileSystem from "expo-file-system";

import {
  API_BASE_URL,
  HEALTH_TIMEOUT_MS,
  SIMULATION_TIMEOUT_MS,
} from "./config";

export type ApiSimulationInput = components["schemas"]["SimulationInput"];
export type ApiSimulationResult = components["schemas"]["SimulationResult"];
export type ApiTestRunDocument = components["schemas"]["TestRunDocument"];
export type ApiTestRunCreate = components["schemas"]["TestRunCreate"];
export type ApiTestRunPatch = components["schemas"]["TestRunPatch"];
export type ApiTestRunImportResponse =
  components["schemas"]["TestRunImportResponse"];
type HydroCycleApiClient = ReturnType<typeof createHydroCycleClient>;
type SimulationPersistence = { testRunId: string };

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

const CANONICAL_IMPORT_FILENAMES = new Set([
  "test_run.json",
  "hydrocycle_test_run.json",
  "hydrogen_decay.csv",
  "bubble_distribution.csv",
  "pressure_trace.csv",
]);

export interface LocalImportFile {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
}

export interface DeleteTestRunResult {
  deleted: boolean;
  testRunId: string;
  ownedAttachmentsRemoved: number;
  ownedAttachmentCleanupFailures: number;
}

/**
 * Unlike `apps/web`, there is no dev-server proxy here, so the client is given
 * the explicit loopback origin resolved for this platform.
 */
const client = createHydroCycleClient(API_BASE_URL);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function causeMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

function errorMessage(error: unknown, response: Response): string {
  if (typeof error === "string") return error;
  if (isRecord(error)) {
    if (typeof error.detail === "string") return error.detail;
    return JSON.stringify(error);
  }
  return `${response.status} ${response.statusText}`;
}

async function withTimeout<T>(
  timeoutMs: number,
  run: (signal: AbortSignal) => Promise<T>,
  externalSignal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (externalSignal?.aborted) controller.abort();
  externalSignal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", abort);
  }
}

export async function getHealth(
  externalSignal?: AbortSignal,
): Promise<Record<string, unknown>> {
  return withTimeout(
    HEALTH_TIMEOUT_MS,
    async (signal) => {
      const { data, error, response } = await client.GET("/api/v1/health", {
        signal,
      });
      if (!data) throw new Error(errorMessage(error, response));
      return data;
    },
    externalSignal,
  );
}

export async function getTestRuns(
  externalSignal?: AbortSignal,
): Promise<ApiTestRunDocument[]> {
  return withTimeout(
    HEALTH_TIMEOUT_MS * 4,
    async (signal) => {
      const { data, error, response } = await client.GET("/api/v1/test-runs", {
        signal,
      });
      if (!data) throw new Error(errorMessage(error, response));
      return data;
    },
    externalSignal,
  );
}

export async function getTestRun(
  id: string,
  apiClient: HydroCycleApiClient = client,
): Promise<ApiTestRunDocument> {
  return withTimeout(SIMULATION_TIMEOUT_MS, async (signal) => {
    const { data, error, response } = await apiClient.GET(
      "/api/v1/test-runs/{test_run_id}",
      { params: { path: { test_run_id: id } }, signal },
    );
    if (!data) throw new Error(errorMessage(error, response));
    return data;
  });
}

export function testRunPatchOptions(
  id: string,
  request: ApiTestRunPatch,
  signal: AbortSignal,
) {
  return {
    params: { path: { test_run_id: id } },
    body: request,
    signal,
  };
}

export async function patchTestRun(
  id: string,
  request: ApiTestRunPatch,
  apiClient: HydroCycleApiClient = client,
): Promise<ApiTestRunDocument> {
  return withTimeout(SIMULATION_TIMEOUT_MS, async (signal) => {
    const { data, error, response } = await apiClient.PATCH(
      "/api/v1/test-runs/{test_run_id}",
      testRunPatchOptions(id, request, signal),
    );
    if (!data) throw new Error(errorMessage(error, response));
    return data;
  });
}

export async function createTestRun(
  request: ApiTestRunCreate,
): Promise<ApiTestRunDocument> {
  return withTimeout(SIMULATION_TIMEOUT_MS, async (signal) => {
    const { data, error, response } = await client.POST("/api/v1/test-runs", {
      body: request,
      signal,
    });
    if (!data) throw new Error(errorMessage(error, response));
    return data;
  });
}

export async function deleteTestRun(
  id: string,
  expectedUpdatedAt: string,
  apiClient: HydroCycleApiClient = client,
): Promise<DeleteTestRunResult> {
  return withTimeout(SIMULATION_TIMEOUT_MS, async (signal) => {
    const { data, error, response } = await apiClient.DELETE(
      "/api/v1/test-runs/{test_run_id}",
      {
        params: {
          path: { test_run_id: id },
          query: { confirm: true, expected_updated_at: expectedUpdatedAt },
        },
        signal,
      },
    );
    if (!data) throw new Error(errorMessage(error, response));
    if (data.deleted !== true) {
      throw new Error("The model service did not confirm Test Run deletion.");
    }
    const testRunId =
      typeof data.test_run_id === "string" ? data.test_run_id : id;
    if (testRunId !== id) {
      throw new Error(
        "The model service confirmed deletion for another Test Run.",
      );
    }
    return {
      deleted: true,
      testRunId,
      ownedAttachmentsRemoved:
        typeof data.owned_attachments_removed === "number"
          ? data.owned_attachments_removed
          : 0,
      ownedAttachmentCleanupFailures:
        typeof data.owned_attachment_cleanup_failures === "number"
          ? data.owned_attachment_cleanup_failures
          : 0,
    };
  });
}

async function checkedImportSize(
  file: LocalImportFile,
  stat: typeof FileSystem.getInfoAsync,
): Promise<number> {
  if (typeof file.size === "number" && file.size > MAX_IMPORT_BYTES) {
    return file.size;
  }
  let info: Awaited<ReturnType<typeof FileSystem.getInfoAsync>>;
  try {
    info = await stat(file.uri);
  } catch (cause) {
    throw new Error(
      `The selected local file could not be inspected: ${causeMessage(cause)}`,
    );
  }
  if (!info.exists) {
    throw new Error("The selected local file is no longer available.");
  }
  if (info.isDirectory) {
    throw new Error("The selected item is a folder, not an import file.");
  }
  if (
    typeof info.size !== "number" ||
    !Number.isFinite(info.size) ||
    info.size < 0
  ) {
    throw new Error("The selected local file size could not be verified.");
  }
  return info.size;
}

function importResponseError(body: string, status: number): string {
  try {
    const parsed: unknown = JSON.parse(body);
    if (isRecord(parsed)) {
      const detail = parsed.detail;
      if (typeof detail === "string" && detail.trim()) return detail;
      if (isRecord(detail) && typeof detail.message === "string") {
        const field =
          typeof detail.field === "string" ? ` (${detail.field})` : "";
        return `${detail.message}${field}`;
      }
    }
  } catch {
    // The local service may return plain text for transport-level failures.
  }
  return body.trim() || `Import failed with HTTP ${status}.`;
}

export async function importTestRunFile(
  file: LocalImportFile,
  options: {
    testRunId?: string;
    expectedUpdatedAt?: string;
    calibrationReference?: string;
  } = {},
  upload: typeof FileSystem.uploadAsync = FileSystem.uploadAsync,
  stat: typeof FileSystem.getInfoAsync = FileSystem.getInfoAsync,
): Promise<ApiTestRunImportResponse> {
  if (!CANONICAL_IMPORT_FILENAMES.has(file.name)) {
    throw new Error(
      "Choose a canonical HydroCycle file: test_run.json, hydrocycle_test_run.json, hydrogen_decay.csv, bubble_distribution.csv, or pressure_trace.csv.",
    );
  }
  const size = await checkedImportSize(file, stat);
  if (size > MAX_IMPORT_BYTES) {
    throw new Error(`File exceeds the ${MAX_IMPORT_BYTES}-byte import limit.`);
  }
  const query = new URLSearchParams({ filename: file.name });
  if (options.testRunId) query.set("test_run_id", options.testRunId);
  if (options.expectedUpdatedAt) {
    query.set("expected_updated_at", options.expectedUpdatedAt);
  }
  if (options.calibrationReference) {
    query.set("calibration_reference", options.calibrationReference);
  }
  let result: Awaited<ReturnType<typeof FileSystem.uploadAsync>>;
  try {
    // Native upload avoids materializing the file in JavaScript. The verified
    // 2 MiB cache size and the service's streaming limit bound both reads.
    result = await upload(
      `${API_BASE_URL}/api/v1/test-runs/import?${query.toString()}`,
      file.uri,
      {
        httpMethod: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": file.name.endsWith(".csv")
            ? "text/csv"
            : "application/json",
        },
      },
    );
  } catch (cause) {
    throw new Error(
      `The selected local file could not be read or sent to the local model service: ${causeMessage(cause)}`,
    );
  }
  if (result.status < 200 || result.status >= 300) {
    throw new Error(importResponseError(result.body, result.status));
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(result.body);
  } catch {
    throw new Error(
      "The local model service returned an invalid import response.",
    );
  }
  if (!isRecord(parsed) || !isRecord(parsed.test_run)) {
    throw new Error(
      "The local model service returned an incomplete import response.",
    );
  }
  return parsed as ApiTestRunImportResponse;
}

export async function downloadTestRunExport(
  id: string,
  expectedUpdatedAt: string,
): Promise<string> {
  if (!FileSystem.cacheDirectory) {
    throw new Error("Temporary file storage is unavailable.");
  }
  const destination = `${FileSystem.cacheDirectory}hydrocycle-${encodeURIComponent(id)}.json`;
  const result = await FileSystem.downloadAsync(
    `${API_BASE_URL}/api/v1/test-runs/${encodeURIComponent(id)}/export?${new URLSearchParams(
      {
        format: "canonical_json",
        expected_updated_at: expectedUpdatedAt,
      },
    ).toString()}`,
    destination,
    { headers: { Accept: "application/json" } },
  );
  if (result.status < 200 || result.status >= 300) {
    await FileSystem.deleteAsync(destination, { idempotent: true });
    throw new Error(`Export failed with HTTP ${result.status}.`);
  }
  return result.uri;
}

export async function postSimulation(
  request: ApiSimulationInput,
  persistence?: SimulationPersistence,
  externalSignal?: AbortSignal,
): Promise<ApiSimulationResult> {
  return withTimeout(
    SIMULATION_TIMEOUT_MS,
    async (signal) => {
      const { data, error, response } = await client.POST(
        "/api/v1/simulations",
        simulationPostOptions(request, signal, persistence),
      );
      if (!data) throw new Error(errorMessage(error, response));
      return data;
    },
    externalSignal,
  );
}

export function simulationPostOptions(
  request: ApiSimulationInput,
  signal: AbortSignal,
  persistence?: SimulationPersistence,
) {
  return {
    body: request,
    ...(persistence
      ? {
          params: {
            query: {
              persist: true as const,
              test_run_id: persistence.testRunId,
            },
          },
        }
      : {}),
    signal,
  };
}
