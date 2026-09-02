import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));
const outputDirectory = `${repositoryRoot}/docs/fidelity/unified-next`;
const baseUrl = process.env.HYDROCYCLE_VISUAL_URL ?? "http://127.0.0.1:5173";

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const viewport of [
    { suffix: "1536x1024", width: 1536, height: 1024 },
    { suffix: "1024x768", width: 1024, height: 768 },
    { suffix: "pixel-7", width: 412, height: 915 },
  ] as const) {
    const page = await browser.newPage({
      viewport,
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    for (const route of ["summary", "workbench", "test-runs"] as const) {
      await page.goto(`${baseUrl}/${route}`, { waitUntil: "networkidle" });
      await page.locator("main").waitFor();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `${outputDirectory}/${route}-${viewport.suffix}.png`,
        animations: "disabled",
      });
    }
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(`Captured HydroCycle visual evidence in ${outputDirectory}`);
