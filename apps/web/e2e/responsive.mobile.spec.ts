import { expect, test } from "@playwright/test";

for (const route of ["summary", "workbench", "test-runs"] as const) {
  test(`mobile ${route} retains navigation and avoids horizontal overflow`, async ({
    page,
  }) => {
    await page.goto(`/${route}`);
    await expect(page.locator("main")).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Primary navigation" }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("reduced motion disables decorative transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/workbench");
  const durations = await page
    .locator(".cylinder-instrument")
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        animation: style.animationDuration,
        transition: style.transitionDuration,
      };
    });
  expect(durations.animation).toMatch(/^(0s|0\.001ms)$/);
  expect(durations.transition).toMatch(/^(0s|0\.001ms)$/);
});
