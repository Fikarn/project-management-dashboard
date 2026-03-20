import { describe, it, expect, vi } from "vitest";

vi.mock("sacn", () => import("../__mocks__/sacn"));

import { GET, POST } from "@/app/api/lights/route";
import { POST as settingsPOST } from "@/app/api/lights/settings/route";
import { readDB, writeDB } from "@/lib/db";
import { makeRequest } from "../helpers/request";
import { makeDB } from "../helpers/fixtures";
import type { Light } from "@/lib/types";

function makeTestLight(overrides: Partial<Light> = {}): Light {
  return {
    id: `light-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "Test Light",
    type: "astra-bicolor",
    dmxStartAddress: 1,
    intensity: 100,
    cct: 4500,
    on: false,
    order: 0,
    ...overrides,
  };
}

describe("GET /api/lights", () => {
  it("returns empty lights array for fresh db", async () => {
    readDB();
    const res = await GET(new Request("http://localhost/api/lights"), {});
    const data = await res.json();
    expect(data.lights).toEqual([]);
    expect(data.lightingSettings).toBeDefined();
  });

  it("returns existing lights", async () => {
    const light = makeTestLight({ name: "Key Light" });
    writeDB(makeDB({ lights: [light] }));

    const res = await GET(new Request("http://localhost/api/lights"), {});
    const data = await res.json();
    expect(data.lights).toHaveLength(1);
    expect(data.lights[0].name).toBe("Key Light");
  });

  it("includes CORS headers", async () => {
    readDB();
    const res = await GET(new Request("http://localhost/api/lights"), {});
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("POST /api/lights", () => {
  it("creates a light", async () => {
    readDB();
    const req = makeRequest("/api/lights", { method: "POST", body: { name: "Fill Light" } });
    const res = await POST(req, {});
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.light.name).toBe("Fill Light");
    expect(data.light.id).toMatch(/^light-/);
  });

  it("returns 400 for missing name", async () => {
    readDB();
    const req = makeRequest("/api/lights", { method: "POST", body: {} });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    readDB();
    const req = new Request("http://localhost/api/lights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
  });
});

describe("POST /api/lights/settings", () => {
  it("rejects invalid IP address", async () => {
    readDB();
    const req = makeRequest("/api/lights/settings", {
      method: "POST",
      body: { apolloBridgeIp: "999.999.999.999" },
    });
    const res = await settingsPOST(req, {});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid IP");
  });

  it("rejects invalid DMX universe", async () => {
    readDB();
    const req = makeRequest("/api/lights/settings", {
      method: "POST",
      body: { dmxUniverse: 99999 },
    });
    const res = await settingsPOST(req, {});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid DMX universe");
  });

  it("accepts valid settings", async () => {
    readDB();
    const req = makeRequest("/api/lights/settings", {
      method: "POST",
      body: { apolloBridgeIp: "192.168.1.100", dmxUniverse: 2 },
    });
    const res = await settingsPOST(req, {});
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.lightingSettings.apolloBridgeIp).toBe("192.168.1.100");
    expect(data.lightingSettings.dmxUniverse).toBe(2);
  });
});
