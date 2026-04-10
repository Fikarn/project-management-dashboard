import type { Project, Task, Light, AudioChannel, AudioSnapshot, DB } from "@/lib/types";

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

export function makeLight(overrides: Partial<Light> = {}): Light {
  return {
    id: `light-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "Test Light",
    type: "astra-bicolor",
    dmxStartAddress: 1,
    intensity: 100,
    cct: 4400,
    on: false,
    order: 0,
    red: 0,
    green: 0,
    blue: 0,
    colorMode: "cct",
    gmTint: 0,
    groupId: null,
    effect: null,
    spatialX: null,
    spatialY: null,
    spatialRotation: 0,
    ...overrides,
  };
}

export function makeAudioChannel(overrides: Partial<AudioChannel> = {}): AudioChannel {
  return {
    id: `audio-ch-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "Test Input",
    oscChannel: 1,
    order: 0,
    gain: 0,
    fader: 0.75,
    mute: false,
    solo: false,
    phantom: false,
    phase: false,
    pad: false,
    loCut: false,
    ...overrides,
  };
}

export function makeAudioSnapshot(overrides: Partial<AudioSnapshot> = {}): AudioSnapshot {
  return {
    id: `asnap-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "Test Snapshot",
    oscIndex: 0,
    order: 0,
    ...overrides,
  };
}

export function makeDB(overrides: Partial<DB> = {}): DB {
  return {
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
      hasCompletedSetup: false,
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
    ...overrides,
  };
}
