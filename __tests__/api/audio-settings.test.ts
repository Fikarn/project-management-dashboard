import { describe, it, expect, vi } from "vitest";

vi.mock("node-osc", () => import("../__mocks__/node-osc"));

import { GET, POST } from "@/app/api/audio/settings/route";
import { readDB } from "@/lib/db";
import { makeRequest } from "../helpers/request";

describe("GET /api/audio/settings", () => {
  it("returns default audio settings", async () => {
    readDB();
    const res = await GET(
      new Request("http://localhost/api/audio/settings", { headers: { Origin: "http://localhost:3000" } }),
      {}
    );
    const data = await res.json();
    expect(data.audioSettings.oscEnabled).toBe(false);
    expect(data.audioSettings.oscSendHost).toBe("127.0.0.1");
    expect(data.audioSettings.oscSendPort).toBe(7001);
    expect(data.audioSettings.oscReceivePort).toBe(9001);
  });
});

describe("POST /api/audio/settings", () => {
  it("updates oscSendHost", async () => {
    readDB();
    const req = makeRequest("/api/audio/settings", {
      method: "POST",
      body: { oscSendHost: "192.168.1.50" },
    });
    const res = await POST(req, {});
    const data = await res.json();
    expect(data.audioSettings.oscSendHost).toBe("192.168.1.50");
  });

  it("rejects invalid IP address", async () => {
    readDB();
    const req = makeRequest("/api/audio/settings", {
      method: "POST",
      body: { oscSendHost: "999.999.999.999" },
    });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("oscSendHost");
  });

  it("rejects non-IP, non-localhost host", async () => {
    readDB();
    const req = makeRequest("/api/audio/settings", {
      method: "POST",
      body: { oscSendHost: "example.com" },
    });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
  });

  it("accepts localhost as host", async () => {
    readDB();
    const req = makeRequest("/api/audio/settings", {
      method: "POST",
      body: { oscSendHost: "localhost" },
    });
    const res = await POST(req, {});
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.audioSettings.oscSendHost).toBe("localhost");
  });

  it("rejects invalid send port", async () => {
    readDB();
    const req = makeRequest("/api/audio/settings", {
      method: "POST",
      body: { oscSendPort: 0 },
    });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("oscSendPort");
  });

  it("rejects send port above 65535", async () => {
    readDB();
    const req = makeRequest("/api/audio/settings", {
      method: "POST",
      body: { oscSendPort: 70000 },
    });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
  });

  it("rejects invalid receive port", async () => {
    readDB();
    const req = makeRequest("/api/audio/settings", {
      method: "POST",
      body: { oscReceivePort: -1 },
    });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("oscReceivePort");
  });

  it("accepts valid settings update", async () => {
    readDB();
    const req = makeRequest("/api/audio/settings", {
      method: "POST",
      body: {
        oscEnabled: true,
        oscSendHost: "192.168.1.100",
        oscSendPort: 8001,
        oscReceivePort: 9002,
      },
    });
    const res = await POST(req, {});
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.audioSettings.oscEnabled).toBe(true);
    expect(data.audioSettings.oscSendPort).toBe(8001);
    expect(data.audioSettings.oscReceivePort).toBe(9002);
  });

  it("preserves unmodified settings", async () => {
    readDB();
    const req = makeRequest("/api/audio/settings", {
      method: "POST",
      body: { oscEnabled: true },
    });
    const res = await POST(req, {});
    const data = await res.json();
    // Changed field
    expect(data.audioSettings.oscEnabled).toBe(true);
    // Preserved fields
    expect(data.audioSettings.oscSendHost).toBe("127.0.0.1");
    expect(data.audioSettings.oscSendPort).toBe(7001);
  });
});
