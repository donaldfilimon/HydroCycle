import {
  deleteTestRun,
  getTestRun,
  importTestRunFile,
  MAX_IMPORT_BYTES,
  patchTestRun,
  simulationPostOptions,
  testRunPatchOptions,
  type ApiSimulationInput,
  type ApiTestRunDocument,
  type ApiTestRunPatch,
} from "../api";

describe("mobile simulation persistence", () => {
  it("uses the web persistence query contract when a Test Run is linked", () => {
    const request = { schema_version: "1.0.0" } as ApiSimulationInput;
    const signal = new AbortController().signal;

    expect(
      simulationPostOptions(request, signal, {
        testRunId: "persisted-run-1",
      }),
    ).toEqual({
      body: request,
      params: {
        query: { persist: true, test_run_id: "persisted-run-1" },
      },
      signal,
    });
  });
});

describe("mobile Test Run PATCH", () => {
  it("reads a fresh server document before an editor merge", async () => {
    const document = { id: "run-1" } as ApiTestRunDocument;
    const get = jest.fn().mockResolvedValue({
      data: document,
      error: undefined,
      response: new Response(null, { status: 200 }),
    });
    const client = {
      GET: get,
    } as unknown as NonNullable<Parameters<typeof getTestRun>[1]>;

    await expect(getTestRun("run-1", client)).resolves.toBe(document);
    expect(get).toHaveBeenCalledWith("/api/v1/test-runs/{test_run_id}", {
      params: { path: { test_run_id: "run-1" } },
      signal: expect.any(AbortSignal),
    });
  });

  it("builds typed path, body, and signal options", () => {
    const body = { operator: null } satisfies ApiTestRunPatch;
    const signal = new AbortController().signal;

    expect(testRunPatchOptions("run-1", body, signal)).toEqual({
      params: { path: { test_run_id: "run-1" } },
      body,
      signal,
    });
  });

  it("calls PATCH and returns the server document", async () => {
    const document = { id: "run-1" } as ApiTestRunDocument;
    const patch = jest.fn().mockResolvedValue({
      data: document,
      error: undefined,
      response: new Response(null, { status: 200 }),
    });
    const client = {
      PATCH: patch,
    } as unknown as NonNullable<Parameters<typeof patchTestRun>[2]>;

    await expect(patchTestRun("run-1", { notes: null }, client)).resolves.toBe(
      document,
    );
    expect(patch).toHaveBeenCalledWith(
      "/api/v1/test-runs/{test_run_id}",
      expect.objectContaining({
        params: { path: { test_run_id: "run-1" } },
        body: { notes: null },
        signal: expect.any(AbortSignal),
      }),
    );
  });
});

