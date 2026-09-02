import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120000,
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run start -- --port 3001",
    port: 3001,
    reuseExistingServer: false,
    timeout: 120000,
  },
});