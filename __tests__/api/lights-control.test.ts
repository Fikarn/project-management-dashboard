import { describe, it, expect, vi } from "vitest";

vi.mock("sacn", () => import("../__mocks__/sacn"));

import { POST as updateValue } from "@/app/api/lights/[id]/value/route";
import { POST as setEffect } from "@/app/api/lights/[id]/effect/route";
import { DELETE as deleteLight } from "@/app/api/lights/[id]/route";
import { POST as allLights } from "@/app/api/lights/all/route";
import { POST as sendDmx } from "@/app/api/lights/dmx/route";
import { writeDB, readDB } from "@/lib/db";
import { makeRequest } from "../helpers/request";
import { makeDB, makeLight } from "../helpers/fixtures";

describe("POST /api/lights/[id]/value", () => {
  it("updates light intensity and persists", async () => {
    const light = makeLight({ id: "l-1", intensity: 50, on: true });
    writeDB(makeDB({ lights: [light] }));

    const req = makeRequest("/api/lights/l-1/value", {
      method: "POST",
      body: { intensity: 80 },
    });
    const res = await updateValue(req, { params: { id: "l-1" } });
    const data = await res.json();

    expect(data.light.intensity).toBe(80);
    expect(readDB().lights[0].intensity).toBe(80);
  });

  it("clamps intensity to 0-100", async () => {
    const light = makeLight({ id: "l-1" });
    writeDB(makeDB({ lights: [light] }));

    const req = makeRequest("/api/lights/l-1/value", {
      method: "POST",
      body: { intensity: 150 },
    });
    const res = await updateValue(req, { params: { id: "l-1" } });
    const data = await res.json();
    expect(data.light.intensity).toBe(100);
  });

  it("clamps CCT to type range", async () => {
    // astra-bicolor CCT range is 3200-5600
    const light = makeLight({ id: "l-1", type: "astra-bicolor" });
    writeDB(makeDB({ lights: [light] }));

    const req = makeRequest("/api/lights/l-1/value", {
      method: "POST",
      body: { cct: 10000 },
    });
    const res = await updateValue(req, { params: { id: "l-1" } });
    const data = await res.json();
    expect(data.light.cct).toBe(5600);
  });

  it("returns 404 for missing light", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/lights/nope/value", {
      method: "POST",
      body: { intensity: 50 },
    });
    const res = await updateValue(req, { params: { id: "nope" } });
    expect(res.status).toBe(404);
  });

  it("updates color mode", async () => {
    const light = makeLight({ id: "l-1" });
    writeDB(makeDB({ lights: [light] }));

    const req = makeRequest("/api/lights/l-1/value", {
      method: "POST",
      body: { colorMode: "rgb", red: 255, green: 128, blue: 0 },
    });
    const res = await updateValue(req, { params: { id: "l-1" } });
    const data = await res.json();

    expect(data.light.colorMode).toBe("rgb");
    expect(data.light.red).toBe(255);
    expect(data.light.green).toBe(128);
  });

  it("updates gmTint and handles null", async () => {
    const light = makeLight({ id: "l-1", gmTint: 50 });
    writeDB(makeDB({ lights: [light] }));

    const req = makeRequest("/api/lights/l-1/value", {
      method: "POST",
      body: { gmTint: null },
    });
    const res = await updateValue(req, { params: { id: "l-1" } });
    const data = await res.json();
    expect(data.light.gmTint).toBeNull();
  });
});

describe("POST /api/lights/[id]/effect", () => {
  it("sets an effect on a light", async () => {
    const light = makeLight({ id: "l-1", on: true });
    writeDB(makeDB({ lights: [light] }));

    const req = makeRequest("/api/lights/l-1/effect", {
      method: "POST",
      body: { effect: { type: "pulse", speed: 5 } },
    });
    const res = await setEffect(req, { params: { id: "l-1" } });
    const data = await res.json();

    expect(data.light.effect).toEqual({ type: "pulse", speed: 5 });
  });

  it("clears an effect with null", async () => {
    const light = makeLight({ id: "l-1", effect: { type: "strobe", speed: 3 } });
    writeDB(makeDB({ lights: [light] }));

    const req = makeRequest("/api/lights/l-1/effect", {
      method: "POST",
      body: { effect: null },
    });
    const res = await setEffect(req, { params: { id: "l-1" } });
    const data = await res.json();

    expect(data.light.effect).toBeNull();
  });

  it("returns 400 for invalid effect type", async () => {
    const light = makeLight({ id: "l-1" });
    writeDB(makeDB({ lights: [light] }));

    const req = makeRequest("/api/lights/l-1/effect", {
      method: "POST",
      body: { effect: { type: "rainbow", speed: 5 } },
    });
    const res = await setEffect(req, { params: { id: "l-1" } });
    expect(res.status).toBe(400);
  });

  it("returns 404 for missing light", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/lights/nope/effect", {
      method: "POST",
      body: { effect: null },
    });
    const res = await setEffect(req, { params: { id: "nope" } });
    expect(res.status).toBe(404);
  });

  it("clamps speed to 1-10", async () => {
    const light = makeLight({ id: "l-1" });
    writeDB(makeDB({ lights: [light] }));

    const req = makeRequest("/api/lights/l-1/effect", {
      method: "POST",
      body: { effect: { type: "candle", speed: 99 } },
    });
    const res = await setEffect(req, { params: { id: "l-1" } });
    const data = await res.json();
    expect(data.light.effect.speed).toBe(10);
  });
});

