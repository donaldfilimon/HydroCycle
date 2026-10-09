import { expect, test } from "@playwright/test";

for (const width of [1536, 390]) {
  test(`CAD route embeds sandboxed workspace at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1024 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/cad");
    const iframe = page.locator(
      'iframe[title="HydroCycle interactive CAD model"]',
    );
    await expect(iframe).toHaveAttribute(
      "sandbox",
      "allow-scripts allow-downloads",
    );
    const workspace = page.frameLocator(
      'iframe[title="HydroCycle interactive CAD model"]',
    );
    await workspace.locator('[data-stage="ENG-601"]').click();
    await expect(workspace.locator("#part-id")).toHaveText("ENG-601");
    await workspace.locator('[data-angle="180"]').click();
    await expect(workspace.locator("#volume")).toHaveText("555.556");
    await expect(workspace.locator("#volume-chart")).toBeVisible();
    const download = page.waitForEvent("download");
    await workspace.locator("#save").click();
    expect((await download).suggestedFilename()).toBe(
      "hydrocycle-cad-parameters.json",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}
