import { expect, type Page, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const decayCsv =
  "time_s,total_h2_mg_L,uncertainty_mg_L\n" +
  "0,2.05,0.08\n600,1.74,0.08\n1200,1.50,0.07\n1800,1.32,0.07\n";

async function waitForLocalApi(page: Page) {
  await expect(page.getByText(/local model service: ok/i)).toBeVisible();
}

async function importReviewedDecayRun(page: Page, name: string) {
  await page.getByRole("button", { name: /import run/i }).click();
  await page
    .getByLabel(/calibration \/ method reference/i)
    .fill("CAL-LOCAL-001");
  await expect(page.getByLabel(/calibration \/ method reference/i)).toHaveValue(
    "CAL-LOCAL-001",
  );
  await page.locator('input[type="file"]').setInputFiles({
    name: "hydrogen_decay.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(decayCsv),
  });
  await expect(
    page.getByRole("heading", { name: /imported hydrogen_decay\.csv/i }),
  ).toBeVisible();
  await page.getByLabel("Run identity").fill(name);
  await page.getByLabel("Operator").fill("Bench reviewer");
  await page.getByLabel("Sample ID").fill("SAMPLE-H2O-001");
  await page.getByLabel("Method").fill("Calibrated headspace GC");
  await page.getByLabel("Calibration record").fill("CAL-LOCAL-001");
  await page.getByLabel("Total H₂ (mg/L)").fill("2.05");
  await page.getByLabel("Total H₂ standard uncertainty (mg/L)").fill("0.08");
  await page.getByLabel("Retained H₂ (mg/L)").fill("1.32");
  await page.getByLabel("Retained H₂ standard uncertainty (mg/L)").fill("0.07");
  await page.getByLabel("Released H₂ (mg/L)").fill("0.70");
  await page.getByLabel("Released H₂ standard uncertainty (mg/L)").fill("0.08");
  await page.getByLabel("Unaccounted H₂ (mg/L)").fill("0.03");
  await page
    .getByLabel("Unaccounted H₂ standard uncertainty (mg/L)")
    .fill("0.02");
  await page.getByLabel("Elapsed time (s)").fill("1800");
  await page.getByLabel("Elapsed-time standard uncertainty (s)").fill("1");
  await page.getByRole("button", { name: /validate & compare/i }).click();
  await expect(
    page.getByRole("heading", { name: new RegExp(`${name}.*valid`, "i") }),
  ).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await waitForLocalApi(page);
});

test("literature preset fails safely while sensitivity remains inspectable", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", { name: /concept feasibility at a glance/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /run model/i }).click();
  await expect(page.getByRole("alert")).toContainText(
    /proposed reactive trace is null/i,
  );
  await expect(
    page.getByRole("heading", { name: /what changes the conclusion/i }),
  ).toBeVisible();
  await expect(
    page.getByText(/insufficient retained H₂/i).first(),
  ).toBeVisible();
});

test("reviewed run imports, validates, persists across reload, and compares measured retention", async ({
  page,
}) => {
  await importReviewedDecayRun(page, "Reviewed decay run");
  await expect(
    page.getByRole("img", { name: /imported measured total-hydrogen series/i }),
  ).toBeVisible();
  await expect(page.getByText(/imported measured series/i)).toBeVisible();

  await page.reload();
  await waitForLocalApi(page);
  await page
    .getByRole("button", { name: "Reviewed decay run", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /reviewed decay run.*valid/i }),
  ).toBeVisible();
  await expect(page.getByLabel("Operator")).toHaveValue("Bench reviewer");
  await expect(page.getByLabel("Sample ID")).toHaveValue("SAMPLE-H2O-001");
  await expect(page.getByLabel("Calibration record")).toHaveValue(
    "CAL-LOCAL-001",
  );
  await expect(page.getByLabel("Released H₂ (mg/L)")).toHaveValue("0.7");
  await expect(
    page.getByText(/0\.00% of initial; within 0\.5%/i),
  ).toBeVisible();

  await page.getByRole("button", { name: "Summary", exact: true }).click();
  const selectedMeasurements = page
    .getByText("Selected Test Run measurements")
    .locator("..");
  await expect(selectedMeasurements).toContainText("6 datasets");
  await expect(selectedMeasurements).toContainText("Reviewed decay run");
  await expect(
    page.getByText(/Global literature ledger/).locator(".."),
  ).toContainText(/\d+ records?/);
  await expect(
    page.getByText(/Current model assumptions/).locator(".."),
  ).toContainText(/\d+ records?/);
});