describe("DELETE /api/lights/[id]", () => {
  it("deletes a light and cleans up scenes", async () => {
    const light = makeLight({ id: "l-1", name: "Key" });
    writeDB(
      makeDB({
        lights: [light],
        lightScenes: [
          {
            id: "scene-1",
            name: "Test Scene",
            lightStates: [
              {
                lightId: "l-1",
                intensity: 100,
                cct: 4400,
                on: true,
                red: 0,
                green: 0,
                blue: 0,
                colorMode: "cct" as const,
                gmTint: 0,
              },
            ],
            createdAt: new Date().toISOString(),
            order: 0,
          },
        ],
      })
    );

    const req = makeRequest("/api/lights/l-1", { method: "DELETE" });
    const res = await deleteLight(req, { params: { id: "l-1" } });
    const data = await res.json();

    expect(data.deleted).toBe(true);
    const db = readDB();
    expect(db.lights).toHaveLength(0);
    expect(db.lightScenes[0].lightStates).toHaveLength(0);
  });

  it("clears selectedLightId when deleting selected light", async () => {
    const light = makeLight({ id: "l-1" });
    writeDB(
      makeDB({
        lights: [light],
        lightingSettings: {
          apolloBridgeIp: "2.0.0.1",
          dmxUniverse: 1,
          dmxEnabled: false,
          selectedLightId: "l-1",
          selectedSceneId: null,
          grandMaster: 100,
          cameraMarker: null,
          subjectMarker: null,
        },
      })
    );

    const req = makeRequest("/api/lights/l-1", { method: "DELETE" });
    await deleteLight(req, { params: { id: "l-1" } });

    expect(readDB().lightingSettings.selectedLightId).toBeNull();
  });
});

describe("POST /api/lights/all", () => {
  it("turns all lights on", async () => {
    const l1 = makeLight({ id: "l-1", on: false });
    const l2 = makeLight({ id: "l-2", on: false });
    writeDB(makeDB({ lights: [l1, l2] }));

    const req = makeRequest("/api/lights/all", { method: "POST", body: { on: true } });
    const res = await allLights(req, {});
    const data = await res.json();

    expect(data.ok).toBe(true);
    expect(data.on).toBe(true);
    expect(readDB().lights.every((l) => l.on)).toBe(true);
  });

  it("turns all lights off", async () => {
    const l1 = makeLight({ id: "l-1", on: true });
    writeDB(makeDB({ lights: [l1] }));

    const req = makeRequest("/api/lights/all", { method: "POST", body: { on: false } });
    const res = await allLights(req, {});
    const data = await res.json();

    expect(data.on).toBe(false);
    expect(readDB().lights.every((l) => !l.on)).toBe(true);
  });

  it("rejects non-boolean on payloads", async () => {
    const light = makeLight({ id: "l-1", on: true });
    writeDB(makeDB({ lights: [light] }));

    const req = makeRequest("/api/lights/all", { method: "POST", body: { on: "yes" } });
    const res = await allLights(req, {});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("on");
  });
});

describe("POST /api/lights/dmx (live send)", () => {
  it("accepts valid DMX live send", async () => {
    const light = makeLight({ id: "l-1", on: true });
    writeDB(makeDB({ lights: [light] }));

    const req = makeRequest("/api/lights/dmx", {
      method: "POST",
      body: { lightId: "l-1", intensity: 75 },
    });
    const res = await sendDmx(req, {});
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("returns 400 for missing lightId", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/lights/dmx", {
      method: "POST",
      body: { intensity: 50 },
    });
    const res = await sendDmx(req, {});
    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent light", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/lights/dmx", {
      method: "POST",
      body: { lightId: "nope", intensity: 50 },
    });
    const res = await sendDmx(req, {});
    expect(res.status).toBe(404);
  });
});
