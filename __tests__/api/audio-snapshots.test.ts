import { describe, it, expect, vi } from "vitest";

vi.mock("node-osc", () => import("../__mocks__/node-osc"));

import { GET, POST } from "@/app/api/audio/snapshots/route";
import { PUT, DELETE } from "@/app/api/audio/snapshots/[id]/route";
import { readDB, writeDB } from "@/lib/db";
import { makeRequest } from "../helpers/request";
import { makeDB, makeAudioSnapshot } from "../helpers/fixtures";

describe("GET /api/audio/snapshots", () => {
  it("returns empty snapshots for fresh db", async () => {
    readDB();
    const res = await GET(
      new Request("http://localhost/api/audio/snapshots", { headers: { Origin: "http://localhost:3000" } }),
      {}
    );
    const data = await res.json();
    expect(data.snapshots).toEqual([]);
  });

  it("returns existing snapshots", async () => {
    const snap = makeAudioSnapshot({ name: "Interview Setup" });
    writeDB(makeDB({ audioSnapshots: [snap] }));

    const res = await GET(
      new Request("http://localhost/api/audio/snapshots", { headers: { Origin: "http://localhost:3000" } }),
      {}
    );
    const data = await res.json();
    expect(data.snapshots).toHaveLength(1);
    expect(data.snapshots[0].name).toBe("Interview Setup");
  });
});

describe("POST /api/audio/snapshots", () => {
  it("creates a snapshot", async () => {
    readDB();
    const req = makeRequest("/api/audio/snapshots", {
      method: "POST",
      body: { name: "Solo Podcast", oscIndex: 2 },
    });
    const res = await POST(req, {});
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.snapshot.name).toBe("Solo Podcast");
    expect(data.snapshot.oscIndex).toBe(2);
    expect(data.snapshot.id).toMatch(/^asnap-/);
  });

  it("returns 400 for missing name", async () => {
    readDB();
    const req = makeRequest("/api/audio/snapshots", {
      method: "POST",
      body: { oscIndex: 0 },
    });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing oscIndex", async () => {
    readDB();
    const req = makeRequest("/api/audio/snapshots", {
      method: "POST",
      body: { name: "Test" },
    });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("oscIndex");
  });

  it("returns 400 for oscIndex out of range", async () => {
    readDB();
    const req = makeRequest("/api/audio/snapshots", {
      method: "POST",
      body: { name: "Test", oscIndex: 8 },
    });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
  });

  it("returns 400 for negative oscIndex", async () => {
    readDB();
    const req = makeRequest("/api/audio/snapshots", {
      method: "POST",
      body: { name: "Test", oscIndex: -1 },
    });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
  });

  it("returns 400 for name exceeding 50 characters", async () => {
    readDB();
    const req = makeRequest("/api/audio/snapshots", {
      method: "POST",
      body: { name: "A".repeat(51), oscIndex: 0 },
    });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("50 characters");
  });

  it("accepts boundary oscIndex values", async () => {
    readDB();
    // oscIndex 0 (minimum)
    const req0 = makeRequest("/api/audio/snapshots", {
      method: "POST",
      body: { name: "Min", oscIndex: 0 },
    });
    const res0 = await POST(req0, {});
    expect(res0.status).toBe(201);

    // oscIndex 7 (maximum)
    const req7 = makeRequest("/api/audio/snapshots", {
      method: "POST",
      body: { name: "Max", oscIndex: 7 },
    });
    const res7 = await POST(req7, {});
    expect(res7.status).toBe(201);
  });
});

describe("PUT /api/audio/snapshots/[id]", () => {
  it("updates snapshot name", async () => {
    const snap = makeAudioSnapshot({ id: "asnap-test", name: "Old Name" });
    writeDB(makeDB({ audioSnapshots: [snap] }));

    const req = makeRequest("/api/audio/snapshots/asnap-test", {
      method: "PUT",
      body: { name: "New Name" },
    });
    const res = await PUT(req, { params: { id: "asnap-test" } });
    const data = await res.json();
    expect(data.snapshot.name).toBe("New Name");
  });

  it("updates oscIndex", async () => {
    const snap = makeAudioSnapshot({ id: "asnap-test", oscIndex: 0 });
    writeDB(makeDB({ audioSnapshots: [snap] }));

    const req = makeRequest("/api/audio/snapshots/asnap-test", {
      method: "PUT",
      body: { oscIndex: 5 },
    });
    const res = await PUT(req, { params: { id: "asnap-test" } });
    const data = await res.json();
    expect(data.snapshot.oscIndex).toBe(5);
  });

  it("rejects invalid oscIndex on update", async () => {
    const snap = makeAudioSnapshot({ id: "asnap-test" });
    writeDB(makeDB({ audioSnapshots: [snap] }));

    const req = makeRequest("/api/audio/snapshots/asnap-test", {
      method: "PUT",
      body: { oscIndex: 99 },
    });
    const res = await PUT(req, { params: { id: "asnap-test" } });
    expect(res.status).toBe(400);
  });

  it("returns 500 for unknown snapshot", async () => {
    readDB();
    const req = makeRequest("/api/audio/snapshots/nonexistent", {
      method: "PUT",
      body: { name: "Test" },
    });
    const res = await PUT(req, { params: { id: "nonexistent" } });
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/audio/snapshots/[id]", () => {
  it("deletes a snapshot", async () => {
    const snap = makeAudioSnapshot({ id: "asnap-test" });
    writeDB(makeDB({ audioSnapshots: [snap] }));

    const req = makeRequest("/api/audio/snapshots/asnap-test", { method: "DELETE" });
    const res = await DELETE(req, { params: { id: "asnap-test" } });
    expect(res.status).toBe(200);

    const db = readDB();
    expect(db.audioSnapshots).toHaveLength(0);
  });

  it("returns 500 for unknown snapshot", async () => {
    readDB();
    const req = makeRequest("/api/audio/snapshots/nonexistent", { method: "DELETE" });
    const res = await DELETE(req, { params: { id: "nonexistent" } });
    expect(res.status).toBe(500);
  });
});
