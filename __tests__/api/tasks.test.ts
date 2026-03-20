import { describe, it, expect } from "vitest";
import { POST as createTask } from "@/app/api/projects/[id]/tasks/route";
import { POST as timerAction } from "@/app/api/projects/[id]/tasks/[taskId]/timer/route";
import { readDB, writeDB } from "@/lib/db";
import { makeRequest } from "../helpers/request";
import { makeDB, makeProject, makeTask } from "../helpers/fixtures";

describe("POST /api/projects/[id]/tasks", () => {
  it("creates a task", async () => {
    const project = makeProject({ id: "proj-1" });
    writeDB(makeDB({ projects: [project] }));

    const req = makeRequest("/api/projects/proj-1/tasks", {
      method: "POST",
      body: { title: "New Task" },
    });
    const res = await createTask(req, { params: { id: "proj-1" } });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.task.title).toBe("New Task");
    expect(data.task.projectId).toBe("proj-1");
    expect(data.task.id).toMatch(/^task-/);
  });

  it("returns 400 for missing title", async () => {
    const project = makeProject({ id: "proj-1" });
    writeDB(makeDB({ projects: [project] }));

    const req = makeRequest("/api/projects/proj-1/tasks", {
      method: "POST",
      body: {},
    });
    const res = await createTask(req, { params: { id: "proj-1" } });
    expect(res.status).toBe(400);
  });

  it("returns 404 if project does not exist", async () => {
    writeDB(makeDB());

    const req = makeRequest("/api/projects/nope/tasks", {
      method: "POST",
      body: { title: "Orphan" },
    });
    const res = await createTask(req, { params: { id: "nope" } });
    expect(res.status).toBe(404);
  });

  it("sets correct initial values", async () => {
    const project = makeProject({ id: "proj-1" });
    writeDB(makeDB({ projects: [project] }));

    const req = makeRequest("/api/projects/proj-1/tasks", {
      method: "POST",
      body: { title: "Defaults" },
    });
    const res = await createTask(req, { params: { id: "proj-1" } });
    const data = await res.json();

    expect(data.task.completed).toBe(false);
    expect(data.task.isRunning).toBe(false);
    expect(data.task.totalSeconds).toBe(0);
    expect(data.task.priority).toBe("p2");
  });
});

describe("POST /api/projects/[id]/tasks/[taskId]/timer", () => {
  it("starts a timer", async () => {
    const project = makeProject({ id: "proj-1" });
    const task = makeTask({ id: "task-1", projectId: "proj-1" });
    writeDB(makeDB({ projects: [project], tasks: [task] }));

    const req = makeRequest("/api/projects/proj-1/tasks/task-1/timer", {
      method: "POST",
      body: { action: "start" },
    });
    const res = await timerAction(req, { params: { id: "proj-1", taskId: "task-1" } });
    const data = await res.json();

    expect(data.task.isRunning).toBe(true);
    expect(data.task.lastStarted).toBeTruthy();
  });

  it("stops a timer and accumulates seconds", async () => {
    const twoSecondsAgo = new Date(Date.now() - 2000).toISOString();
    const project = makeProject({ id: "proj-1" });
    const task = makeTask({
      id: "task-1",
      projectId: "proj-1",
      isRunning: true,
      lastStarted: twoSecondsAgo,
      totalSeconds: 10,
    });
    writeDB(makeDB({ projects: [project], tasks: [task] }));

    const req = makeRequest("/api/projects/proj-1/tasks/task-1/timer", {
      method: "POST",
      body: { action: "stop" },
    });
    const res = await timerAction(req, { params: { id: "proj-1", taskId: "task-1" } });
    const data = await res.json();

    expect(data.task.isRunning).toBe(false);
    expect(data.task.totalSeconds).toBeGreaterThanOrEqual(11);
    expect(data.task.lastStarted).toBeNull();
  });

  it("toggles timer state", async () => {
    const project = makeProject({ id: "proj-1" });
    const task = makeTask({ id: "task-1", projectId: "proj-1", isRunning: false });
    writeDB(makeDB({ projects: [project], tasks: [task] }));

    const req = makeRequest("/api/projects/proj-1/tasks/task-1/timer", {
      method: "POST",
      body: { action: "toggle" },
    });
    const res = await timerAction(req, { params: { id: "proj-1", taskId: "task-1" } });
    const data = await res.json();

    expect(data.task.isRunning).toBe(true);
  });

  it("rejects invalid action", async () => {
    const project = makeProject({ id: "proj-1" });
    const task = makeTask({ id: "task-1", projectId: "proj-1" });
    writeDB(makeDB({ projects: [project], tasks: [task] }));

    const req = makeRequest("/api/projects/proj-1/tasks/task-1/timer", {
      method: "POST",
      body: { action: "invalid" },
    });
    const res = await timerAction(req, { params: { id: "proj-1", taskId: "task-1" } });
    expect(res.status).toBe(400);
  });
});
