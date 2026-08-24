import { expect, test } from "@playwright/test";

test("tablet Workbench uses a contained evidence drawer and has no horizontal overflow", async ({
  page,
}) => {
  await page.goto("/?view=workbench");

  const evidenceTrigger = page.getByRole("button", {
    name: /assumptions & evidence/i,
  });
  const evidenceDialog = page.getByRole("dialog", {
    name: /assumptions & evidence/i,
  });

  await expect(evidenceDialog).toHaveCount(0);
  await evidenceTrigger.click();
  await expect(evidenceDialog).toBeVisible();
  await expect(
    evidenceDialog.getByRole("button", { name: /close evidence drawer/i }),
  ).toBeFocused();
  await expect(page.locator(".topbar")).toHaveJSProperty("inert", true);

  const lastFocusable = evidenceDialog.getByRole("link", {
    name: /view equations & source ledger/i,
  });
  await lastFocusable.focus();
  await page.keyboard.press("Tab");
  await expect(
    evidenceDialog.getByRole("button", { name: /close evidence drawer/i }),
  ).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(evidenceDialog).toHaveCount(0);
  await expect(evidenceTrigger).toBeFocused();
  await expect(page.locator(".topbar")).toHaveJSProperty("inert", false);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("tablet Test Runs keeps provenance, quality, and actions reachable", async ({
  page,
}) => {
  await page.goto("/?view=test-runs");
  await expect(
    page.getByText(/all seeded examples are demo \/ synthetic/i),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /data quality/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /save as draft/i }),
  ).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
