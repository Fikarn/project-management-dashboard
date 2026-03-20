import { test as base } from "@playwright/test";

/**
 * Clean DB state used to reset before each E2E test.
 * hasCompletedSetup: true prevents the setup wizard from showing.
 * dashboardView: "kanban" ensures tests start on the board view.
 */
const CLEAN_DB = {
  projects: [],
  tasks: [],
  activityLog: [],
  settings: {
    viewFilter: "all",
    sortBy: "manual",
    selectedProjectId: null,
    selectedTaskId: null,
    dashboardView: "kanban",
    deckMode: "project",
    hasCompletedSetup: true,
  },
  lights: [],
  lightScenes: [],
  lightingSettings: {
    apolloBridgeIp: "2.0.0.1",
    dmxUniverse: 1,
    dmxEnabled: false,
    selectedLightId: null,
    selectedSceneId: null,
  },
};

/**
 * Extended test fixture that resets the database before each test
 * via the backup/restore API, giving every test a clean slate.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // Reset DB to clean state before each test
    await page.request.post("/api/backup/restore", { data: CLEAN_DB });
    await use(page);
  },
});

export { expect } from "@playwright/test";