test("selected reviewed measurements drive backend loading, retention, and gate inputs", async ({
  page,
}) => {
  await importReviewedDecayRun(page, "Measurement-driven run");
  await page.getByRole("button", { name: "Workbench", exact: true }).click();
  await expect(
    page.getByRole("region", { name: /active measurement source/i }),
  ).toContainText("Measurement-driven run");
  await expect(page.getByLabel(/fixture \/ preset/i)).toHaveValue("literature");

  await page.getByRole("button", { name: /re-run gate/i }).click();
  await expect(
    page.getByText(
      /evaluation completed with selected Test Run evidence from Measurement-driven run/i,
    ),
  ).toBeVisible();
  await expect(page.getByText(/insufficient_h2/i).first()).toBeVisible();

  await page.getByRole("button", { name: "Test Runs", exact: true }).click();
  await expect(page.getByText(/linked backend evaluation/i)).toBeVisible();
  await expect(page.getByText(/total H₂ 2\.050 mg\/L/i)).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /^export$/i }).click();
  const exportPath = await (await download).path();
  expect(exportPath).not.toBeNull();
  const exported = JSON.parse(await readFile(exportPath, "utf8")) as {
    simulations?: Array<{
      input?: {
        sample?: { measured_total_h2_mg_l?: { value?: number } };
        retention?: {
          measured_time_series?: Array<{
            total_h2_mg_l?: { value?: number; standard_uncertainty?: number };
          }>;
        };
      };
      result?: {
        loading?: { mode?: string };
        retention?: { method?: string };
        gate?: { passed?: boolean };
      };
    }>;
  };
  const linked = exported.simulations?.at(-1);
  expect(linked?.input?.sample?.measured_total_h2_mg_l?.value).toBe(2.05);
  expect(linked?.input?.retention?.measured_time_series).toHaveLength(4);
  expect(
    linked?.input?.retention?.measured_time_series?.[3]?.total_h2_mg_l,
  ).toMatchObject({ value: 1.32, standard_uncertainty: 0.07 });
  expect(linked?.result?.loading?.mode).toBe("measured_total");
  expect(linked?.result?.retention?.method).toBe("measured_time_series");
  expect(linked?.result?.gate?.passed).toBe(false);
});

