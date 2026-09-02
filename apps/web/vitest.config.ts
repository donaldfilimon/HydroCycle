import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    exclude: [
      "e2e/**",
      "node_modules/**",
      "dist/**",
      "out/**",
      ".next/**",
      ".vinext/**",
    ],
    css: true,
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
