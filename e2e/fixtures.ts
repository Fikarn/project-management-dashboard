import type { APIRequestContext, APIResponse, Page } from "@playwright/test";
import { expect, test as base } from "@playwright/test";
import type { Project, ProjectStatus, Task } from "@/lib/types";

/**
 * Clean DB state used to reset before each E2E test.
 * hasCompletedSetup: true prevents the setup wizard from showing.
 * dashboardView: "kanban" ensures tests start on the board view.
 */
const CLEAN_DB = {
  schemaVersion: 7,
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
  lightGroups: [],
  lightScenes: [],
  lightingSettings: {
    apolloBridgeIp: "2.0.0.1",
    dmxUniverse: 1,
    dmxEnabled: false,
    selectedLightId: null,
    selectedSceneId: null,
    grandMaster: 100,
    cameraMarker: null,
    subjectMarker: null,
  },
  audioChannels: [],
  audioSnapshots: [],
  audioSettings: {
    oscEnabled: false,
    oscSendHost: "127.0.0.1",
    oscSendPort: 7001,
    oscReceivePort: 9001,
    selectedChannelId: null,
  },
};

async function readResponseBody(response: APIResponse): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "<unreadable response body>";
  }
}

export async function expectJson<T>(response: APIResponse, label: string): Promise<T> {
  const body = await readResponseBody(response);
  const contentType = response.headers()["content-type"] ?? "";

  expect(
    response.ok(),
    `${label} should succeed but returned ${response.status()} ${response.statusText()}\n${body.slice(0, 500)}`
  ).toBe(true);

  expect(
    contentType.includes("application/json"),
    `${label} should return JSON but returned ${contentType || "no content-type"}\n${body.slice(0, 500)}`
  ).toBe(true);

  return JSON.parse(body) as T;
}

export async function resetDb(request: APIRequestContext): Promise<void> {
  const response = await request.post("/api/backup/restore", { data: CLEAN_DB });
  await expectJson<{ restored: boolean }>(response, "Database reset");
}

export async function gotoDashboard(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator("main")).toBeVisible({ timeout: 15000 });
}

export async function waitForKanbanReady(page: Page): Promise<void> {
  await gotoDashboard(page);
  await expect(page.getByText("To Do").first()).toBeVisible({ timeout: 10000 });
}

export async function gotoSetup(page: Page): Promise<void> {
  await page.goto("/setup");
  await expect(
    page.getByRole("heading", { level: 1, name: /(control surface setup|stream deck\+ setup)/i })
  ).toBeVisible({
    timeout: 15000,
  });
}

export async function createProject(
  request: APIRequestContext,
  title: string,
  overrides: Partial<{ status: ProjectStatus; description: string }> = {}
): Promise<Project> {
  const response = await request.post("/api/projects", {
    data: {
      title,
      ...overrides,
    },
  });
  const data = await expectJson<{ project: Project }>(response, `Create project "${title}"`);
  return data.project;
}

export async function createTask(request: APIRequestContext, projectId: string, title: string): Promise<Task> {
  const response = await request.post(`/api/projects/${projectId}/tasks`, {
    data: { title },
  });
  const data = await expectJson<{ task: Task }>(response, `Create task "${title}"`);
  return data.task;
}

/**
 * Extended test fixture that resets the database before each test
 * via the backup/restore API, giving every test a clean slate.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // Reset DB to clean state before each test
    await resetDb(page.request);
    await use(page);
  },
});

export { expect };
