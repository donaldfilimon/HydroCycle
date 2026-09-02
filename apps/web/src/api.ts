import { createHydroCycleClient, type components } from "@hydrocycle/contracts";

export type ApiHealth = Record<string, unknown>;
export type ApiSimulationInput = components["schemas"]["SimulationInput"];
export type ApiSimulationResult = components["schemas"]["SimulationResult"];
export type ApiTestRunDocument = components["schemas"]["TestRunDocument"];
export type ApiTestRunCreate = components["schemas"]["TestRunCreate"];
export type ApiTestRunPatch = components["schemas"]["TestRunPatch"];
export type ApiTestRunImportResponse =
  components["schemas"]["TestRunImportResponse"];

const client = createHydroCycleClient();

function errorMessage(error: unknown, response: Response) {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const detail = "detail" in error ? error.detail : null;
    if (typeof detail === "string") return detail;
    return JSON.stringify(error);
  }
  return `${response.status} ${response.statusText}`;
}

export async function getHealth(): Promise<ApiHealth> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 3_000);
  try {
    const { data, error, response } = await client.GET("/api/v1/health", {
      signal: controller.signal,
    });
    if (!data) throw new Error(errorMessage(error, response));
    return data;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function postSimulationRaw(
  request: ApiSimulationInput,
  persistence?: { testRunId: string },
): Promise<ApiSimulationResult> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 45_000);
  try {
    const { data, error, response } = await client.POST("/api/v1/simulations", {
      body: request,
      ...(persistence
        ? {
            params: {
              query: { persist: true, test_run_id: persistence.testRunId },
            },
          }
        : {}),
      signal: controller.signal,
    });
    if (!data) throw new Error(errorMessage(error, response));
    return data;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function getTestRunsRaw() {
  const { data, error, response } = await client.GET("/api/v1/test-runs");
  if (!data) throw new Error(errorMessage(error, response));
  return data;
}

export async function getTestRunRaw(id: string): Promise<ApiTestRunDocument> {
  const { data, error, response } = await client.GET(
    "/api/v1/test-runs/{test_run_id}",
    { params: { path: { test_run_id: id } } },
  );
  if (!data) throw new Error(errorMessage(error, response));
  return data;
}

export async function createTestRun(
  body: ApiTestRunCreate,
): Promise<ApiTestRunDocument> {
  const { data, error, response } = await client.POST("/api/v1/test-runs", {
    body,
  });
  if (!data) throw new Error(errorMessage(error, response));
  return data;
}

export async function patchTestRun(
  id: string,
  body: ApiTestRunPatch,
): Promise<ApiTestRunDocument> {
  const { data, error, response } = await client.PATCH(
    "/api/v1/test-runs/{test_run_id}",
    { params: { path: { test_run_id: id } }, body },
  );
  if (!data) throw new Error(errorMessage(error, response));
  return data;
}

export interface DeleteTestRunResult {
  deleted: boolean;
  testRunId: string;
  ownedAttachmentsRemoved: number;
  ownedAttachmentCleanupFailures: number;
}

export async function deleteTestRun(
  id: string,
  expectedUpdatedAt: string,
): Promise<DeleteTestRunResult> {
  const { data, error, response } = await client.DELETE(
    "/api/v1/test-runs/{test_run_id}",
    {
      params: {
        path: { test_run_id: id },
        query: { confirm: true, expected_updated_at: expectedUpdatedAt },
      },
    },
  );
  if (!data) throw new Error(errorMessage(error, response));
  return {
    deleted: data.deleted === true,
    testRunId: typeof data.test_run_id === "string" ? data.test_run_id : id,
    ownedAttachmentsRemoved:
      typeof data.owned_attachments_removed === "number"
        ? data.owned_attachments_removed
        : 0,
    ownedAttachmentCleanupFailures:
      typeof data.owned_attachment_cleanup_failures === "number"
        ? data.owned_attachment_cleanup_failures
        : 0,
  };
}

export async function importTestRun(
  file: File,
  calibrationReference: string | null,
): Promise<ApiTestRunImportResponse> {
  const form = new FormData();
  form.set("file", file, file.name);
  if (calibrationReference) {
    form.set("calibration_reference", calibrationReference);
  }
  const response = await fetch("/api/v1/test-runs/import", {
    method: "POST",
    body: form,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    const error: unknown = await response.json().catch(() => null);
    throw new Error(errorMessage(error, response));
  }
  return (await response.json()) as ApiTestRunImportResponse;
}

export async function downloadTestRunExport(
  id: string,
  expectedUpdatedAt: string,
  format: "canonical_json" | "reviewed_csv" | "cfd_boundary" = "canonical_json",
  simulationId?: string,
) {
  const url = new URL(
    `/api/v1/test-runs/${encodeURIComponent(id)}/export`,
    window.location.origin,
  );
  url.searchParams.set("format", format);
  url.searchParams.set("expected_updated_at", expectedUpdatedAt);
  if (simulationId) url.searchParams.set("simulation_id", simulationId);
  const response = await fetch(url, { headers: { Accept: "*/*" } });
  if (!response.ok) {
    const error: unknown = await response.json().catch(() => null);
    throw new Error(errorMessage(error, response));
  }
  const disposition = response.headers.get("content-disposition") ?? "";
  const filename =
    disposition.match(/filename="([^"]+)"/)?.[1] ??
    `hydrocycle-${id}.${format === "reviewed_csv" ? "zip" : "json"}`;
  return { blob: await response.blob(), filename };
}