test("imported bubble bins feed derived loading only as uncertain diagnostics", async ({
  page,
}) => {
  await page.getByRole("button", { name: /import run/i }).click();
  await page
    .getByLabel(/calibration \/ method reference/i)
    .fill("BUBBLE-CAL-001");
  await page.locator('input[type="file"]').setInputFiles({
    name: "bubble_distribution.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("diameter_nm,number_per_mL\n120,3000000\n220,800000\n"),
  });
  await expect(
    page.getByRole("heading", { name: /imported bubble_distribution\.csv/i }),
  ).toBeVisible();
  await page.getByLabel("Run identity").fill("Bubble diagnostic run");
  await page.getByLabel("Operator").fill("Bubble reviewer");
  await page.getByLabel("Method").fill("Calibrated particle sizing");
  await page.getByRole("button", { name: /validate & compare/i }).click();
  await expect(
    page.getByRole("heading", { name: /Bubble diagnostic run.*needs review/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Workbench", exact: true }).click();
  await expect(
    page.getByRole("region", { name: /active diagnostic source/i }),
  ).toContainText("Bubble diagnostic run");
  await page.getByRole("button", { name: /re-run gate/i }).click();
  await expect(
    page.getByText(
      /evaluation completed with selected Test Run evidence from Bubble diagnostic run/i,
    ),
  ).toBeVisible();

  await page.getByRole("button", { name: "Test Runs", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /^export$/i }).click();
  const exportPath = await (await download).path();
  expect(exportPath).not.toBeNull();
  const exported = JSON.parse(await readFile(exportPath, "utf8")) as {
    simulations?: Array<{
      input?: {
        sample?: { measured_total_h2_mg_l?: { value?: number | null } };
        bubble_population?: {
          bins?: Array<{
            diameter_nm?: { basis?: string; standard_uncertainty?: number };
            number_per_ml?: { basis?: string; standard_uncertainty?: number };
          }>;
        };
      };
      result?: {
        loading?: {
          mode?: string;
          bubble_contribution_counted?: boolean;
        };
      };
    }>;
  };
  const linked = exported.simulations?.at(-1);
  expect(linked?.input?.sample?.measured_total_h2_mg_l?.value).toBeNull();
  expect(linked?.input?.bubble_population?.bins).toHaveLength(2);
  expect(
    linked?.input?.bubble_population?.bins?.[0]?.diameter_nm,
  ).toMatchObject({ basis: "user_assumption", standard_uncertainty: 24 });
  expect(
    linked?.input?.bubble_population?.bins?.[0]?.number_per_ml,
  ).toMatchObject({
    basis: "user_assumption",
    standard_uncertainty: 1_500_000,
  });
  expect(linked?.result?.loading?.mode).toBe("derived");
  expect(linked?.result?.loading?.bubble_contribution_counted).toBe(true);
});

test("artificial pass fixture reaches the bounded cycle without an experimental claim", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Workbench", exact: true }).click();
  await page.getByLabel(/fixture \/ preset/i).selectOption("artificial-pass");
  await page.getByRole("button", { name: /re-run gate/i }).click();
  await expect(page.getByText(/passed within bounded model/i)).toBeVisible();
  await expect(
    page.getByText(/artificial pass fixture.*synthetic/i),
  ).toBeVisible();
  await expect(page.getByText("P–V loop")).toBeVisible();
  await expect(page.getByText(/proposed reactive trace is null/i)).toHaveCount(
    0,
  );
});

test("malformed import produces actionable field and file guidance", async ({
  page,
}) => {
  await page.getByRole("button", { name: /import run/i }).click();
  await page
    .getByLabel(/calibration \/ method reference/i)
    .fill("CAL-LOCAL-ERROR");
  await page.locator('input[type="file"]').setInputFiles({
    name: "pressure_trace.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("angle,p\n10,2\n5,3\n"),
  });
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("alert")).toContainText(
    "Header must match one canonical series",
  );
  await expect(dialog.getByRole("alert")).toContainText("strictly increasing");
});

test("dirty Test Run navigation and import use the shared discard confirmation", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Test Runs", exact: true }).click();
  const operator = page.getByLabel("Operator");
  await operator.fill("Guarded browser editor");

  await page.getByRole("button", { name: "Summary", exact: true }).click();
  const discard = page.getByRole("alertdialog", {
    name: /discard unsaved changes/i,
  });
  await expect(discard).toContainText(/this Test Run has unsaved changes/i);
  await discard.getByRole("button", { name: /cancel/i }).click();
  await expect(
    page.getByRole("heading", { name: /Synthetic-003/i }),
  ).toBeVisible();
  await expect(operator).toHaveValue("Guarded browser editor");

  await page.getByRole("button", { name: /import run/i }).click();
  await page
    .getByRole("alertdialog", { name: /discard unsaved changes/i })
    .getByRole("button", { name: /discard changes/i })
    .click();
  await expect(
    page.getByRole("dialog", { name: /import measured data/i }),
  ).toBeVisible();
});

