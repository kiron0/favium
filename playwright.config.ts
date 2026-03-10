import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./playwright",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
  },
  webServer: {
    command: "node ./playwright/server.mjs",
    port: 4173,
    reuseExistingServer: true,
  },
});
