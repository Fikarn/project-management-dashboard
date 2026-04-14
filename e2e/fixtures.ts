import type { APIRequestContext, APIResponse, Page } from "@playwright/test";
import { expect, test as base } from "@playwright/test";
import type { LightType, Project, ProjectStatus, Task } from "@/lib/types";
import {
  createDefaultAudioChannels,
  createDefaultAudioMixTargets,
  createDefaultAudioSettings,
} from "@/lib/audio-console";

/**
 * Clean DB state used to reset before each E2E test.
 * hasCompletedSetup: true prevents the setup wizard from showing.
 * dashboardView: "kanban" ensures tests start on the board view.
 */
const CLEAN_DB = {
  schemaVersion: 8,
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
  audioChannels: createDefaultAudioChannels(),
  audioMixTargets: createDefaultAudioMixTargets(),
  audioSnapshots: [],
  audioSettings: createDefaultAudioSettings(),
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
  await expect(page.getByRole("tablist", { name: /dashboard view/i })).toBeVisible({ timeout: 15000 });
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

export async function seedPlanningBoard(request: APIRequestContext): Promise<void> {
  const response = await request.post("/api/seed", { data: {} });
  await expectJson<{ ok: boolean }>(response, "Seed planning board");

  const settingsResponse = await request.post("/api/settings", {
    data: { hasCompletedSetup: true },
  });
  await expectJson<{ settings: object }>(settingsResponse, "Restore setup completion flag");
}

export async function createLight(
  request: APIRequestContext,
  name: string,
  type: LightType,
  dmxStartAddress: number
): Promise<void> {
  const response = await request.post("/api/lights", {
    data: { name, type, dmxStartAddress },
  });
  await expectJson<{ light: { id: string } }>(response, `Create light "${name}"`);
}

export async function createAudioChannel(request: APIRequestContext, name: string, oscChannel: number): Promise<void> {
  const response = await request.post("/api/audio", {
    data: { name, oscChannel },
  });
  await expectJson<{ channel: { id: string } }>(response, `Create audio channel "${name}"`);
}

export async function createAudioSnapshot(request: APIRequestContext, name: string, oscIndex: number): Promise<void> {
  const response = await request.post("/api/audio/snapshots", {
    data: { name, oscIndex },
  });
  await expectJson<{ snapshot: { id: string } }>(response, `Create audio snapshot "${name}"`);
}

export async function seedConsoleViewportState(request: APIRequestContext): Promise<void> {
  await seedPlanningBoard(request);

  for (const light of [
    ["Key Left", "astra-bicolor", 1],
    ["Key Right", "astra-bicolor", 3],
    ["Fill", "astra-bicolor", 5],
    ["Background", "infinimat", 7],
    ["BG Bar 1", "infinibar-pb12", 11],
    ["BG Bar 2", "infinibar-pb12", 19],
    ["BG Bar 3", "infinibar-pb12", 27],
    ["BG Bar 4", "infinibar-pb12", 35],
  ] as const) {
    await createLight(request, light[0], light[1], light[2]);
  }

  for (const [index, name] of [
    [9, "Host"],
    [10, "Guest"],
    [11, "Boom"],
    [12, "Spare Mic"],
    [1, "Line 1"],
    [2, "Line 2"],
    [3, "Remote A"],
    [4, "Remote B"],
    [5, "IFB"],
    [6, "Music"],
    [7, "Backup 1"],
    [8, "Backup 2"],
  ] as const) {
    await createAudioChannel(request, name, index);
  }

  for (const snapshot of [
    ["Interview", 0],
    ["Podcast", 1],
    ["VO", 2],
  ] as const) {
    await createAudioSnapshot(request, snapshot[0], snapshot[1]);
  }

  const lightingSettingsResponse = await request.post("/api/lights/settings", {
    data: { dmxEnabled: true, apolloBridgeIp: "2.0.0.1", dmxUniverse: 1 },
  });
  await expectJson<{ lightingSettings: object }>(lightingSettingsResponse, "Enable lighting settings");

  const audioSettingsResponse = await request.post("/api/audio/settings", {
    data: {
      oscEnabled: true,
      oscSendHost: "127.0.0.1",
      oscSendPort: 7001,
      oscReceivePort: 9001,
      selectedChannelId: "audio-input-9",
      selectedMixTargetId: "audio-mix-main",
    },
  });
  await expectJson<{ audioSettings: object }>(audioSettingsResponse, "Enable audio settings");
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
