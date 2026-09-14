import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "mobile.spec.ts",
  outputDir: "test-results/mobile-run",
  timeout: 360000,
  workers: 1,
  expect: { timeout: 15000 },
  use: {
    baseURL: "https://localhost:3201",
    ignoreHTTPSErrors: true,
    headless: true,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
    timezoneId: "Asia/Karachi",
    actionTimeout: 20000,
    navigationTimeout: 30000,
  },
  reporter: "list",
  projects: [
    {
      name: "android-chromium",
      use: { browserName: "chromium", deviceScaleFactor: 2 },
    },
    {
      name: "iphone-webkit",
      use: { browserName: "webkit", deviceScaleFactor: 3 },
    },
  ],
  webServer: {
    command: "npx tsx tests/server.ts",
    env: { MOBILE_AUDIT: "1" },
    url: "http://localhost:3200",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
