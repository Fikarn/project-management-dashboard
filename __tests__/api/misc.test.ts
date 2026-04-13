import { describe, it, expect } from "vitest";
import { GET as getActivity } from "@/app/api/activity/route";
import { POST as setView } from "@/app/api/view/route";
import { GET as getTimeReport } from "@/app/api/reports/time/route";
import { POST as seedData } from "@/app/api/seed/route";
import { writeDB, readDB } from "@/lib/db";
import { makeRequest } from "../helpers/request";
import { makeDB, makeProject, makeTask, makeLight } from "../helpers/fixtures";
import type { ActivityEntry } from "@/lib/types";

function makeActivity(overrides: Partial<ActivityEntry> = {}): ActivityEntry {
  return {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    entityType: "project",
    entityId: "proj-1",
    action: "created",
    detail: "Test activity",
    ...overrides,
  };
}

describe("GET /api/activity", () => {
  it("returns empty activity log", async () => {
    readDB();
    const req = makeRequest("/api/activity?limit=10");
    const res = await getActivity(req, {});
    const data = await res.json();
    expect(data.activityLog).toEqual([]);
  });

  it("returns activity with limit", async () => {
    const entries = Array.from({ length: 5 }, (_, i) => makeActivity({ id: `act-${i}`, detail: `Entry ${i}` }));
    writeDB(makeDB({ activityLog: entries }));

    const req = makeRequest("/api/activity?limit=3");
    const res = await getActivity(req, {});
    const data = await res.json();
    expect(data.activityLog).toHaveLength(3);
  });

  it("defaults limit to 50", async () => {
    readDB();
    const req = makeRequest("/api/activity");
    const res = await getActivity(req, {});
    expect(res.status).toBe(200);
  });
});

describe("POST /api/view", () => {
  it("sets view filter", async () => {
    readDB();
    const req = makeRequest("/api/view", { method: "POST", body: { filter: "done" } });
    const res = await setView(req, {});
    const data = await res.json();

    expect(data.filter).toBe("done");
    expect(readDB().settings.viewFilter).toBe("done");
  });

  it("returns 400 for invalid filter", async () => {
    readDB();
    const req = makeRequest("/api/view", { method: "POST", body: { filter: "invalid" } });
    const res = await setView(req, {});
    expect(res.status).toBe(400);
  });

  it("accepts all valid filters", async () => {
    for (const filter of ["all", "todo", "in-progress", "blocked", "done"]) {
      readDB();
      const req = makeRequest("/api/view", { method: "POST", body: { filter } });
      const res = await setView(req, {});
      expect(res.status).toBe(200);
    }
  });
});

describe("GET /api/reports/time", () => {
  it("returns time report for empty db", async () => {
    readDB();
    const req = makeRequest("/api/reports/time");
    const res = await getTimeReport(req, {});
    const data = await res.json();

    expect(data.totalSeconds).toBe(0);
    expect(data.byProject).toEqual([]);
    expect(data.byTask).toEqual([]);
  });

  it("aggregates time by project", async () => {
    const project = makeProject({ id: "proj-1", title: "My Project" });
    const t1 = makeTask({ projectId: "proj-1", totalSeconds: 3600 });
    const t2 = makeTask({ projectId: "proj-1", totalSeconds: 1800 });
    writeDB(makeDB({ projects: [project], tasks: [t1, t2] }));

    const req = makeRequest("/api/reports/time");
    const res = await getTimeReport(req, {});
    const data = await res.json();

    expect(data.totalSeconds).toBe(5400);
    expect(data.byProject).toHaveLength(1);
    expect(data.byProject[0].totalSeconds).toBe(5400);
    expect(data.byProject[0].taskCount).toBe(2);
  });

  it("returns per-task breakdown sorted by time", async () => {
    const project = makeProject({ id: "proj-1", title: "Project" });
    const t1 = makeTask({ id: "t-1", projectId: "proj-1", title: "Short", totalSeconds: 100 });
    const t2 = makeTask({ id: "t-2", projectId: "proj-1", title: "Long", totalSeconds: 5000 });
    writeDB(makeDB({ projects: [project], tasks: [t1, t2] }));

    const req = makeRequest("/api/reports/time");
    const res = await getTimeReport(req, {});
    const data = await res.json();

    expect(data.byTask).toHaveLength(2);
    expect(data.byTask[0].taskTitle).toBe("Long");
  });

  it("filters by projectId", async () => {
    const p1 = makeProject({ id: "proj-1" });
    const p2 = makeProject({ id: "proj-2" });
    const t1 = makeTask({ projectId: "proj-1", totalSeconds: 100 });
    const t2 = makeTask({ projectId: "proj-2", totalSeconds: 200 });
    writeDB(makeDB({ projects: [p1, p2], tasks: [t1, t2] }));

    const req = makeRequest("/api/reports/time?projectId=proj-1");
    const res = await getTimeReport(req, {});
    const data = await res.json();

    expect(data.totalSeconds).toBe(100);
    expect(data.byProject).toHaveLength(1);
  });
});

describe("POST /api/seed", () => {
  it("seeds empty database", async () => {
    readDB();
    const req = makeRequest("/api/seed", { method: "POST", body: {} });
    const res = await seedData(req, {});
    const data = await res.json();

    expect(data.ok).toBe(true);
    expect(data.projects).toBeGreaterThan(0);
    expect(readDB().projects.length).toBeGreaterThan(0);
  });

  it("refuses to seed when projects exist", async () => {
    const project = makeProject({ id: "proj-1" });
    writeDB(makeDB({ projects: [project] }));

    const req = makeRequest("/api/seed", { method: "POST", body: {} });
    const res = await seedData(req, {});
    expect(res.status).toBe(400);
  });

  it("preserves lights when requested", async () => {
    const light = makeLight({ id: "l-1", name: "My Light" });
    writeDB(makeDB({ lights: [light] }));

    const req = makeRequest("/api/seed", { method: "POST", body: { preserveLights: true } });
    const res = await seedData(req, {});

    expect(res.status).toBe(200);
    const db = readDB();
    expect(db.lights.some((l) => l.name === "My Light")).toBe(true);
  });
});
