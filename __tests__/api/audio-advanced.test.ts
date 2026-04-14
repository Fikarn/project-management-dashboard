import { describe, it, expect, vi } from "vitest";

vi.mock("node-osc", () => import("../__mocks__/node-osc"));

import { GET as getChannel, PUT as updateChannel, DELETE as deleteChannel } from "@/app/api/audio/[id]/route";
import { POST as updateValue } from "@/app/api/audio/[id]/value/route";
import { POST as reorderChannels } from "@/app/api/audio/reorder/route";
import { POST as sendOsc } from "@/app/api/audio/osc/route";
import { createDefaultAudioChannels } from "@/lib/audio-console";
import { writeDB, readDB } from "@/lib/db";
import { makeRequest } from "../helpers/request";
import { makeDB } from "../helpers/fixtures";

describe("GET /api/audio/[id]", () => {
  it("returns a channel by id", async () => {
    const channels = createDefaultAudioChannels().map((channel) =>
      channel.id === "audio-input-9" ? { ...channel, name: "Mic 1" } : channel
    );
    writeDB(makeDB({ audioChannels: channels }));

    const req = makeRequest("/api/audio/audio-input-9");
    const res = await getChannel(req, { params: { id: "audio-input-9" } });
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
    writeDB(makeDB());

    const req = makeRequest("/api/audio/audio-input-9", { method: "PUT", body: { name: "Lav Mic" } });
    const res = await updateChannel(req, { params: { id: "audio-input-9" } });
    const data = await res.json();

    expect(data.channel.name).toBe("Lav Mic");
  });

  it("returns 400 for empty name", async () => {
    writeDB(makeDB());

    const req = makeRequest("/api/audio/audio-input-9", { method: "PUT", body: { name: "" } });
    const res = await updateChannel(req, { params: { id: "audio-input-9" } });
    expect(res.status).toBe(400);
  });

  it("returns 400 for name exceeding 50 chars", async () => {
    writeDB(makeDB());

    const req = makeRequest("/api/audio/audio-input-9", { method: "PUT", body: { name: "X".repeat(51) } });
    const res = await updateChannel(req, { params: { id: "audio-input-9" } });
    expect(res.status).toBe(400);
  });

  it("preserves fixed identity for playback strips", async () => {
    writeDB(makeDB());

    const req = makeRequest("/api/audio/audio-playback-1-2", {
      method: "PUT",
      body: {
        name: "DAW Mix",
        kind: "hardware-input",
        role: "front-preamp",
        stereo: false,
        oscChannel: 12,
      },
    });
    const res = await updateChannel(req, { params: { id: "audio-playback-1-2" } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.channel).toMatchObject({
      id: "audio-playback-1-2",
      kind: "software-playback",
      role: "playback-pair",
      stereo: true,
      oscChannel: 1,
    });
  });

  it("returns 404 for a missing channel", async () => {
    writeDB(makeDB());

    const req = makeRequest("/api/audio/missing", { method: "PUT", body: { name: "Nope" } });
    const res = await updateChannel(req, { params: { id: "missing" } });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/audio/[id]", () => {
  it("rejects deleting a fixed strip", async () => {
    writeDB(makeDB());

    const req = makeRequest("/api/audio/audio-input-9", { method: "DELETE" });
    const res = await deleteChannel(req, { params: { id: "audio-input-9" } });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("fixed strip layout");
    expect(readDB().audioChannels).toHaveLength(18);
  });

  it("keeps the selection when delete is rejected", async () => {
    writeDB(makeDB());

    const req = makeRequest("/api/audio/audio-input-9", { method: "DELETE" });
    await deleteChannel(req, { params: { id: "audio-input-9" } });

    expect(readDB().audioSettings.selectedChannelId).toBe("audio-input-9");
  });
});

describe("POST /api/audio/[id]/value", () => {
  it("updates front-preamp controls and mix-specific send level", async () => {
    writeDB(makeDB());

    const req = makeRequest("/api/audio/audio-input-9/value", {
      method: "POST",
      body: { gain: 40, fader: 0.8, mute: true, mixTargetId: "audio-mix-phones-a" },
    });
    const res = await updateValue(req, { params: { id: "audio-input-9" } });
    const data = await res.json();

    expect(data.channel.gain).toBe(40);
    expect(data.channel.fader).toBe(0.8);
    expect(data.channel.mute).toBe(true);
    expect(data.channel.mixLevels["audio-mix-phones-a"]).toBe(0.8);
    expect(data.channel.mixLevels["audio-mix-main"]).toBe(0.76);
  });

  it("updates front-preamp specific toggles", async () => {
    writeDB(makeDB());

    const req = makeRequest("/api/audio/audio-input-9/value", {
      method: "POST",
      body: { phantom: true, instrument: true, autoSet: true, phase: true, pad: true },
    });
    const res = await updateValue(req, { params: { id: "audio-input-9" } });
    const data = await res.json();

    expect(data.channel).toMatchObject({
      phantom: true,
      instrument: true,
      autoSet: true,
      phase: true,
      pad: true,
    });
  });

  it("ignores unsupported front-preamp controls on rear line inputs", async () => {
    writeDB(makeDB());

    const req = makeRequest("/api/audio/audio-input-1/value", {
      method: "POST",
      body: { phantom: true, instrument: true, autoSet: true },
    });
    const res = await updateValue(req, { params: { id: "audio-input-1" } });
    const data = await res.json();

    expect(data.channel).toMatchObject({
      phantom: false,
      instrument: false,
      autoSet: false,
    });
  });

  it("ignores unsupported phase changes on playback pairs", async () => {
    writeDB(makeDB());

    const req = makeRequest("/api/audio/audio-playback-1-2/value", {
      method: "POST",
      body: { phase: true },
    });
    const res = await updateValue(req, { params: { id: "audio-playback-1-2" } });
    const data = await res.json();

    expect(data.channel.phase).toBe(false);
  });

  it("returns 400 for invalid gain", async () => {
    writeDB(makeDB());

    const req = makeRequest("/api/audio/audio-input-9/value", {
      method: "POST",
      body: { gain: -1 },
    });
    const res = await updateValue(req, { params: { id: "audio-input-9" } });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid fader", async () => {
    writeDB(makeDB());

    const req = makeRequest("/api/audio/audio-input-9/value", {
      method: "POST",
      body: { fader: 1.5 },
    });
    const res = await updateValue(req, { params: { id: "audio-input-9" } });
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-boolean toggle", async () => {
    writeDB(makeDB());

    const req = makeRequest("/api/audio/audio-input-9/value", {
      method: "POST",
      body: { mute: "yes" },
    });
    const res = await updateValue(req, { params: { id: "audio-input-9" } });
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

  it("returns 404 for an unknown mix target when updating send level", async () => {
    writeDB(makeDB());

    const req = makeRequest("/api/audio/audio-input-9/value", {
      method: "POST",
      body: { fader: 0.9, mixTargetId: "missing-mix" },
    });
    const res = await updateValue(req, { params: { id: "audio-input-9" } });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/audio/reorder", () => {
  it("reorders channels", async () => {
    writeDB(makeDB({ audioChannels: createDefaultAudioChannels() }));

    const req = makeRequest("/api/audio/reorder", {
      method: "POST",
      body: { ids: ["audio-input-10", "audio-input-9"] },
    });
    const res = await reorderChannels(req, {});
    expect(res.status).toBe(200);

    const db = readDB();
    expect(db.audioChannels.find((c) => c.id === "audio-input-10")!.order).toBe(0);
    expect(db.audioChannels.find((c) => c.id === "audio-input-9")!.order).toBe(1);
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
    writeDB(makeDB());

    const req = makeRequest("/api/audio/osc", {
      method: "POST",
      body: { channelId: "audio-input-9", gain: 100 },
    });
    const res = await sendOsc(req, {});
    expect(res.status).toBe(400);
  });

  it("accepts valid OSC send", async () => {
    writeDB(makeDB());

    const req = makeRequest("/api/audio/osc", {
      method: "POST",
      body: { channelId: "audio-input-9", fader: 0.5, mixTargetId: "audio-mix-main" },
    });
    const res = await sendOsc(req, {});
    expect(res.status).toBe(200);
  });
});
