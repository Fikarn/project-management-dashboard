import { describe, it, expect } from "vitest";
import { POST as statusNext } from "@/app/api/projects/[id]/status/next/route";
import { POST as reorderProjects } from "@/app/api/projects/reorder/route";
import { writeDB, readDB } from "@/lib/db";
import { makeRequest } from "../helpers/request";
import { makeDB, makeProject } from "../helpers/fixtures";

describe("POST /api/projects/[id]/status/next", () => {
  it("cycles status todo → in-progress", async () => {
    const project = makeProject({ id: "proj-1", status: "todo" });
    writeDB(makeDB({ projects: [project] }));

    const req = makeRequest("/api/projects/proj-1/status/next", { method: "POST" });
    const res = await statusNext(req, { params: { id: "proj-1" } });
    const data = await res.json();

    expect(data.project.status).toBe("in-progress");
  });

  it("cycles status done → todo (wraps around)", async () => {
    const project = makeProject({ id: "proj-1", status: "done" });
    writeDB(makeDB({ projects: [project] }));

    const req = makeRequest("/api/projects/proj-1/status/next", { method: "POST" });
    const res = await statusNext(req, { params: { id: "proj-1" } });
    const data = await res.json();

    expect(data.project.status).toBe("todo");
  });

  it("returns null for non-existent project", async () => {
    writeDB(makeDB());

    const req = makeRequest("/api/projects/nope/status/next", { method: "POST" });
    const res = await statusNext(req, { params: { id: "nope" } });
    const data = await res.json();

    expect(data.project).toBeNull();
  });

  it("logs activity", async () => {
    const project = makeProject({ id: "proj-1", status: "todo" });
    writeDB(makeDB({ projects: [project] }));

    const req = makeRequest("/api/projects/proj-1/status/next", { method: "POST" });
    await statusNext(req, { params: { id: "proj-1" } });

    const db = readDB();
    expect(db.activityLog.length).toBeGreaterThan(0);
    expect(db.activityLog[0].action).toBe("status_changed");
  });
});

describe("POST /api/projects/reorder", () => {
  it("reorders a project within the same column", async () => {
    const p1 = makeProject({ id: "proj-1", status: "todo", order: 0 });
    const p2 = makeProject({ id: "proj-2", status: "todo", order: 1 });
    const p3 = makeProject({ id: "proj-3", status: "todo", order: 2 });
    writeDB(makeDB({ projects: [p1, p2, p3] }));

    const req = makeRequest("/api/projects/reorder", {
      method: "POST",
      body: { projectId: "proj-3", newStatus: "todo", newIndex: 0 },
    });
    const res = await reorderProjects(req, {});
    expect(res.status).toBe(200);

    const db = readDB();
    const todoProjects = db.projects.filter((p) => p.status === "todo").sort((a, b) => a.order - b.order);
    expect(todoProjects[0].id).toBe("proj-3");
  });

  it("moves a project to a different column", async () => {
    const p1 = makeProject({ id: "proj-1", status: "todo", order: 0 });
    writeDB(makeDB({ projects: [p1] }));

    const req = makeRequest("/api/projects/reorder", {
      method: "POST",
      body: { projectId: "proj-1", newStatus: "in-progress", newIndex: 0 },
    });
    const res = await reorderProjects(req, {});
    expect(res.status).toBe(200);

    const db = readDB();
    expect(db.projects[0].status).toBe("in-progress");
  });

  it("returns 400 for missing projectId", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/projects/reorder", {
      method: "POST",
      body: { newStatus: "todo", newIndex: 0 },
    });
    const res = await reorderProjects(req, {});
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid status", async () => {
    const p1 = makeProject({ id: "proj-1" });
    writeDB(makeDB({ projects: [p1] }));

    const req = makeRequest("/api/projects/reorder", {
      method: "POST",
      body: { projectId: "proj-1", newStatus: "invalid" },
    });
    const res = await reorderProjects(req, {});
    expect(res.status).toBe(400);
  });

  it("logs activity on status change", async () => {
    const p1 = makeProject({ id: "proj-1", status: "todo" });
    writeDB(makeDB({ projects: [p1] }));

    const req = makeRequest("/api/projects/reorder", {
      method: "POST",
      body: { projectId: "proj-1", newStatus: "done", newIndex: 0 },
    });
    await reorderProjects(req, {});

    const db = readDB();
    expect(db.activityLog.some((a) => a.action === "status_changed")).toBe(true);
  });
});
