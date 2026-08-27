import { defineConfig, devices } from "@playwright/test";

const webPort = process.env.HYDROCYCLE_WEB_PORT ?? "5173";
const webUrl = `http://127.0.0.1:${webPort}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: webUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium-desktop",
      testIgnore: /\.(mobile|tablet)\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1536, height: 1024 },
      },
    },
    {
      name: "chromium-tablet",
      testMatch: /\.tablet\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1024, height: 768 },
      },
    },
    {
      name: "chromium-mobile",
      testMatch: /\.mobile\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: "bash ../../scripts/e2e-dev.sh",
    url: `${webUrl}/api/v1/health`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
