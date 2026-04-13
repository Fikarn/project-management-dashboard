import { describe, it, expect, vi } from "vitest";

vi.mock("sacn", () => import("../__mocks__/sacn"));

import { GET as getGroups, POST as createGroup } from "@/app/api/lights/groups/route";
import {
  GET as getGroup,
  PUT as renameGroup,
  DELETE as deleteGroup,
  PATCH as patchGroup,
} from "@/app/api/lights/groups/[id]/route";
import { GET as getScenes, POST as createScene } from "@/app/api/lights/scenes/route";
import { PUT as updateScene, DELETE as deleteScene } from "@/app/api/lights/scenes/[id]/route";
import { writeDB, readDB } from "@/lib/db";
import { makeRequest } from "../helpers/request";
import { makeDB, makeLight } from "../helpers/fixtures";
import type { LightGroup } from "@/lib/types";

function makeGroup(overrides: Partial<LightGroup> = {}): LightGroup {
  return {
    id: `grp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "Test Group",
    order: 0,
    ...overrides,
  };
}

describe("Light Groups CRUD", () => {
  it("GET returns empty groups", async () => {
    readDB();
    const req = makeRequest("/api/lights/groups");
    const res = await getGroups(req, {});
    const data = await res.json();
    expect(data.lightGroups).toEqual([]);
  });

  it("POST creates a group", async () => {
    readDB();
    const req = makeRequest("/api/lights/groups", { method: "POST", body: { name: "Key Lights" } });
    const res = await createGroup(req, {});
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.group.name).toBe("Key Lights");
    expect(data.group.id).toMatch(/^grp-/);
  });

  it("POST returns 400 for empty name", async () => {
    readDB();
    const req = makeRequest("/api/lights/groups", { method: "POST", body: { name: "" } });
    const res = await createGroup(req, {});
    expect(res.status).toBe(400);
  });

  it("GET by id returns group with lights", async () => {
    const group = makeGroup({ id: "grp-1" });
    const light = makeLight({ id: "l-1", groupId: "grp-1" });
    writeDB(makeDB({ lightGroups: [group], lights: [light] }));

    const req = makeRequest("/api/lights/groups/grp-1");
    const res = await getGroup(req, { params: { id: "grp-1" } });
    const data = await res.json();

    expect(data.group.name).toBe("Test Group");
    expect(data.lights).toHaveLength(1);
  });

  it("GET by id returns 404 for missing group", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/lights/groups/nope");
    const res = await getGroup(req, { params: { id: "nope" } });
    expect(res.status).toBe(404);
  });

  it("PUT renames a group", async () => {
    const group = makeGroup({ id: "grp-1" });
    writeDB(makeDB({ lightGroups: [group] }));

    const req = makeRequest("/api/lights/groups/grp-1", { method: "PUT", body: { name: "New Name" } });
    const res = await renameGroup(req, { params: { id: "grp-1" } });
    const data = await res.json();

    expect(data.group.name).toBe("New Name");
  });

  it("DELETE removes group and unassigns lights", async () => {
    const group = makeGroup({ id: "grp-1" });
    const light = makeLight({ id: "l-1", groupId: "grp-1" });
    writeDB(makeDB({ lightGroups: [group], lights: [light] }));

    const req = makeRequest("/api/lights/groups/grp-1", { method: "DELETE" });
    const res = await deleteGroup(req, { params: { id: "grp-1" } });
    const data = await res.json();

    expect(data.deleted).toBe(true);
    const db = readDB();
    expect(db.lightGroups).toHaveLength(0);
    expect(db.lights[0].groupId).toBeNull();
  });

  it("PATCH sets power on group lights", async () => {
    const group = makeGroup({ id: "grp-1" });
    const light = makeLight({ id: "l-1", groupId: "grp-1", on: false });
    writeDB(makeDB({ lightGroups: [group], lights: [light] }));

    const req = makeRequest("/api/lights/groups/grp-1", { method: "PATCH", body: { on: true } });
    const res = await patchGroup(req, { params: { id: "grp-1" } });
    const data = await res.json();

    expect(data.lights[0].on).toBe(true);
  });

  it("PATCH returns 404 for missing group", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/lights/groups/nope", { method: "PATCH", body: { on: true } });
    const res = await patchGroup(req, { params: { id: "nope" } });
    expect(res.status).toBe(404);
  });
});

describe("Light Scenes CRUD", () => {
  it("GET returns empty scenes", async () => {
    readDB();
    const req = makeRequest("/api/lights/scenes");
    const res = await getScenes(req, {});
    const data = await res.json();
    expect(data.scenes).toEqual([]);
  });

  it("POST creates a scene capturing current light states", async () => {
    const light = makeLight({ id: "l-1", intensity: 80, cct: 5600, on: true });
    writeDB(makeDB({ lights: [light] }));

    const req = makeRequest("/api/lights/scenes", { method: "POST", body: { name: "My Scene" } });
    const res = await createScene(req, {});
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.scene.name).toBe("My Scene");
    expect(data.scene.lightStates).toHaveLength(1);
    expect(data.scene.lightStates[0].intensity).toBe(80);
  });

  it("PUT updates scene name", async () => {
    const light = makeLight({ id: "l-1" });
    writeDB(
      makeDB({
        lights: [light],
        lightScenes: [
          {
            id: "scene-1",
            name: "Old",
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

    const req = makeRequest("/api/lights/scenes/scene-1", { method: "PUT", body: { name: "New Name" } });
    const res = await updateScene(req, { params: { id: "scene-1" } });
    const data = await res.json();

    expect(data.scene.name).toBe("New Name");
  });

  it("PUT returns 404 for missing scene", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/lights/scenes/nope", { method: "PUT", body: { name: "X" } });
    const res = await updateScene(req, { params: { id: "nope" } });
    expect(res.status).toBe(404);
  });

  it("DELETE removes a scene", async () => {
    writeDB(
      makeDB({
        lightScenes: [
          {
            id: "scene-1",
            name: "Test",
            lightStates: [],
            createdAt: new Date().toISOString(),
            order: 0,
          },
        ],
      })
    );

    const req = makeRequest("/api/lights/scenes/scene-1", { method: "DELETE" });
    const res = await deleteScene(req, { params: { id: "scene-1" } });
    const data = await res.json();

    expect(data.deleted).toBe(true);
    expect(readDB().lightScenes).toHaveLength(0);
  });

  it("DELETE clears selectedSceneId if active", async () => {
    writeDB(
      makeDB({
        lightScenes: [
          { id: "scene-1", name: "Active", lightStates: [], createdAt: new Date().toISOString(), order: 0 },
        ],
        lightingSettings: {
          apolloBridgeIp: "2.0.0.1",
          dmxUniverse: 1,
          dmxEnabled: false,
          selectedLightId: null,
          selectedSceneId: "scene-1",
          grandMaster: 100,
          cameraMarker: null,
          subjectMarker: null,
        },
      })
    );

    const req = makeRequest("/api/lights/scenes/scene-1", { method: "DELETE" });
    await deleteScene(req, { params: { id: "scene-1" } });

    expect(readDB().lightingSettings.selectedSceneId).toBeNull();
  });
});
