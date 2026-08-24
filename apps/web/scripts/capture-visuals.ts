import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));
const outputDirectory = `${repositoryRoot}/docs/fidelity/implementation`;
const baseUrl = "http://127.0.0.1:5173";

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1536, height: 1024 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });

  await page.goto(`${baseUrl}/?view=summary`);
  await page.getByText(/local model service: ok/i).waitFor();
  await page.getByRole("button", { name: /run model/i }).click();
  await page
    .getByText(/evaluation completed by the local model service/i)
    .waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `${outputDirectory}/summary-1536x1024.png`,
    animations: "disabled",
  });

  await page.getByRole("button", { name: "Workbench", exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `${outputDirectory}/workbench-1536x1024.png`,
    animations: "disabled",
  });

  await page.getByRole("button", { name: "Test Runs", exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `${outputDirectory}/test-runs-1536x1024.png`,
    animations: "disabled",
  });

  await page.setViewportSize({ width: 390, height: 844 });
  for (const view of ["summary", "workbench", "test-runs"] as const) {
    await page.goto(`${baseUrl}/?view=${view}`);
    await page.getByText(/local model service: ok/i).waitFor();
    await page.screenshot({
      path: `${outputDirectory}/${view}-390x844.png`,
      animations: "disabled",
    });
  }
} finally {
  await browser.close();
}

console.log(
  `Captured HydroCycle visual acceptance images in ${outputDirectory}`,
);
