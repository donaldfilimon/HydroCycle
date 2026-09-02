import { expect, test } from "@playwright/test";

for (const route of ["summary", "workbench", "test-runs"] as const) {
  test(`tablet ${route} remains usable without horizontal overflow`, async ({
    page,
  }) => {
    await page.goto(`/${route}`);
    await expect(page.locator("main")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
