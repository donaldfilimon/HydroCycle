import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "cad.spec.ts",
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5191",
    channel: "chrome",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "python3 -m http.server 5191 --bind 127.0.0.1 --directory public",
    url: "http://127.0.0.1:5191/hydrocycle-cad.html",
    reuseExistingServer: false,
  },
});
