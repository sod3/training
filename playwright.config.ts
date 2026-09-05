import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:3100",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  },
  reporter: "list",
  webServer: {
    command: "npm run start -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
