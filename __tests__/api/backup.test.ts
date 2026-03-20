import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/backup/route";
import { POST as restore } from "@/app/api/backup/restore/route";
import { readDB, writeDB } from "@/lib/db";
import { makeRequest } from "../helpers/request";
import { makeDB, makeProject } from "../helpers/fixtures";

describe("GET /api/backup", () => {
  it("returns db.json as download", async () => {
    const project = makeProject({ title: "Backup Test" });
    writeDB(makeDB({ projects: [project] }));

    const res = await GET(new Request("http://localhost/api/backup"), {});
    const text = await res.text();
    const data = JSON.parse(text);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
    expect(data.projects[0].title).toBe("Backup Test");
  });
});

describe("POST /api/backup/restore", () => {
  it("restores from backup data", async () => {
    readDB(); // initialize

    const backup = makeDB({
      projects: [makeProject({ title: "Restored" })],
    });
    const req = makeRequest("/api/backup/restore", {
      method: "POST",
      body: backup,
    });
    const res = await restore(req, {});
    const data = await res.json();

    expect(data.restored).toBe(true);
    expect(data.projects).toBe(1);
  });

  it("rejects invalid backup (missing projects)", async () => {
    readDB();

    const req = makeRequest("/api/backup/restore", {
      method: "POST",
      body: { tasks: [] },
    });
    const res = await restore(req, {});

    expect(res.status).toBe(400);
  });

  it("rejects invalid backup (missing tasks)", async () => {
    readDB();

    const req = makeRequest("/api/backup/restore", {
      method: "POST",
      body: { projects: [] },
    });
    const res = await restore(req, {});

    expect(res.status).toBe(400);
  });

  it("rejects backup with invalid settings type", async () => {
    readDB();

    const req = makeRequest("/api/backup/restore", {
      method: "POST",
      body: { projects: [], tasks: [], settings: "not-an-object" },
    });
    const res = await restore(req, {});

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("settings must be an object");
  });

  it("rejects backup with project missing id", async () => {
    readDB();

    const req = makeRequest("/api/backup/restore", {
      method: "POST",
      body: { projects: [{ title: "No ID" }], tasks: [] },
    });
    const res = await restore(req, {});

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("each project must have id");
  });

  it("rejects backup with task missing projectId", async () => {
    readDB();

    const req = makeRequest("/api/backup/restore", {
      method: "POST",
      body: { projects: [], tasks: [{ id: "task-1" }] },
    });
    const res = await restore(req, {});

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("each task must have id");
  });

  it("returns 400 for malformed JSON", async () => {
    readDB();

    const req = new Request("http://localhost:3000/api/backup/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not valid json",
    });
    const res = await restore(req, {});
    expect(res.status).toBe(400);
  });
});