describe("mobile Test Run file operations", () => {
  it("rejects an oversized import before starting an upload", async () => {
    const upload = jest.fn();
    const stat = jest.fn();

    await expect(
      importTestRunFile(
        {
          uri: "file:///cache/oversized.csv",
          name: "pressure_trace.csv",
          size: MAX_IMPORT_BYTES + 1,
          mimeType: "text/csv",
        },
        {},
        upload,
        stat,
      ),
    ).rejects.toThrow("import limit");
    expect(upload).not.toHaveBeenCalled();
    expect(stat).not.toHaveBeenCalled();
  });

  it("rejects a file whose actual cache size exceeds stale picker metadata", async () => {
    const upload = jest.fn();
    const stat = jest.fn().mockResolvedValue({
      exists: true,
      isDirectory: false,
      size: MAX_IMPORT_BYTES + 1,
      uri: "file:///cache/stale.csv",
    });

    await expect(
      importTestRunFile(
        {
          uri: "file:///cache/stale.csv",
          name: "pressure_trace.csv",
          size: 128,
          mimeType: "text/csv",
        },
        {},
        upload,
        stat,
      ),
    ).rejects.toThrow("import limit");
    expect(upload).not.toHaveBeenCalled();
  });

  it("rejects a non-canonical filename before reading the local file", async () => {
    const upload = jest.fn();
    const stat = jest.fn();

    await expect(
      importTestRunFile(
        {
          uri: "file:///cache/renamed.json",
          name: "renamed.json",
          size: 128,
          mimeType: "application/json",
        },
        {},
        upload,
        stat,
      ),
    ).rejects.toThrow("canonical HydroCycle file");
    expect(stat).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  it("reports when the selected local file is no longer available", async () => {
    const upload = jest.fn();
    const stat = jest.fn().mockResolvedValue({
      exists: false,
      isDirectory: false,
    });

    await expect(
      importTestRunFile(
        {
          uri: "file:///cache/test_run.json",
          name: "test_run.json",
          size: 128,
          mimeType: "application/json",
        },
        {},
        upload,
        stat,
      ),
    ).rejects.toThrow("local file is no longer available");
    expect(upload).not.toHaveBeenCalled();
  });

  it("streams a bounded CSV with the selected run and calibration reference", async () => {
    const response = {
      test_run: { id: "run-1" },
      attachment: { sha256: "a".repeat(64) },
      imported_simulations: [],
    };
    const upload = jest.fn().mockResolvedValue({
      status: 201,
      body: JSON.stringify(response),
      headers: {},
      mimeType: "application/json",
    });
    const stat = jest.fn().mockResolvedValue({
      exists: true,
      isDirectory: false,
      size: 128,
      uri: "file:///cache/trace.csv",
    });

    await expect(
      importTestRunFile(
        {
          uri: "file:///cache/trace.csv",
          name: "pressure_trace.csv",
          size: 128,
          mimeType: "text/csv",
        },
        { testRunId: "run-1", calibrationReference: "CAL 7" },
        upload,
        stat,
      ),
    ).resolves.toEqual(response);
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(
        /filename=pressure_trace\.csv&test_run_id=run-1&calibration_reference=CAL\+7$/,
      ),
      "file:///cache/trace.csv",
      expect.objectContaining({
        httpMethod: "POST",
        headers: expect.objectContaining({ "Content-Type": "text/csv" }),
      }),
    );
  });

  it("surfaces the server's safe import validation message", async () => {
    const upload = jest.fn().mockResolvedValue({
      status: 422,
      body: JSON.stringify({
        detail: {
          message: "Pressure trace angles must be strictly increasing",
          field: "pressure_trace.csv",
        },
      }),
      headers: {},
      mimeType: "application/json",
    });
    const stat = jest.fn().mockResolvedValue({
      exists: true,
      isDirectory: false,
      size: 128,
      uri: "file:///cache/pressure_trace.csv",
    });

    await expect(
      importTestRunFile(
        {
          uri: "file:///cache/pressure_trace.csv",
          name: "pressure_trace.csv",
          size: 128,
        },
        {},
        upload,
        stat,
      ),
    ).rejects.toThrow(
      "Pressure trace angles must be strictly increasing (pressure_trace.csv)",
    );
  });

  it("requires explicit server confirmation when deleting", async () => {
    const remove = jest.fn().mockResolvedValue({
      data: { deleted: true },
      error: undefined,
      response: new Response(null, { status: 200 }),
    });
    const client = {
      DELETE: remove,
    } as unknown as NonNullable<Parameters<typeof deleteTestRun>[1]>;

    await expect(deleteTestRun("run-1", client)).resolves.toEqual({
      deleted: true,
      testRunId: "run-1",
      ownedAttachmentsRemoved: 0,
      ownedAttachmentCleanupFailures: 0,
    });

    expect(remove).toHaveBeenCalledWith(
      "/api/v1/test-runs/{test_run_id}",
      expect.objectContaining({
        params: {
          path: { test_run_id: "run-1" },
          query: { confirm: true },
        },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("rejects a delete response that does not confirm deletion", async () => {
    const remove = jest.fn().mockResolvedValue({
      data: { deleted: false, test_run_id: "run-1" },
      error: undefined,
      response: new Response(null, { status: 200 }),
    });
    const client = {
      DELETE: remove,
    } as unknown as NonNullable<Parameters<typeof deleteTestRun>[1]>;

    await expect(deleteTestRun("run-1", client)).rejects.toThrow(
      "did not confirm Test Run deletion",
    );
  });
});
