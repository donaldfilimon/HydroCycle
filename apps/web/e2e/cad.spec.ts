import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const resultFixture = fileURLToPath(
  new URL("../../../scripts/fixtures/cad-model-result.json", import.meta.url),
);
for (const [name, viewport] of Object.entries({
  desktop: { width: 1536, height: 1024 },
  mobile: { width: 390, height: 844 },
})) {
  test.describe(`CAD ${name}`, () => {
    test.use({ viewport });
    test.beforeEach(async ({ page }) => {
      await page.goto("/hydrocycle-cad.html");
      await expect(page.locator("#render-status")).toContainText(
        "CONCEPT GEOMETRY",
      );
    });
    test("stage, hierarchy and inspector stay synchronized", async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.locator('[data-stage="ENG-601"]').click();
      await expect(page.locator("#part-id")).toHaveText("ENG-601");
      await expect(page.locator('[data-select="ENG-601"]')).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(page.locator("#components")).toContainText("Wrist pin");
      await page.locator('[data-select="USC-401"]').click();
      await expect(page.locator('[data-stage="USC-401"]')).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(page.locator("#part-note")).toContainText(
        "not proof of complete vaporization",
      );
      await page.locator('[data-stage="NBG-104"]').click();
      await expect(page.locator("#components")).toContainText(
        "Static symbolic samples",
      );
      await page.locator("#symbols").uncheck();
      await expect(page.locator("#components")).not.toContainText(
        "Static symbolic samples",
      );
      expect(errors).toEqual([]);
    });
    test("inspection, motion, responsive layout and accessibility", async ({
      page,
    }) => {
      await page.locator("#projection").selectOption("orthographic");
      await page.locator("#section-angle").fill("90");
      await expect(page.locator("#section-value")).toHaveText("90°");
      await page.locator("#exploded").fill("65");
      await expect(page.locator("#explode-value")).toHaveText("65%");
      await page.locator('[data-stage="ENG-601"]').click();
      await page.locator("#focus-view").click();
      await page.locator('[data-angle="180"]').click();
      await expect(page.locator("#volume")).toHaveText("555.556");
      await page.locator('[data-angle="0"]').click();
      await expect(page.locator("#volume")).toHaveText("55.556");
      await page.locator("#play").click();
      await expect(page.locator("#volume")).not.toHaveText("55.556");
      await page.locator("#play").click();
      await expect(page.locator("#play")).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      await expect(page.locator("#volume-chart")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(audit.violations).toEqual([]);
      await page.screenshot({
        path: `test-results/cad-${name}-engine.png`,
        fullPage: true,
      });
    });
    test("JSON and visible OBJ downloads survive inspection modes", async ({
      page,
    }) => {
      await page.locator('[data-stage="ENG-601"]').click();
      await page.locator("#isolate").click();
      const objPromise = page.waitForEvent("download");
      await page.locator("#obj").click();
      const obj = await objPromise;
      const objPath = await obj.path();
      const mesh = readFileSync(objPath, "utf8");
      expect(mesh).toContain("o ENG-601");
      expect(mesh).not.toContain("o RSV-101");
      expect(mesh).toMatch(/^f /m);
      const jsonPromise = page.waitForEvent("download");
      await page.locator("#save").click();
      const json = await jsonPromise;
      const jsonPath = await json.path();
      const doc: unknown = JSON.parse(readFileSync(jsonPath, "utf8"));
      expect(doc).toMatchObject({ physics: { hydrogenMassMg: null } });
      await page.locator("#file").setInputFiles(jsonPath);
      await expect(page.locator("#toast")).toContainText(
        "Parameter file loaded",
      );
    });
    test("model result uses saved values, clears unknowns, rejects broken arrays", async ({
      page,
    }) => {
      await expect(page.locator("#mass-ledger")).toContainText("Unknown");
      await page.locator("#result-file").setInputFiles(resultFixture);
      await expect(page.locator("#result-status")).toContainText(
        "cad-test-synthetic-motored-snapshot",
      );
      await expect(page.locator("#pv-loaded")).toBeVisible();
      await page.screenshot({
        path: `test-results/cad-${name}-result.png`,
        fullPage: true,
      });
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(audit.violations).toEqual([]);
      const curve = await page.locator("#pv-path").getAttribute("d");
      await page.locator('[data-param="boreMm"]').fill("90");
      await page.locator('[data-param="boreMm"]').press("Tab");
      await expect(page.locator("#pv-path")).toHaveAttribute(
        "d",
        curve ?? "missing trace",
      );
      const result = JSON.parse(readFileSync(resultFixture, "utf8")) as {
        motored_baseline: { volume_m3: number[] };
      };
      result.motored_baseline.volume_m3.pop();
      await page.locator("#result-file").setInputFiles({
        name: "invalid.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(result)),
      });
      await expect(page.locator("#toast")).toContainText("Result rejected");
      await page.locator("#clear-result").click();
      await expect(page.locator("#mass-ledger")).toContainText("Unknown");
      await expect(page.locator("#pv-loaded")).toBeHidden();
    });
    test("complete assembly and software fallback render without errors", async ({
      page,
    }) => {
      await page.screenshot({
        path: `test-results/cad-${name}-assembly.png`,
        fullPage: true,
      });
      await page.addInitScript(() => {
        // Preserve the dynamic receiver through Reflect.apply below.
        // eslint-disable-next-line @typescript-eslint/unbound-method
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (
          this: HTMLCanvasElement,
          type,
          ...args
        ) {
          if (type === "webgl") return null;
          return Reflect.apply(original, this, [type, ...args]);
        } as typeof original;
      });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.reload();
      await expect(page.locator("#cad")).toHaveAttribute(
        "data-renderer",
        "canvas",
      );
      await page.locator("#projection").selectOption("orthographic");
      await page.locator('[data-angle="180"]').click();
      await expect(page.locator("#volume")).toHaveText("555.556");
      expect(errors).toEqual([]);
      await page.screenshot({
        path: `test-results/cad-${name}-canvas.png`,
        fullPage: true,
      });
    });
  });
}
