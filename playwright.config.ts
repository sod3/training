import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:3200",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  },
  reporter: "list",
  webServer: {
    command: "npx tsx tests/server.ts",
    url: "http://localhost:3200",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
