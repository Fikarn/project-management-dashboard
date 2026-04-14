/**
 * Thin client-side API layer. Returns raw Response objects so callers
 * retain control over JSON parsing and error handling.
 */

import type {
  CreateProjectRequest,
  UpdateProjectRequest,
  ReorderProjectsRequest,
  CreateTaskRequest,
  UpdateTaskRequest,
  CreateLightRequest,
  UpdateLightRequest,
  LightValues,
  LightEffect,
  SendDmxRequest,
  LightingSettings,
  UpdateSceneRequest,
  RecallSceneRequest,
  CreateAudioChannelRequest,
  UpdateAudioChannelRequest,
  AudioChannelValues,
  SendOscRequest,
  AudioSettings,
  ReorderAudioRequest,
  CreateAudioSnapshotRequest,
  UpdateAudioSnapshotRequest,
  Settings,
} from "./types";

type FetchOptions = { signal?: AbortSignal };

function post(url: string, body?: unknown, opts?: FetchOptions): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: opts?.signal,
  });
}

function put(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function patch(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function del(url: string): Promise<Response> {
  return fetch(url, { method: "DELETE" });
}

function get(url: string, opts?: FetchOptions & { cache?: RequestCache }): Promise<Response> {
  return fetch(url, { cache: opts?.cache, signal: opts?.signal });
}

// --- Lights ---

export const lightsApi = {
  fetchAll: (opts?: FetchOptions) => get("/api/lights", { ...opts, cache: "no-store" }),
  create: (body: CreateLightRequest) => post("/api/lights", body),
  update: (id: string, body: UpdateLightRequest) => put(`/api/lights/${id}`, body),
  delete: (id: string) => del(`/api/lights/${id}`),
  updateValue: (id: string, values: Partial<LightValues>) => post(`/api/lights/${id}/value`, values),
  setEffect: (id: string, effect: LightEffect | null) => post(`/api/lights/${id}/effect`, { effect }),
  sendDmx: (body: SendDmxRequest) => post("/api/lights/dmx", body),
  setAll: (on: boolean) => post("/api/lights/all", { on }),
  init: (opts?: FetchOptions) => post("/api/lights/init", undefined, opts),
  fetchStatus: (opts?: FetchOptions) => get("/api/lights/status", opts),
  fetchDmxMonitor: (opts?: FetchOptions) => get("/api/lights/dmx-monitor", opts),
  updateSettings: (body: Partial<LightingSettings>) => post("/api/lights/settings", body),
};

// --- Light Groups ---

export const groupsApi = {
  create: (name: string) => post("/api/lights/groups", { name }),
  rename: (id: string, name: string) => put(`/api/lights/groups/${id}`, { name }),
  delete: (id: string) => del(`/api/lights/groups/${id}`),
  setPower: (id: string, on: boolean) => patch(`/api/lights/groups/${id}`, { on }),
};

// --- Light Scenes ---

export const scenesApi = {
  fetchAll: (opts?: FetchOptions) => get("/api/lights/scenes", { ...opts, cache: "no-store" }),
  create: (name: string) => post("/api/lights/scenes", { name }),
  update: (id: string, body: UpdateSceneRequest) => put(`/api/lights/scenes/${id}`, body),
  delete: (id: string) => del(`/api/lights/scenes/${id}`),
  recall: (id: string, body?: RecallSceneRequest) => post(`/api/lights/scenes/${id}/recall`, body ?? {}),
};

// --- Projects ---

export const projectsApi = {
  fetchAll: (opts?: FetchOptions) => get("/api/projects", { ...opts, cache: "no-store" }),
  create: (body: CreateProjectRequest) => post("/api/projects", body),
  update: (id: string, body: UpdateProjectRequest) => put(`/api/projects/${id}`, body),
  delete: (id: string) => del(`/api/projects/${id}`),
  reorder: (body: ReorderProjectsRequest) => post("/api/projects/reorder", body),
};

// --- Tasks ---

export const tasksApi = {
  create: (projectId: string, body: CreateTaskRequest) => post(`/api/projects/${projectId}/tasks`, body),
  update: (projectId: string, taskId: string, body: UpdateTaskRequest) =>
    put(`/api/projects/${projectId}/tasks/${taskId}`, body),
};

// --- Checklist ---

export const checklistApi = {
  add: (projectId: string, taskId: string, text: string) =>
    post(`/api/projects/${projectId}/tasks/${taskId}/checklist`, { text }),
  toggle: (projectId: string, taskId: string, itemId: string, done: boolean) =>
    put(`/api/projects/${projectId}/tasks/${taskId}/checklist/${itemId}`, { done }),
  delete: (projectId: string, taskId: string, itemId: string) =>
    del(`/api/projects/${projectId}/tasks/${taskId}/checklist/${itemId}`),
};

// --- Audio Channels ---

export const audioApi = {
  fetchAll: (opts?: FetchOptions) => get("/api/audio", { ...opts, cache: "no-store" }),
  create: (body: CreateAudioChannelRequest) => post("/api/audio", body),
  update: (id: string, body: UpdateAudioChannelRequest) => put(`/api/audio/${id}`, body),
  delete: (id: string) => del(`/api/audio/${id}`),
  updateValue: (id: string, values: Partial<AudioChannelValues>) => post(`/api/audio/${id}/value`, values),
  updateMixTargetValue: (id: string, values: Record<string, unknown>) =>
    post(`/api/audio/mix-targets/${id}/value`, values),
  sendOsc: (body: SendOscRequest) => post("/api/audio/osc", body),
  init: (opts?: FetchOptions) => post("/api/audio/init", undefined, opts),
  syncConsole: () => post("/api/audio/sync"),
  fetchStatus: (opts?: FetchOptions) => get("/api/audio/status", opts),
  fetchMetering: (opts?: FetchOptions) => get("/api/audio/metering", opts),
  updateSettings: (body: Partial<AudioSettings>) => post("/api/audio/settings", body),
  reorder: (body: ReorderAudioRequest) => post("/api/audio/reorder", body),
};

// --- Audio Snapshots ---

export const audioSnapshotsApi = {
  create: (body: CreateAudioSnapshotRequest) => post("/api/audio/snapshots", body),
  update: (id: string, body: UpdateAudioSnapshotRequest) => put(`/api/audio/snapshots/${id}`, body),
  delete: (id: string) => del(`/api/audio/snapshots/${id}`),
  recall: (id: string) => post(`/api/audio/snapshots/${id}/recall`),
};

// --- Settings ---

export const settingsApi = {
  update: (body: Partial<Settings>) => post("/api/settings", body),
};

// --- Utility ---

export const utilApi = {
  fetchActivity: (limit: number) => get(`/api/activity?limit=${limit}`),
  fetchTimeReport: () => get("/api/reports/time"),
  downloadBackup: () => get("/api/backup"),
  restoreBackup: (body: unknown) => post("/api/backup/restore", body),
  seed: (body?: Record<string, unknown>) => post("/api/seed", body ?? {}),
};
