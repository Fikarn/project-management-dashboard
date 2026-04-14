import { describe, it, expect, vi } from "vitest";

vi.mock("node-osc", () => import("../__mocks__/node-osc"));

import { GET, POST } from "@/app/api/audio/route";
import { PUT, DELETE, OPTIONS as channelOptions } from "@/app/api/audio/[id]/route";
import { createDefaultAudioChannels } from "@/lib/audio-console";
import { readDB, writeDB } from "@/lib/db";
import { makeRequest } from "../helpers/request";
import { makeDB } from "../helpers/fixtures";

describe("GET /api/audio", () => {
  it("returns the fixed UFX III console on a fresh db", async () => {
    writeDB(makeDB());
    const res = await GET(
      new Request("http://localhost/api/audio", { headers: { Origin: "http://localhost:3000" } }),
      {}
    );
    const data = await res.json();

    expect(data.audioChannels).toHaveLength(18);
    expect(data.audioChannels[0]).toMatchObject({
      id: "audio-input-9",
      name: "Front 9",
      role: "front-preamp",
      kind: "hardware-input",
    });
    expect(data.audioMixTargets).toHaveLength(3);
    expect(data.audioSnapshots).toEqual([]);
    expect(data.audioSettings).toBeDefined();
    expect(data.audioSettings.selectedChannelId).toBe("audio-input-9");
    expect(data.audioSettings.selectedMixTargetId).toBe("audio-mix-main");
  });

  it("returns relabeled fixed strips", async () => {
    const channels = createDefaultAudioChannels().map((channel) =>
      channel.id === "audio-input-9" ? { ...channel, name: "Presenter", shortName: "PRESENTER" } : channel
    );
    writeDB(makeDB({ audioChannels: channels }));

    const res = await GET(
      new Request("http://localhost/api/audio", { headers: { Origin: "http://localhost:3000" } }),
      {}
    );
    const data = await res.json();

    expect(data.audioChannels).toHaveLength(channels.length);
    expect(data.audioChannels.find((channel: { id: string }) => channel.id === "audio-input-9")).toMatchObject({
      id: "audio-input-9",
      name: "Presenter",
      shortName: "PRESENTER",
    });
  });

  it("includes CORS headers", async () => {
    writeDB(makeDB());
    const res = await GET(
      new Request("http://localhost/api/audio", { headers: { Origin: "http://localhost:3000" } }),
      {}
    );
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
  });
});

describe("POST /api/audio", () => {
  it("relabels a mapped hardware strip", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/audio", { method: "POST", body: { name: "Guest Mic", oscChannel: 9 } });
    const res = await POST(req, {});
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.channel.name).toBe("Guest Mic");
    expect(data.channel).toMatchObject({
      id: "audio-input-9",
      oscChannel: 9,
      role: "front-preamp",
      kind: "hardware-input",
    });
  });

  it("returns 400 for missing name", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/audio", { method: "POST", body: {} });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty name", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/audio", { method: "POST", body: { name: "   " } });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
  });

  it("returns 400 for name exceeding 50 characters", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/audio", { method: "POST", body: { name: "A".repeat(51) } });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("50 characters");
  });

  it("returns 400 for invalid oscChannel", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/audio", { method: "POST", body: { name: "Test", oscChannel: 200 } });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("oscChannel");
  });

  it("returns 400 for oscChannel zero", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/audio", { method: "POST", body: { name: "Test", oscChannel: 0 } });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
  });

  it("defaults oscChannel to line input 1", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/audio", { method: "POST", body: { name: "Test" } });
    const res = await POST(req, {});
    const data = await res.json();
    expect(data.channel).toMatchObject({
      id: "audio-input-1",
      oscChannel: 1,
      name: "Test",
      role: "rear-line",
    });
  });

  it("preserves fixed-strip defaults when relabeling", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/audio", { method: "POST", body: { name: "Test" } });
    const res = await POST(req, {});
    const data = await res.json();

    expect(data.channel.gain).toBe(0);
    expect(data.channel.fader).toBe(0.68);
    expect(data.channel.mute).toBe(false);
  });

  it("returns 400 for invalid JSON", async () => {
    writeDB(makeDB());
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
  it("updates the label for a fixed strip", async () => {
    writeDB(makeDB());

    const req = makeRequest("/api/audio/audio-input-9", { method: "PUT", body: { name: "New Name" } });
    const res = await PUT(req, { params: { id: "audio-input-9" } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.channel).toMatchObject({
      id: "audio-input-9",
      name: "New Name",
      shortName: "NEW NAME",
    });
  });

  it("keeps the fixed hardware mapping even if oscChannel is provided", async () => {
    writeDB(makeDB());

    const req = makeRequest("/api/audio/audio-input-9", {
      method: "PUT",
      body: {
        name: "Anchor Mic",
        oscChannel: 3,
        kind: "software-playback",
        role: "playback-pair",
        stereo: true,
      },
    });
    const res = await PUT(req, { params: { id: "audio-input-9" } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.channel).toMatchObject({
      id: "audio-input-9",
      oscChannel: 9,
      kind: "hardware-input",
      role: "front-preamp",
      stereo: false,
    });
  });

  it("returns 404 for unknown channel", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/audio/nonexistent", { method: "PUT", body: { name: "Test" } });
    const res = await PUT(req, { params: { id: "nonexistent" } });
    expect(res.status).toBe(404);
  });

  it("rejects empty name", async () => {
    writeDB(makeDB());

    const req = makeRequest("/api/audio/audio-input-9", { method: "PUT", body: { name: "" } });
    const res = await PUT(req, { params: { id: "audio-input-9" } });
    expect(res.status).toBe(400);
  });

  it("rejects names over 50 characters on update", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/audio/audio-input-9", { method: "PUT", body: { name: "A".repeat(51) } });
    const res = await PUT(req, { params: { id: "audio-input-9" } });
    expect(res.status).toBe(400);
  });

  it("uses an explicit shortName when provided", async () => {
    writeDB(makeDB());

    const req = makeRequest("/api/audio/audio-input-9", {
      method: "PUT",
      body: { name: "Presenter Mic", shortName: "pstmic9" },
    });
    const res = await PUT(req, { params: { id: "audio-input-9" } });
    const data = await res.json();

    expect(data.channel.shortName).toBe("PSTMIC9");
  });
});

describe("OPTIONS /api/audio/[id]", () => {
  it("returns a 204 preflight response", async () => {
    const req = new Request("http://localhost/api/audio/audio-input-9", {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:3000" },
    });
    const res = channelOptions(req);

    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
  });
});

describe("DELETE /api/audio/[id]", () => {
  it("returns a fixed-layout guardrail instead of deleting a strip", async () => {
    writeDB(makeDB());

    const req = makeRequest("/api/audio/audio-input-9", { method: "DELETE" });
    const res = await DELETE(req, { params: { id: "audio-input-9" } });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("fixed strip layout");

    const db = readDB();
    expect(db.audioChannels).toHaveLength(18);
    expect(db.audioChannels.some((channel) => channel.id === "audio-input-9")).toBe(true);
  });

  it("keeps the selected strip when deletion is rejected", async () => {
    writeDB(makeDB());

    const req = makeRequest("/api/audio/audio-input-9", { method: "DELETE" });
    await DELETE(req, { params: { id: "audio-input-9" } });

    const db = readDB();
    expect(db.audioSettings.selectedChannelId).toBe("audio-input-9");
  });

  it("returns the same guardrail for unknown strip ids", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/audio/nonexistent", { method: "DELETE" });
    const res = await DELETE(req, { params: { id: "nonexistent" } });
    expect(res.status).toBe(400);
  });
});
