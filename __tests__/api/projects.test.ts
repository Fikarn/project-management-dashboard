import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/projects/route";
import { readDB, writeDB } from "@/lib/db";
import { makeRequest } from "../helpers/request";
import { makeDB, makeProject } from "../helpers/fixtures";

describe("GET /api/projects", () => {
  it("returns empty arrays for fresh db", async () => {
    readDB(); // initialize

    const res = await GET();
    const data = await res.json();

    expect(data.projects).toEqual([]);
    expect(data.tasks).toEqual([]);
    expect(data.settings).toBeDefined();
  });

  it("returns existing projects", async () => {
    const project = makeProject({ title: "My Project" });
    writeDB(makeDB({ projects: [project] }));

    const res = await GET();
    const data = await res.json();

    expect(data.projects).toHaveLength(1);
    expect(data.projects[0].title).toBe("My Project");
  });

  it("includes CORS headers", async () => {
    readDB();
    const res = await GET();
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("POST /api/projects", () => {
  it("creates a project", async () => {
    readDB(); // initialize

    const req = makeRequest("/api/projects", {
      method: "POST",
      body: { title: "New Project" },
    });
    const res = await POST(req, {});
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.project.title).toBe("New Project");
    expect(data.project.id).toMatch(/^proj-/);
    expect(data.project.status).toBe("todo");
    expect(data.project.priority).toBe("p2");
  });

  it("returns 400 for missing title", async () => {
    readDB();
    const req = makeRequest("/api/projects", {
      method: "POST",
      body: {},
    });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty title", async () => {
    readDB();
    const req = makeRequest("/api/projects", {
      method: "POST",
      body: { title: "   " },
    });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
  });

  it("trims whitespace from title", async () => {
    readDB();
    const req = makeRequest("/api/projects", {
      method: "POST",
      body: { title: "  Trimmed  " },
    });
    const res = await POST(req, {});
    const data = await res.json();
    expect(data.project.title).toBe("Trimmed");
  });

  it("accepts optional fields", async () => {
    readDB();
    const req = makeRequest("/api/projects", {
      method: "POST",
      body: { title: "Full", description: "Desc", priority: "p0", status: "in-progress" },
    });
    const res = await POST(req, {});
    const data = await res.json();

    expect(data.project.description).toBe("Desc");
    expect(data.project.priority).toBe("p0");
    expect(data.project.status).toBe("in-progress");
  });

  it("logs activity on creation", async () => {
    readDB();
    const req = makeRequest("/api/projects", {
      method: "POST",
      body: { title: "Logged" },
    });
    await POST(req, {});

    const db = readDB();
    expect(db.activityLog).toHaveLength(1);
    expect(db.activityLog[0].action).toBe("created");
  });
});
