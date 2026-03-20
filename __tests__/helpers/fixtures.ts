import type { Project, Task, DB } from "@/lib/types";

export function makeProject(overrides: Partial<Project> = {}): Project {
  const now = new Date().toISOString();
  return {
    id: `proj-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: "Test Project",
    description: "",
    status: "todo",
    priority: "p2",
    createdAt: now,
    lastUpdated: now,
    order: 0,
    ...overrides,
  };
}

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    projectId: "proj-test",
    title: "Test Task",
    description: "",
    priority: "p2",
    dueDate: null,
    labels: [],
    checklist: [],
    isRunning: false,
    totalSeconds: 0,
    lastStarted: null,
    completed: false,
    order: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function makeDB(overrides: Partial<DB> = {}): DB {
  return {
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
    ...overrides,
  };
}
