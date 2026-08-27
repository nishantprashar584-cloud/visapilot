import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run start -- --port 3000",
    port: 3000,
    reuseExistingServer: false,
    timeout: 120000,
  },
});