import { describe, it, expect, vi } from "vitest";

vi.mock("node-osc", () => import("../__mocks__/node-osc"));

import { GET as getChannel, PUT as updateChannel, DELETE as deleteChannel } from "@/app/api/audio/[id]/route";
import { POST as updateValue } from "@/app/api/audio/[id]/value/route";
import { POST as reorderChannels } from "@/app/api/audio/reorder/route";
import { POST as sendOsc } from "@/app/api/audio/osc/route";
import { writeDB, readDB } from "@/lib/db";
import { makeRequest } from "../helpers/request";
import { makeDB, makeAudioChannel } from "../helpers/fixtures";

describe("GET /api/audio/[id]", () => {
  it("returns a channel by id", async () => {
    const channel = makeAudioChannel({ id: "ch-1", name: "Mic 1" });
    writeDB(makeDB({ audioChannels: [channel] }));

    const req = makeRequest("/api/audio/ch-1");
    const res = await getChannel(req, { params: { id: "ch-1" } });
    const data = await res.json();

    expect(data.channel.name).toBe("Mic 1");
  });

  it("returns 404 for missing channel", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/audio/nope");
    const res = await getChannel(req, { params: { id: "nope" } });
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/audio/[id]", () => {
  it("updates channel name", async () => {
    const channel = makeAudioChannel({ id: "ch-1" });
    writeDB(makeDB({ audioChannels: [channel] }));

    const req = makeRequest("/api/audio/ch-1", { method: "PUT", body: { name: "Lav Mic" } });
    const res = await updateChannel(req, { params: { id: "ch-1" } });
    const data = await res.json();

    expect(data.channel.name).toBe("Lav Mic");
  });

  it("returns 400 for empty name", async () => {
    const channel = makeAudioChannel({ id: "ch-1" });
    writeDB(makeDB({ audioChannels: [channel] }));

    const req = makeRequest("/api/audio/ch-1", { method: "PUT", body: { name: "" } });
    const res = await updateChannel(req, { params: { id: "ch-1" } });
    expect(res.status).toBe(400);
  });

  it("returns 400 for name exceeding 50 chars", async () => {
    const channel = makeAudioChannel({ id: "ch-1" });
    writeDB(makeDB({ audioChannels: [channel] }));

    const req = makeRequest("/api/audio/ch-1", { method: "PUT", body: { name: "X".repeat(51) } });
    const res = await updateChannel(req, { params: { id: "ch-1" } });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid oscChannel", async () => {
    const channel = makeAudioChannel({ id: "ch-1" });
    writeDB(makeDB({ audioChannels: [channel] }));

    const req = makeRequest("/api/audio/ch-1", { method: "PUT", body: { oscChannel: 0 } });
    const res = await updateChannel(req, { params: { id: "ch-1" } });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/audio/[id]", () => {
  it("deletes a channel", async () => {
    const channel = makeAudioChannel({ id: "ch-1" });
    writeDB(makeDB({ audioChannels: [channel] }));

    const req = makeRequest("/api/audio/ch-1", { method: "DELETE" });
    const res = await deleteChannel(req, { params: { id: "ch-1" } });
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(readDB().audioChannels).toHaveLength(0);
  });

  it("clears selectedChannelId when deleting selected channel", async () => {
    const channel = makeAudioChannel({ id: "ch-1" });
    writeDB(
      makeDB({
        audioChannels: [channel],
        audioSettings: {
          oscEnabled: false,
          oscSendHost: "127.0.0.1",
          oscSendPort: 7001,
          oscReceivePort: 9001,
          selectedChannelId: "ch-1",
        },
      })
    );

    const req = makeRequest("/api/audio/ch-1", { method: "DELETE" });
    await deleteChannel(req, { params: { id: "ch-1" } });

    expect(readDB().audioSettings.selectedChannelId).toBeNull();
  });
});

describe("POST /api/audio/[id]/value", () => {
  it("updates channel values", async () => {
    const channel = makeAudioChannel({ id: "ch-1", fader: 0.5 });
    writeDB(makeDB({ audioChannels: [channel] }));

    const req = makeRequest("/api/audio/ch-1/value", {
      method: "POST",
      body: { fader: 0.8, mute: true },
    });
    const res = await updateValue(req, { params: { id: "ch-1" } });
    const data = await res.json();

    expect(data.channel.fader).toBe(0.8);
    expect(data.channel.mute).toBe(true);
  });

  it("returns 400 for invalid gain", async () => {
    const channel = makeAudioChannel({ id: "ch-1" });
    writeDB(makeDB({ audioChannels: [channel] }));

    const req = makeRequest("/api/audio/ch-1/value", {
      method: "POST",
      body: { gain: -1 },
    });
    const res = await updateValue(req, { params: { id: "ch-1" } });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid fader", async () => {
    const channel = makeAudioChannel({ id: "ch-1" });
    writeDB(makeDB({ audioChannels: [channel] }));

    const req = makeRequest("/api/audio/ch-1/value", {
      method: "POST",
      body: { fader: 1.5 },
    });
    const res = await updateValue(req, { params: { id: "ch-1" } });
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-boolean toggle", async () => {
    const channel = makeAudioChannel({ id: "ch-1" });
    writeDB(makeDB({ audioChannels: [channel] }));

    const req = makeRequest("/api/audio/ch-1/value", {
      method: "POST",
      body: { mute: "yes" },
    });
    const res = await updateValue(req, { params: { id: "ch-1" } });
    expect(res.status).toBe(400);
  });

  it("returns 404 for missing channel", async () => {
    writeDB(makeDB());

    const req = makeRequest("/api/audio/missing/value", {
      method: "POST",
      body: { gain: 10 },
    });
    const res = await updateValue(req, { params: { id: "missing" } });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/audio/reorder", () => {
  it("reorders channels", async () => {
    const ch1 = makeAudioChannel({ id: "ch-1", order: 0 });
    const ch2 = makeAudioChannel({ id: "ch-2", order: 1 });
    writeDB(makeDB({ audioChannels: [ch1, ch2] }));

    const req = makeRequest("/api/audio/reorder", {
      method: "POST",
      body: { ids: ["ch-2", "ch-1"] },
    });
    const res = await reorderChannels(req, {});
    expect(res.status).toBe(200);

    const db = readDB();
    expect(db.audioChannels.find((c) => c.id === "ch-2")!.order).toBe(0);
    expect(db.audioChannels.find((c) => c.id === "ch-1")!.order).toBe(1);
  });

  it("returns 400 for missing ids", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/audio/reorder", { method: "POST", body: {} });
    const res = await reorderChannels(req, {});
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty ids array", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/audio/reorder", { method: "POST", body: { ids: [] } });
    const res = await reorderChannels(req, {});
    expect(res.status).toBe(400);
  });
});

describe("POST /api/audio/osc", () => {
  it("returns 400 for missing channelId", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/audio/osc", { method: "POST", body: { fader: 0.5 } });
    const res = await sendOsc(req, {});
    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent channel", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/audio/osc", { method: "POST", body: { channelId: "nope", fader: 0.5 } });
    const res = await sendOsc(req, {});
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid gain", async () => {
    const channel = makeAudioChannel({ id: "ch-1" });
    writeDB(makeDB({ audioChannels: [channel] }));

    const req = makeRequest("/api/audio/osc", {
      method: "POST",
      body: { channelId: "ch-1", gain: 100 },
    });
    const res = await sendOsc(req, {});
    expect(res.status).toBe(400);
  });

  it("accepts valid OSC send", async () => {
    const channel = makeAudioChannel({ id: "ch-1" });
    writeDB(makeDB({ audioChannels: [channel] }));

    const req = makeRequest("/api/audio/osc", {
      method: "POST",
      body: { channelId: "ch-1", fader: 0.5 },
    });
    const res = await sendOsc(req, {});
    expect(res.status).toBe(200);
  });
});
