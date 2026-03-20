import { describe, it, expect } from "vitest";
import { PUT, DELETE } from "@/app/api/projects/[id]/route";
import { POST as setStatus } from "@/app/api/projects/[id]/status/route";
import { readDB, writeDB } from "@/lib/db";
import { makeRequest } from "../helpers/request";
import { makeDB, makeProject, makeTask } from "../helpers/fixtures";

describe("PUT /api/projects/[id]", () => {
  it("updates project title", async () => {
    const project = makeProject({ id: "proj-1", title: "Old" });
    writeDB(makeDB({ projects: [project] }));

    const req = makeRequest("/api/projects/proj-1", {
      method: "PUT",
      body: { title: "Updated" },
    });
    const res = await PUT(req, { params: { id: "proj-1" } });
    const data = await res.json();

    expect(data.project.title).toBe("Updated");
  });

  it("updates project priority", async () => {
    const project = makeProject({ id: "proj-1" });
    writeDB(makeDB({ projects: [project] }));

    const req = makeRequest("/api/projects/proj-1", {
      method: "PUT",
      body: { priority: "p0" },
    });
    const res = await PUT(req, { params: { id: "proj-1" } });
    const data = await res.json();

    expect(data.project.priority).toBe("p0");
  });

  it("rejects invalid priority", async () => {
    const project = makeProject({ id: "proj-1" });
    writeDB(makeDB({ projects: [project] }));

    const req = makeRequest("/api/projects/proj-1", {
      method: "PUT",
      body: { priority: "p99" },
    });
    const res = await PUT(req, { params: { id: "proj-1" } });

    expect(res.status).toBe(400);
  });

  it("logs activity on update", async () => {
    const project = makeProject({ id: "proj-1" });
    writeDB(makeDB({ projects: [project] }));

    const req = makeRequest("/api/projects/proj-1", {
      method: "PUT",
      body: { title: "Changed" },
    });
    await PUT(req, { params: { id: "proj-1" } });

    const db = readDB();
    expect(db.activityLog[0].action).toBe("updated");
  });
});

describe("DELETE /api/projects/[id]", () => {
  it("deletes a project and its tasks", async () => {
    const project = makeProject({ id: "proj-1" });
    const task = makeTask({ projectId: "proj-1" });
    writeDB(makeDB({ projects: [project], tasks: [task] }));

    const req = makeRequest("/api/projects/proj-1", { method: "DELETE" });
    const res = await DELETE(req, { params: { id: "proj-1" } });
    const data = await res.json();

    expect(data.deleted).toBe(true);

    const db = readDB();
    expect(db.projects).toHaveLength(0);
    expect(db.tasks).toHaveLength(0);
  });

  it("handles non-existent project gracefully", async () => {
    writeDB(makeDB());

    const req = makeRequest("/api/projects/nope", { method: "DELETE" });
    const res = await DELETE(req, { params: { id: "nope" } });
    const data = await res.json();

    // .some returns false for non-existent → !false → deleted: true
    expect(res.status).toBe(200);
    expect(data.deleted).toBe(true);
  });
});

describe("POST /api/projects/[id]/status", () => {
  it("changes project status", async () => {
    const project = makeProject({ id: "proj-1", status: "todo" });
    writeDB(makeDB({ projects: [project] }));

    const req = makeRequest("/api/projects/proj-1/status", {
      method: "POST",
      body: { status: "in-progress" },
    });
    const res = await setStatus(req, { params: { id: "proj-1" } });
    const data = await res.json();

    expect(data.project.status).toBe("in-progress");
  });

  it("rejects invalid status", async () => {
    const project = makeProject({ id: "proj-1" });
    writeDB(makeDB({ projects: [project] }));

    const req = makeRequest("/api/projects/proj-1/status", {
      method: "POST",
      body: { status: "invalid" },
    });
    const res = await setStatus(req, { params: { id: "proj-1" } });

    expect(res.status).toBe(400);
  });
});
