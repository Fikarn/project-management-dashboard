import { describe, it, expect, vi } from "vitest";

vi.mock("node-osc", () => import("../__mocks__/node-osc"));

import { GET, POST } from "@/app/api/audio/route";
import { PUT, DELETE } from "@/app/api/audio/[id]/route";
import { readDB, writeDB } from "@/lib/db";
import { makeRequest } from "../helpers/request";
import { makeDB, makeAudioChannel } from "../helpers/fixtures";

describe("GET /api/audio", () => {
  it("returns empty arrays for fresh db", async () => {
    readDB();
    const res = await GET(
      new Request("http://localhost/api/audio", { headers: { Origin: "http://localhost:3000" } }),
      {}
    );
    const data = await res.json();
    expect(data.audioChannels).toEqual([]);
    expect(data.audioSnapshots).toEqual([]);
    expect(data.audioSettings).toBeDefined();
  });

  it("returns existing channels", async () => {
    const ch = makeAudioChannel({ name: "Presenter" });
    writeDB(makeDB({ audioChannels: [ch] }));

    const res = await GET(
      new Request("http://localhost/api/audio", { headers: { Origin: "http://localhost:3000" } }),
      {}
    );
    const data = await res.json();
    expect(data.audioChannels).toHaveLength(1);
    expect(data.audioChannels[0].name).toBe("Presenter");
  });

  it("includes CORS headers", async () => {
    readDB();
    const res = await GET(
      new Request("http://localhost/api/audio", { headers: { Origin: "http://localhost:3000" } }),
      {}
    );
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
  });
});

describe("POST /api/audio", () => {
  it("creates a channel", async () => {
    readDB();
    const req = makeRequest("/api/audio", { method: "POST", body: { name: "Guest Mic" } });
    const res = await POST(req, {});
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.channel.name).toBe("Guest Mic");
    expect(data.channel.id).toMatch(/^audio-ch-/);
  });

  it("returns 400 for missing name", async () => {
    readDB();
    const req = makeRequest("/api/audio", { method: "POST", body: {} });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty name", async () => {
    readDB();
    const req = makeRequest("/api/audio", { method: "POST", body: { name: "   " } });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
  });

  it("returns 400 for name exceeding 50 characters", async () => {
    readDB();
    const req = makeRequest("/api/audio", { method: "POST", body: { name: "A".repeat(51) } });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("50 characters");
  });

  it("returns 400 for invalid oscChannel", async () => {
    readDB();
    const req = makeRequest("/api/audio", { method: "POST", body: { name: "Test", oscChannel: 200 } });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("oscChannel");
  });

  it("returns 400 for oscChannel zero", async () => {
    readDB();
    const req = makeRequest("/api/audio", { method: "POST", body: { name: "Test", oscChannel: 0 } });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
  });

  it("defaults oscChannel to 1", async () => {
    readDB();
    const req = makeRequest("/api/audio", { method: "POST", body: { name: "Test" } });
    const res = await POST(req, {});
    const data = await res.json();
    expect(data.channel.oscChannel).toBe(1);
  });

  it("defaults gain and fader values", async () => {
    readDB();
    const req = makeRequest("/api/audio", { method: "POST", body: { name: "Test" } });
    const res = await POST(req, {});
    const data = await res.json();
    expect(data.channel.gain).toBe(0);
    expect(data.channel.fader).toBe(0.75);
    expect(data.channel.mute).toBe(false);
  });

  it("returns 400 for invalid JSON", async () => {
    readDB();
    const req = new Request("http://localhost/api/audio", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
      body: "not json",
    });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/audio/[id]", () => {
  it("updates channel name", async () => {
    const ch = makeAudioChannel({ id: "audio-ch-test", name: "Old" });
    writeDB(makeDB({ audioChannels: [ch] }));

    const req = makeRequest("/api/audio/audio-ch-test", { method: "PUT", body: { name: "New Name" } });
    const res = await PUT(req, { params: { id: "audio-ch-test" } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.channel.name).toBe("New Name");
  });

  it("updates oscChannel", async () => {
    const ch = makeAudioChannel({ id: "audio-ch-test", oscChannel: 1 });
    writeDB(makeDB({ audioChannels: [ch] }));

    const req = makeRequest("/api/audio/audio-ch-test", { method: "PUT", body: { oscChannel: 3 } });
    const res = await PUT(req, { params: { id: "audio-ch-test" } });
    const data = await res.json();
    expect(data.channel.oscChannel).toBe(3);
  });

  it("returns 500 for unknown channel", async () => {
    readDB();
    const req = makeRequest("/api/audio/nonexistent", { method: "PUT", body: { name: "Test" } });
    const res = await PUT(req, { params: { id: "nonexistent" } });
    expect(res.status).toBe(500); // NOT_FOUND thrown inside mutateDB → caught by withErrorHandling
  });

  it("rejects empty name", async () => {
    const ch = makeAudioChannel({ id: "audio-ch-test" });
    writeDB(makeDB({ audioChannels: [ch] }));

    const req = makeRequest("/api/audio/audio-ch-test", { method: "PUT", body: { name: "" } });
    const res = await PUT(req, { params: { id: "audio-ch-test" } });
    expect(res.status).toBe(400);
  });

  it("rejects invalid oscChannel on update", async () => {
    const ch = makeAudioChannel({ id: "audio-ch-test" });
    writeDB(makeDB({ audioChannels: [ch] }));

    const req = makeRequest("/api/audio/audio-ch-test", { method: "PUT", body: { oscChannel: 200 } });
    const res = await PUT(req, { params: { id: "audio-ch-test" } });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/audio/[id]", () => {
  it("deletes a channel", async () => {
    const ch = makeAudioChannel({ id: "audio-ch-test" });
    writeDB(makeDB({ audioChannels: [ch] }));

    const req = makeRequest("/api/audio/audio-ch-test", { method: "DELETE" });
    const res = await DELETE(req, { params: { id: "audio-ch-test" } });
    expect(res.status).toBe(200);

    const db = readDB();
    expect(db.audioChannels).toHaveLength(0);
  });

  it("clears selectedChannelId when deleting selected channel", async () => {
    const ch = makeAudioChannel({ id: "audio-ch-test" });
    writeDB(
      makeDB({
        audioChannels: [ch],
        audioSettings: {
          oscEnabled: false,
          oscSendHost: "127.0.0.1",
          oscSendPort: 7001,
          oscReceivePort: 9001,
          selectedChannelId: "audio-ch-test",
        },
      })
    );

    const req = makeRequest("/api/audio/audio-ch-test", { method: "DELETE" });
    await DELETE(req, { params: { id: "audio-ch-test" } });

    const db = readDB();
    expect(db.audioSettings.selectedChannelId).toBeNull();
  });

  it("returns 500 for unknown channel", async () => {
    readDB();
    const req = makeRequest("/api/audio/nonexistent", { method: "DELETE" });
    const res = await DELETE(req, { params: { id: "nonexistent" } });
    expect(res.status).toBe(500);
  });
});
