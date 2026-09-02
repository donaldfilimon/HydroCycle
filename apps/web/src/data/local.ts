import { createHydroCycleClient, type components } from "@hydrocycle/contracts";
import {
  makeSimulationFixture,
  mapApiSimulationResult,
  mapApiTestRun,
  simulationRequest,
} from "@hydrocycle/view-model";

import type {
  DownloadArtifact,
  HealthView,
  HydroCycleDataSource,
  ImportSource,
  ModelMetadataView,
  RequestOptions,
  TestRunCreate,
  TestRunPatch,
} from "./types";
import type { DataSourceCapabilities } from "../lib/runtime";

const client = createHydroCycleClient("/gateway");

function errorMessage(error: unknown, response: Response): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "detail" in error) {
    const detail = error.detail;
    if (typeof detail === "string") return detail;
  }
  return `${response.status} ${response.statusText}`;
}

export class LocalHydroCycleDataSource implements HydroCycleDataSource {
  readonly mode = "local" as const;
  readonly capabilities: DataSourceCapabilities = {
    persistence: "durable",
    rawFileImport: true,
    export: true,
    mutation: true,
    simulation: true,
    advisory: "local-ollama",
    disabledReason: null,
  };

  async health(options: RequestOptions = {}): Promise<HealthView> {
    const { data, error, response } = await client.GET("/api/v1/health", {
      signal: options.signal,
    });
    if (!data) throw new Error(errorMessage(error, response));
    return { status: "ok", detail: "Local Cantera model service" };
  }

  async modelMetadata(
    options: RequestOptions = {},
  ): Promise<ModelMetadataView> {
    const { data, error, response } = await client.GET(
      "/api/v1/model-metadata",
      { signal: options.signal },
    );
    if (!data) throw new Error(errorMessage(error, response));
    const metadata = data as components["schemas"]["ModelMetadata"];
    return {
      solver: metadata.model_version,
      python: null,
      cantera: metadata.cantera_version ?? null,
      mechanism: metadata.mechanism ?? null,
      seed: null,
    };
  }

  async simulate(
    input: Parameters<HydroCycleDataSource["simulate"]>[0],
    options: Parameters<HydroCycleDataSource["simulate"]>[1] = {},
  ) {
    const { data, error, response } = await client.POST("/api/v1/simulations", {
      body: simulationRequest(input),
      ...(options?.persistToTestRunId
        ? {
            params: {
              query: { persist: true, test_run_id: options.persistToTestRunId },
            },
          }
        : {}),
      signal: options?.signal,
    });
    if (!data) throw new Error(errorMessage(error, response));
    return mapApiSimulationResult(
      makeSimulationFixture(input.fixture, input),
      data,
    );
  }

  async listTestRuns(options: RequestOptions = {}) {
    const { data, error, response } = await client.GET("/api/v1/test-runs", {
      signal: options.signal,
    });
    if (!data) throw new Error(errorMessage(error, response));
    return data.map(mapApiTestRun);
  }

  async getTestRun(id: string, options: RequestOptions = {}) {
    const { data, error, response } = await client.GET(
      "/api/v1/test-runs/{test_run_id}",
      {
        params: { path: { test_run_id: id } },
        signal: options.signal,
      },
    );
    if (!data) throw new Error(errorMessage(error, response));
    return mapApiTestRun(data);
  }

  async createTestRun(input: TestRunCreate, options: RequestOptions = {}) {
    const { data, error, response } = await client.POST("/api/v1/test-runs", {
      body: input,
      signal: options.signal,
    });
    if (!data) throw new Error(errorMessage(error, response));
    return mapApiTestRun(data);
  }

  async patchTestRun(
    id: string,
    input: TestRunPatch,
    options: RequestOptions = {},
  ) {
    const { data, error, response } = await client.PATCH(
      "/api/v1/test-runs/{test_run_id}",
      {
        params: { path: { test_run_id: id } },
        body: input,
        signal: options.signal,
      },
    );
    if (!data) throw new Error(errorMessage(error, response));
    return mapApiTestRun(data);
  }

  async deleteTestRun(
    id: string,
    expectedUpdatedAt: string,
    options: RequestOptions = {},
  ) {
    const { data, error, response } = await client.DELETE(
      "/api/v1/test-runs/{test_run_id}",
      {
        params: {
          path: { test_run_id: id },
          query: { confirm: true, expected_updated_at: expectedUpdatedAt },
        },
        signal: options.signal,
      },
    );
    if (!data) throw new Error(errorMessage(error, response));
  }

  async exportTestRun(
    id: string,
    expectedUpdatedAt: string,
    options: RequestOptions = {},
  ): Promise<DownloadArtifact> {
    const url = new URL(
      `/gateway/api/v1/test-runs/${encodeURIComponent(id)}/export`,
      window.location.origin,
    );
    url.searchParams.set("format", "canonical_json");
    url.searchParams.set("expected_updated_at", expectedUpdatedAt);
    const response = await fetch(url, { signal: options.signal });
    if (!response.ok) throw new Error(await response.text());
    const disposition = response.headers.get("content-disposition") ?? "";
    const filename =
      disposition.match(/filename="([^"]+)"/)?.[1] ?? `hydrocycle-${id}.json`;
    return { blob: await response.blob(), filename };
  }

  async importTestRun(source: ImportSource, options: RequestOptions = {}) {
    const query = new URLSearchParams({ filename: source.file.name });
    if (source.testRunId) query.set("test_run_id", source.testRunId);
    if (source.expectedUpdatedAt)
      query.set("expected_updated_at", source.expectedUpdatedAt);
    if (source.calibrationReference)
      query.set("calibration_reference", source.calibrationReference);
    const response = await fetch(`/gateway/api/v1/test-runs/import?${query}`, {
      method: "POST",
      headers: {
        "content-type": source.file.type || "application/octet-stream",
      },
      body: source.file,
      signal: options.signal,
    });
    if (!response.ok) throw new Error(await response.text());
    const data =
      (await response.json()) as components["schemas"]["TestRunImportResponse"];
    return mapApiTestRun(data.test_run);
  }
}
