import {
  DEFAULT_INPUTS,
  demoRuns,
  makeSimulationFixture,
  type TestRunView,
} from "@hydrocycle/view-model";

import type { DataSourceCapabilities } from "../lib/runtime";
import type {
  HydroCycleDataSource,
  ImportSource,
  RequestOptions,
  TestRunCreate,
  TestRunPatch,
} from "./types";

export class FixtureHydroCycleDataSource implements HydroCycleDataSource {
  readonly mode = "hosted" as const;
  readonly capabilities: DataSourceCapabilities = {
    persistence: "session",
    rawFileImport: false,
    export: true,
    mutation: true,
    simulation: true,
    advisory: "guided-fixture",
    disabledReason:
      "Raw file import requires the local validated model service.",
  };
  private runs = demoRuns.map((run) => ({ ...run }));
  private fixture = DEFAULT_INPUTS.fixture;

  async health() {
    return { status: "ok" as const, detail: "Deterministic public fixture" };
  }

  async modelMetadata() {
    return {
      solver: "fixture",
      python: null,
      cantera: null,
      mechanism: null,
      seed: DEFAULT_INPUTS.seed,
    };
  }

  async simulate(input: Parameters<HydroCycleDataSource["simulate"]>[0]) {
    return makeSimulationFixture(this.fixture, {
      ...input,
      fixture: this.fixture,
    });
  }

  async listTestRuns() {
    return this.runs.map((run) => ({ ...run }));
  }

  async getTestRun(id: string) {
    const run = this.runs.find((item) => item.id === id);
    if (!run) throw new Error("Fixture Test Run was not found.");
    return { ...run };
  }

  async createTestRun(input: TestRunCreate) {
    const now = new Date().toISOString();
    const template = this.runs[0];
    if (!template) throw new Error("Fixture seed is unavailable.");
    const run: TestRunView = {
      ...template,
      id: `session-${crypto.randomUUID()}`,
      name: input.name,
      status: input.status,
      synthetic: true,
      persisted: false,
      operator: input.operator ?? null,
      sampleId: input.sample_id ?? null,
      reviewNotes: input.notes ?? null,
      updatedAt: now,
      timestamp: now,
    };
    this.runs = [run, ...this.runs];
    return { ...run };
  }

  async patchTestRun(id: string, input: TestRunPatch) {
    const existing = await this.getTestRun(id);
    if (existing.updatedAt !== input.expected_updated_at) {
      throw new Error(
        "Session Test Run changed; refresh before saving the edit.",
      );
    }
    const updated: TestRunView = {
      ...existing,
      name: input.name ?? existing.name,
      status: input.status ?? existing.status,
      operator:
        input.operator === undefined ? existing.operator : input.operator,
      sampleId:
        input.sample_id === undefined ? existing.sampleId : input.sample_id,
      reviewNotes:
        input.notes === undefined ? existing.reviewNotes : input.notes,
      updatedAt: new Date().toISOString(),
    };
    this.runs = this.runs.map((run) => (run.id === id ? updated : run));
    return { ...updated };
  }

  async deleteTestRun(id: string, expectedUpdatedAt: string) {
    const existing = await this.getTestRun(id);
    if (existing.updatedAt !== expectedUpdatedAt)
      throw new Error("Session Test Run changed; refresh before deleting it.");
    this.runs = this.runs.filter((run) => run.id !== id);
  }

  async exportTestRun(id: string, expectedUpdatedAt: string) {
    const existing = await this.getTestRun(id);
    if (existing.updatedAt !== expectedUpdatedAt)
      throw new Error("Session Test Run changed; refresh before exporting it.");
    return {
      blob: new Blob([JSON.stringify(existing, null, 2)], {
        type: "application/json",
      }),
      filename: `hydrocycle-${id}-session.json`,
    };
  }

  async importTestRun(
    _source: ImportSource,
    _options?: RequestOptions,
  ): Promise<TestRunView> {
    throw new Error(
      this.capabilities.disabledReason ?? "Import is unavailable.",
    );
  }

  selectFixture(fixtureId: string) {
    if (
      fixtureId === "literature" ||
      fixtureId === "artificial-pass" ||
      fixtureId === "water-injection"
    ) {
      this.fixture = fixtureId;
    }
  }

  resetSession() {
    this.runs = demoRuns.map((run) => ({ ...run }));
    this.fixture = DEFAULT_INPUTS.fixture;
  }
}
