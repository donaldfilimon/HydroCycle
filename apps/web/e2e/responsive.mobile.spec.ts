import { expect, test } from "@playwright/test";

for (const route of ["summary", "workbench", "test-runs"] as const) {
  test(`mobile ${route} retains navigation and avoids horizontal overflow`, async ({
    page,
  }) => {
    await page.goto(`/${route}`);
    await expect(page.locator("main")).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Mobile navigation" }),
    ).toBeVisible();
    await expect(
      page.getByRole("complementary", { name: "Primary navigation" }),
    ).toBeHidden();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test(`mobile ${route} keeps the advisor closed until explicitly requested`, async ({
    page,
  }) => {
    await page.goto(`/${route}`);
    const advisor = page.getByRole("complementary", { name: "Advisor lens" });
    await expect(advisor).toHaveCount(0);

    const disclosure = page
      .getByRole("button", { name: /(?:ask|open) advisor/i })
      .first();
    await expect(disclosure).toBeVisible();
    await disclosure.click();
    await expect(advisor).toBeVisible();
    await page.getByRole("button", { name: "Close advisor" }).click();
    await expect(advisor).toHaveCount(0);
  });
}

test("reduced motion disables decorative transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/workbench");
  const durationsMs = await page
    .locator(".cylinder-instrument")
    .evaluate((element) => {
      const style = getComputedStyle(element);
      const toMilliseconds = (duration: string) =>
        duration.endsWith("ms")
          ? Number.parseFloat(duration)
          : Number.parseFloat(duration) * 1_000;
      return {
        animation: toMilliseconds(style.animationDuration),
        transition: toMilliseconds(style.transitionDuration),
      };
    });
  // "Disabled" means imperceptible, not a specific magic value: anything under a
  // millisecond passes, so the stylesheet is free to use 0.01ms or 0.001ms.
  expect(durationsMs.animation).toBeLessThan(1);
  expect(durationsMs.transition).toBeLessThan(1);
});
