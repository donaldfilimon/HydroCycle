import type { components } from "@hydrocycle/contracts";
import type {
  SimulationView,
  TestRunView,
  WorkbenchInputs,
} from "@hydrocycle/view-model";

import type { DataSourceCapabilities, HydroCycleWebMode } from "../lib/runtime";

export interface RequestOptions {
  signal?: AbortSignal;
}

export interface HealthView {
  status: "ok" | "unavailable";
  detail: string;
}

export interface ModelMetadataView {
  solver: string | null;
  python: string | null;
  cantera: string | null;
  mechanism: string | null;
  seed: number | null;
}

export interface DownloadArtifact {
  blob: Blob;
  filename: string;
}

export type TestRunCreate = components["schemas"]["TestRunCreate"];
export type TestRunPatch = components["schemas"]["TestRunPatch"];

export interface ImportSource {
  file: File;
  calibrationReference?: string | null;
  testRunId?: string;
  expectedUpdatedAt?: string;
}

export interface HydroCycleDataSource {
  readonly mode: HydroCycleWebMode;
  readonly capabilities: DataSourceCapabilities;
  health(options?: RequestOptions): Promise<HealthView>;
  modelMetadata(options?: RequestOptions): Promise<ModelMetadataView>;
  simulate(
    input: WorkbenchInputs,
    options?: RequestOptions & { persistToTestRunId?: string },
  ): Promise<SimulationView>;
  listTestRuns(options?: RequestOptions): Promise<TestRunView[]>;
  getTestRun(id: string, options?: RequestOptions): Promise<TestRunView>;
  createTestRun(
    input: TestRunCreate,
    options?: RequestOptions,
  ): Promise<TestRunView>;
  patchTestRun(
    id: string,
    input: TestRunPatch,
    options?: RequestOptions,
  ): Promise<TestRunView>;
  deleteTestRun(
    id: string,
    expectedUpdatedAt: string,
    options?: RequestOptions,
  ): Promise<void>;
  exportTestRun(
    id: string,
    expectedUpdatedAt: string,
    options?: RequestOptions,
  ): Promise<DownloadArtifact>;
  importTestRun(
    source: ImportSource,
    options?: RequestOptions,
  ): Promise<TestRunView>;
  selectFixture?(fixtureId: string): void;
  resetSession?(): void;
}