test("canonical export and re-import preserve a persisted simulation result hash", async ({
  page,
}) => {
  await importReviewedDecayRun(page, "Round-trip measured run");
  await page.getByRole("button", { name: "Workbench", exact: true }).click();
  await page.getByLabel(/fixture \/ preset/i).selectOption("artificial-pass");
  await page.getByRole("button", { name: /re-run gate/i }).click();
  await expect(
    page.getByText(
      /evaluation completed and linked to persisted run Round-trip measured run/i,
    ),
  ).toBeVisible();
  await expect(page.getByText(/passed within bounded model/i)).toBeVisible();

  await page.getByRole("button", { name: "Test Runs" }).click();
  const cfdButton = page.getByRole("button", {
    name: /export neutral 0D CFD boundary/i,
  });
  await expect(cfdButton).toBeEnabled();
  const cfdDownload = page.waitForEvent("download");
  await cfdButton.click();
  const cfdPath = await (await cfdDownload).path();
  expect(cfdPath).not.toBeNull();
  const cfd = JSON.parse(await readFile(cfdPath, "utf8")) as {
    export_kind?: string;
    states?: unknown[];
    missing_fields?: string[];
  };
  expect(cfd.export_kind).toBe("homogeneous_0d_boundary_only");
  expect(cfd.states?.length).toBeGreaterThan(0);
  expect(cfd.missing_fields).toContain("spatial_mesh");
  expect(cfd.missing_fields).toContain("velocity_field");

  const firstDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /^export$/i }).click();
  const firstPath = await (await firstDownload).path();
  expect(firstPath).not.toBeNull();
  const firstBytes = await readFile(firstPath);
  const first = JSON.parse(firstBytes.toString("utf8")) as {
    content_sha256?: string;
    simulations?: Array<{ id?: string }>;
    test_run?: { name?: string };
  };
  expect(first.content_sha256).toMatch(/^[0-9a-f]{64}$/);
  expect(first.simulations).toHaveLength(1);
  expect(first.simulations?.[0]?.id).toMatch(/^[0-9a-f]{64}$/);
  expect(first.test_run?.name).toBe("Round-trip measured run");

  await page.getByRole("button", { name: /import run/i }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "test_run.json",
    mimeType: "application/json",
    buffer: firstBytes,
  });
  await expect(
    page.getByText(/restored 1 reproducible simulation result/i),
  ).toBeVisible();

  const secondDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /^export$/i }).click();
  const secondPath = await (await secondDownload).path();
  expect(secondPath).not.toBeNull();
  const second = JSON.parse(await readFile(secondPath, "utf8")) as {
    simulations?: Array<{ id?: string }>;
  };
  expect(second.simulations?.[0]?.id).toBe(first.simulations?.[0]?.id);
});

test("duplicating a persisted run creates and reloads a distinct local draft", async ({
  page,
}) => {
  await importReviewedDecayRun(page, "Duplicate source run");
  const workspace = page
    .getByRole("heading", { name: /Duplicate source run.*valid/i })
    .locator("xpath=ancestor::section[contains(@class, 'run-workspace')]");
  await workspace.getByRole("button", { name: /duplicate/i }).click();
  await expect(
    page.getByRole("heading", { name: /Duplicate source run copy.*draft/i }),
  ).toBeVisible();
  await expect(page.getByText(/persisted to local SQLite/i)).toBeVisible();

  await page.reload();
  await waitForLocalApi(page);
  await page
    .getByRole("button", { name: "Duplicate source run copy", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Duplicate source run copy.*draft/i }),
  ).toBeVisible();
});

test("keyboard users can navigate primary screens and the synchronized chart cursor", async ({
  page,
}) => {
  await page.keyboard.press("Tab");
  await expect(page.getByText("Skip to content")).toBeFocused();
  await page.getByRole("button", { name: "Workbench", exact: true }).focus();
  await page.keyboard.press("Enter");
  const pressureChart = page.getByRole("img", {
    name: /motored pressure and/i,
  });
  await pressureChart.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("Crank angle cursor")).toHaveValue("-5");

  const literatureTab = page.getByRole("tab", { name: "Literature" });
  await literatureTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Assumption" })).toBeFocused();
  await expect(page.getByRole("tab", { name: "Assumption" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await page.getByRole("button", { name: "Test Runs", exact: true }).click();
  const provenanceTab = page.getByRole("tab", { name: "Provenance" });
  await provenanceTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Loading" })).toBeFocused();
  await expect(page.getByRole("tab", { name: "Loading" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("modal focus is contained, Escape closes, and focus returns to the invoker", async ({
  page,
}) => {
  const importButton = page.getByRole("button", { name: /import run/i });
  await importButton.click();
  await expect(
    page.getByRole("button", { name: /close import dialog/i }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(importButton).toBeFocused();
});

test("future hardware boundary exposes no command affordance", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Test Runs" }).click();
  await expect(
    page.getByText(/read-only interface reserved for a later validated phase/i),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /not available/i }),
  ).toBeDisabled();
  await expect(
    page.getByText(/no actuator commands; no ControlSink exists/i),
  ).toBeVisible();
});
