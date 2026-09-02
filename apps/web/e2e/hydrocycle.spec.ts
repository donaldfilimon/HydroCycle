import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = ["/summary", "/workbench", "/test-runs"] as const;

test("legacy view links resolve to canonical App Router routes", async ({
  page,
}) => {
  await page.goto("/?view=workbench");
  await expect(page).toHaveURL(/\/workbench$/);
  await expect(page.getByRole("heading", { name: "WORKBENCH" })).toBeVisible();

  await page.goto("/?view=test-runs");
  await expect(page).toHaveURL(/\/test-runs$/);
  await expect(page.getByRole("heading", { name: /TEST RUNS/ })).toBeVisible();
});

test("Summary exposes a failed motored-only gate and semantic energy evidence", async ({
  page,
}) => {
  await page.goto("/summary");
  await expect(page.getByRole("heading", { name: "SUMMARY" })).toBeVisible();
  await expect(page.getByText(/MOTORED BASELINE ONLY/)).toBeVisible();
  await expect(
    page.getByRole("table", { name: "Energy evidence terms" }),
  ).toBeVisible();
  await expect(page.getByText("Missing").first()).toBeVisible();
  await expect(page.getByText("0.00").first()).toBeVisible();
  await expect(page.getByText(/no reactive cycle is shown/i)).toBeVisible();
});

test("Workbench freezes zero-valued input and marks later edits stale", async ({
  page,
}) => {
  await page.goto("/workbench");
  const measuredTotal = page.getByLabel("Measured total H₂");
  await measuredTotal.fill("0");
  await page.getByRole("button", { name: /RUN MODEL/ }).click();
  const frozen = page.locator(".frozen-set");
  await expect(frozen).toBeVisible();
  await expect(frozen).toContainText("Measured total H₂");
  await expect(frozen).toContainText("0");

  await measuredTotal.fill("1.25");
  await expect(
    page.getByText(/CURRENT INPUTS DIFFER FROM RESULT/),
  ).toBeVisible();
});

test("Test Runs provides a semantic ledger and exactly two comparison slots", async ({
  page,
}) => {
  await page.goto("/test-runs");
  const ledger = page.locator(".ledger-table");
  await expect(ledger).toBeVisible();
  const comparisonChecks = page.getByRole("checkbox", {
    name: /for comparison/,
  });
  await expect(comparisonChecks.first()).toBeVisible();
  if ((await comparisonChecks.count()) >= 2) {
    await comparisonChecks.nth(0).check();
    await comparisonChecks.nth(1).check();
    await expect(
      page.getByRole("button", { name: /Compare 2\/2/ }),
    ).toBeVisible();
  }
  await expect(page.getByText(/Missing/).first()).toBeVisible();
});

for (const route of routes) {
  test(`${route} has no serious or critical axe violations`, async ({
    page,
  }) => {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const severe = results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    );
    expect(severe).toEqual([]);
  });
}
