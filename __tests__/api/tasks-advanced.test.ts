import { describe, it, expect } from "vitest";
import { PUT, DELETE } from "@/app/api/projects/[id]/tasks/[taskId]/route";
import { POST as toggleTask } from "@/app/api/projects/[id]/tasks/[taskId]/toggle/route";
import { POST as addChecklist } from "@/app/api/projects/[id]/tasks/[taskId]/checklist/route";
import {
  PUT as updateChecklist,
  DELETE as deleteChecklist,
} from "@/app/api/projects/[id]/tasks/[taskId]/checklist/[itemId]/route";
import { writeDB, readDB } from "@/lib/db";
import { makeRequest } from "../helpers/request";
import { makeDB, makeProject, makeTask } from "../helpers/fixtures";

describe("PUT /api/projects/[id]/tasks/[taskId]", () => {
  it("updates task fields", async () => {
    const project = makeProject({ id: "proj-1" });
    const task = makeTask({ id: "task-1", projectId: "proj-1", title: "Old" });
    writeDB(makeDB({ projects: [project], tasks: [task] }));

    const req = makeRequest("/api/projects/proj-1/tasks/task-1", {
      method: "PUT",
      body: { title: "New Title", priority: "p0", labels: ["urgent"] },
    });
    const res = await PUT(req, { params: { id: "proj-1", taskId: "task-1" } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.task.title).toBe("New Title");
    expect(data.task.priority).toBe("p0");
    expect(data.task.labels).toEqual(["urgent"]);
  });

  it("returns 400 for invalid priority", async () => {
    const project = makeProject({ id: "proj-1" });
    const task = makeTask({ id: "task-1", projectId: "proj-1" });
    writeDB(makeDB({ projects: [project], tasks: [task] }));

    const req = makeRequest("/api/projects/proj-1/tasks/task-1", {
      method: "PUT",
      body: { priority: "invalid" },
    });
    const res = await PUT(req, { params: { id: "proj-1", taskId: "task-1" } });
    expect(res.status).toBe(400);
  });

  it("returns 404 for missing task", async () => {
    const project = makeProject({ id: "proj-1" });
    writeDB(makeDB({ projects: [project] }));

    const req = makeRequest("/api/projects/proj-1/tasks/nope", {
      method: "PUT",
      body: { title: "X" },
    });
    const res = await PUT(req, { params: { id: "proj-1", taskId: "nope" } });
    expect(res.status).toBe(404);
  });

  it("updates completed status", async () => {
    const project = makeProject({ id: "proj-1" });
    const task = makeTask({ id: "task-1", projectId: "proj-1", completed: false });
    writeDB(makeDB({ projects: [project], tasks: [task] }));

    const req = makeRequest("/api/projects/proj-1/tasks/task-1", {
      method: "PUT",
      body: { completed: true },
    });
    const res = await PUT(req, { params: { id: "proj-1", taskId: "task-1" } });
    const data = await res.json();
    expect(data.task.completed).toBe(true);
  });
});

describe("DELETE /api/projects/[id]/tasks/[taskId]", () => {
  it("deletes a task", async () => {
    const project = makeProject({ id: "proj-1" });
    const task = makeTask({ id: "task-1", projectId: "proj-1" });
    writeDB(makeDB({ projects: [project], tasks: [task] }));

    const req = makeRequest("/api/projects/proj-1/tasks/task-1", { method: "DELETE" });
    const res = await DELETE(req, { params: { id: "proj-1", taskId: "task-1" } });
    const data = await res.json();

    expect(data.deleted).toBe(true);
    expect(readDB().tasks).toHaveLength(0);
  });

  it("handles deleting non-existent task", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/projects/proj-1/tasks/nope", { method: "DELETE" });
    const res = await DELETE(req, { params: { id: "proj-1", taskId: "nope" } });
    const data = await res.json();
    expect(data.deleted).toBe(true); // No task existed so none remain
  });
});

