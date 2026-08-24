import { expect, test } from "@playwright/test";

test("mobile Summary remains usable with persistent gate state and no horizontal overflow", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText(/gate failed.*reactive trace suppressed/i),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /concept feasibility at a glance/i }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("mobile Workbench and Test Runs collapse into sequential panels", async ({
  page,
}) => {
  await page.goto("/?view=workbench");
  await expect(
    page.getByText(/single-zone state.*schematic, not CFD/i).first(),
  ).toBeVisible();
  let overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  const evidenceTrigger = page.getByRole("button", {
    name: /assumptions & evidence/i,
  });
  await evidenceTrigger.click();
  await expect(
    page.getByRole("dialog", { name: /assumptions.*evidence/i }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: /assumptions.*evidence/i }),
  ).toHaveCount(0);
  await expect(evidenceTrigger).toBeFocused();

  await page.getByRole("button", { name: "Test Runs" }).click();
  await expect(
    page.getByText(/all seeded examples are demo \/ synthetic/i),
  ).toBeVisible();
  overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("reduced-motion preference removes continuous transitions", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?view=workbench");
  const duration = await page
    .locator(".piston")
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(duration).toMatch(/0\.001ms|0s/);
  await expect(page.getByLabel(/reduced-motion mode/i)).toBeChecked();
});
