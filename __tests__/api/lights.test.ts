import { describe, it, expect, vi } from "vitest";

vi.mock("sacn", () => import("../__mocks__/sacn"));

import { GET, POST } from "@/app/api/lights/route";
import { PUT } from "@/app/api/lights/[id]/route";
import { POST as settingsPOST } from "@/app/api/lights/settings/route";
import { readDB, writeDB } from "@/lib/db";
import { makeRequest } from "../helpers/request";
import { makeDB, makeLight } from "../helpers/fixtures";
import type { Light } from "@/lib/types";

function makeTestLight(overrides: Partial<Light> = {}): Light {
  return makeLight({ cct: 4500, ...overrides });
}

describe("GET /api/lights", () => {
  it("returns empty lights array for fresh db", async () => {
    readDB();
    const res = await GET(
      new Request("http://localhost/api/lights", { headers: { Origin: "http://localhost:3000" } }),
      {}
    );
    const data = await res.json();
    expect(data.lights).toEqual([]);
    expect(data.lightingSettings).toBeDefined();
  });

  it("returns existing lights", async () => {
    const light = makeTestLight({ name: "Key Light" });
    writeDB(makeDB({ lights: [light] }));

    const res = await GET(
      new Request("http://localhost/api/lights", { headers: { Origin: "http://localhost:3000" } }),
      {}
    );
    const data = await res.json();
    expect(data.lights).toHaveLength(1);
    expect(data.lights[0].name).toBe("Key Light");
  });

  it("includes CORS headers", async () => {
    readDB();
    const res = await GET(
      new Request("http://localhost/api/lights", { headers: { Origin: "http://localhost:3000" } }),
      {}
    );
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
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

describe("POST /api/lights - validation", () => {
  it("rejects invalid light type", async () => {
    readDB();
    const req = makeRequest("/api/lights", { method: "POST", body: { name: "Test", type: "foobar" } });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid light type");
  });

  it("rejects DMX address below 1", async () => {
    readDB();
    const req = makeRequest("/api/lights", { method: "POST", body: { name: "Test", dmxStartAddress: 0 } });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("DMX start address");
  });

  it("rejects DMX address that would overflow 512 channels", async () => {
    readDB();
    // infinibar-pb12 uses 8 channels, so max start address is 505
    const req = makeRequest("/api/lights", {
      method: "POST",
      body: { name: "Test", type: "infinibar-pb12", dmxStartAddress: 510 },
    });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("DMX start address");
  });

  it("accepts valid DMX address at boundary", async () => {
    readDB();
    // astra-bicolor uses 2 channels, max start = 511
    const req = makeRequest("/api/lights", {
      method: "POST",
      body: { name: "Test", type: "astra-bicolor", dmxStartAddress: 511 },
    });
    const res = await POST(req, {});
    expect(res.status).toBe(201);
  });

  it("rejects overlapping DMX addresses", async () => {
    // Create a light at address 1 with 2 channels (astra-bicolor)
    const existing = makeLight({ name: "Key", dmxStartAddress: 1, type: "astra-bicolor" });
    writeDB(makeDB({ lights: [existing] }));

    // Try to create another light at address 2 (overlaps with channel 2 of first light)
    const req = makeRequest("/api/lights", {
      method: "POST",
      body: { name: "Fill", type: "astra-bicolor", dmxStartAddress: 2 },
    });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("overlaps");
    expect(data.error).toContain("Key");
  });

  it("accepts non-overlapping DMX addresses", async () => {
    const existing = makeLight({ name: "Key", dmxStartAddress: 1, type: "astra-bicolor" });
    writeDB(makeDB({ lights: [existing] }));

    // Address 3 is fine (astra-bicolor uses channels 1-2)
    const req = makeRequest("/api/lights", {
      method: "POST",
      body: { name: "Fill", type: "astra-bicolor", dmxStartAddress: 3 },
    });
    const res = await POST(req, {});
    expect(res.status).toBe(201);
  });

  it("defaults type to astra-bicolor when omitted", async () => {
    readDB();
    const req = makeRequest("/api/lights", { method: "POST", body: { name: "Test" } });
    const res = await POST(req, {});
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.light.type).toBe("astra-bicolor");
  });
});

describe("PUT /api/lights/[id] - validation", () => {
  it("rejects invalid DMX address on update", async () => {
    const light = makeLight({ id: "light-test", dmxStartAddress: 1 });
    writeDB(makeDB({ lights: [light] }));

    const req = makeRequest("/api/lights/light-test", {
      method: "PUT",
      body: { dmxStartAddress: -1 },
    });
    const res = await PUT(req, { params: { id: "light-test" } });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("DMX start address");
  });

  it("rejects overlapping DMX address on update", async () => {
    const light1 = makeLight({ id: "light-1", name: "Key", dmxStartAddress: 1 });
    const light2 = makeLight({ id: "light-2", name: "Fill", dmxStartAddress: 3 });
    writeDB(makeDB({ lights: [light1, light2] }));

    const req = makeRequest("/api/lights/light-2", {
      method: "PUT",
      body: { dmxStartAddress: 1 },
    });
    const res = await PUT(req, { params: { id: "light-2" } });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("overlaps");
  });

  it("rejects invalid light type on update", async () => {
    const light = makeLight({ id: "light-test", dmxStartAddress: 1 });
    writeDB(makeDB({ lights: [light] }));

    const req = makeRequest("/api/lights/light-test", {
      method: "PUT",
      body: { type: "invalid-type" },
    });
    const res = await PUT(req, { params: { id: "light-test" } });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid light type");
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
