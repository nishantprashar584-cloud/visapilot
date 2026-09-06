import { defineConfig } from "@playwright/test";

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL?.trim();

export default defineConfig({
  testDir: "./e2e",
  timeout: 120000,
  use: {
    baseURL: externalBaseUrl || "http://localhost:3001",
    trace: "on-first-retry",
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: "npm run start -- --port 3001",
        port: 3001,
        reuseExistingServer: false,
        timeout: 120000,
      },
});