import os from "os";
import path from "path";
import { defineConfig, devices } from "@playwright/test";

const PLAYWRIGHT_HOST = "127.0.0.1";
const PLAYWRIGHT_PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3117);
const PLAYWRIGHT_BASE_URL = `http://${PLAYWRIGHT_HOST}:${PLAYWRIGHT_PORT}`;
const PLAYWRIGHT_DB_DIR = process.env.DB_DIR || path.join(os.tmpdir(), "edvin-project-manager-playwright");

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: PLAYWRIGHT_BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build && npm run start:standalone",
    url: `${PLAYWRIGHT_BASE_URL}/api/health`,
    reuseExistingServer: false,
    timeout: 180000,
    env: {
      ...process.env,
      DB_DIR: PLAYWRIGHT_DB_DIR,
      HOSTNAME: PLAYWRIGHT_HOST,
      PORT: String(PLAYWRIGHT_PORT),
    },
  },
});