describe("POST /api/projects/[id]/tasks/[taskId]/toggle", () => {
  it("toggles task complete to incomplete", async () => {
    const project = makeProject({ id: "proj-1" });
    const task = makeTask({ id: "task-1", projectId: "proj-1", completed: true });
    writeDB(makeDB({ projects: [project], tasks: [task] }));

    const req = makeRequest("/api/projects/proj-1/tasks/task-1/toggle", { method: "POST" });
    const res = await toggleTask(req, { params: { id: "proj-1", taskId: "task-1" } });
    const data = await res.json();

    expect(data.task.completed).toBe(false);
  });

  it("toggles task incomplete to complete", async () => {
    const project = makeProject({ id: "proj-1" });
    const task = makeTask({ id: "task-1", projectId: "proj-1", completed: false });
    writeDB(makeDB({ projects: [project], tasks: [task] }));

    const req = makeRequest("/api/projects/proj-1/tasks/task-1/toggle", { method: "POST" });
    const res = await toggleTask(req, { params: { id: "proj-1", taskId: "task-1" } });
    const data = await res.json();

    expect(data.task.completed).toBe(true);
  });

  it("logs activity", async () => {
    const project = makeProject({ id: "proj-1" });
    const task = makeTask({ id: "task-1", projectId: "proj-1", completed: false });
    writeDB(makeDB({ projects: [project], tasks: [task] }));

    const req = makeRequest("/api/projects/proj-1/tasks/task-1/toggle", { method: "POST" });
    await toggleTask(req, { params: { id: "proj-1", taskId: "task-1" } });

    const db = readDB();
    expect(db.activityLog.length).toBeGreaterThan(0);
    expect(db.activityLog[0].action).toBe("completed");
  });
});

describe("Checklist CRUD", () => {
  it("adds a checklist item", async () => {
    const project = makeProject({ id: "proj-1" });
    const task = makeTask({ id: "task-1", projectId: "proj-1" });
    writeDB(makeDB({ projects: [project], tasks: [task] }));

    const req = makeRequest("/api/projects/proj-1/tasks/task-1/checklist", {
      method: "POST",
      body: { text: "Buy milk" },
    });
    const res = await addChecklist(req, { params: { id: "proj-1", taskId: "task-1" } });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.item.text).toBe("Buy milk");
    expect(data.item.done).toBe(false);
  });

  it("returns 400 for empty text", async () => {
    const project = makeProject({ id: "proj-1" });
    const task = makeTask({ id: "task-1", projectId: "proj-1" });
    writeDB(makeDB({ projects: [project], tasks: [task] }));

    const req = makeRequest("/api/projects/proj-1/tasks/task-1/checklist", {
      method: "POST",
      body: { text: "" },
    });
    const res = await addChecklist(req, { params: { id: "proj-1", taskId: "task-1" } });
    expect(res.status).toBe(400);
  });

  it("updates a checklist item", async () => {
    const project = makeProject({ id: "proj-1" });
    const task = makeTask({
      id: "task-1",
      projectId: "proj-1",
      checklist: [{ id: "cl-1", text: "Item", done: false }],
    });
    writeDB(makeDB({ projects: [project], tasks: [task] }));

    const req = makeRequest("/api/projects/proj-1/tasks/task-1/checklist/cl-1", {
      method: "PUT",
      body: { done: true },
    });
    const res = await updateChecklist(req, { params: { id: "proj-1", taskId: "task-1", itemId: "cl-1" } });
    const data = await res.json();

    expect(data.item.done).toBe(true);
  });

  it("returns 404 for missing checklist item", async () => {
    const project = makeProject({ id: "proj-1" });
    const task = makeTask({ id: "task-1", projectId: "proj-1" });
    writeDB(makeDB({ projects: [project], tasks: [task] }));

    const req = makeRequest("/api/projects/proj-1/tasks/task-1/checklist/nope", {
      method: "PUT",
      body: { done: true },
    });
    const res = await updateChecklist(req, { params: { id: "proj-1", taskId: "task-1", itemId: "nope" } });
    expect(res.status).toBe(404);
  });

  it("deletes a checklist item", async () => {
    const project = makeProject({ id: "proj-1" });
    const task = makeTask({
      id: "task-1",
      projectId: "proj-1",
      checklist: [{ id: "cl-1", text: "Item", done: false }],
    });
    writeDB(makeDB({ projects: [project], tasks: [task] }));

    const req = makeRequest("/api/projects/proj-1/tasks/task-1/checklist/cl-1", { method: "DELETE" });
    const res = await deleteChecklist(req, { params: { id: "proj-1", taskId: "task-1", itemId: "cl-1" } });
    const data = await res.json();

    expect(data.deleted).toBe(true);
    expect(readDB().tasks[0].checklist).toHaveLength(0);
  });
});
