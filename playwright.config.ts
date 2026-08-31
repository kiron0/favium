import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./playwright",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
  },
  webServer: {
    command:
      "node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types ./playwright/server.ts",
    port: 4173,
    reuseExistingServer: true,
  },
});
