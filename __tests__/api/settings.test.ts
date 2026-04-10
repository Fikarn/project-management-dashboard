import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/settings/route";
import { readDB } from "@/lib/db";
import { makeRequest } from "../helpers/request";

describe("GET /api/settings", () => {
  it("returns default settings", async () => {
    readDB(); // initialize

    const res = await GET(new Request("http://localhost/api/settings"), {});
    const data = await res.json();

    expect(data.settings.viewFilter).toBe("all");
    expect(data.settings.sortBy).toBe("manual");
    expect(data.settings.dashboardView).toBe("kanban");
  });
});

describe("POST /api/settings", () => {
  it("updates view filter", async () => {
    readDB();

    const req = makeRequest("/api/settings", {
      method: "POST",
      body: { viewFilter: "todo" },
    });
    const res = await POST(req, {});
    const data = await res.json();

    expect(data.settings.viewFilter).toBe("todo");
  });

  it("updates sort", async () => {
    readDB();

    const req = makeRequest("/api/settings", {
      method: "POST",
      body: { sortBy: "priority" },
    });
    const res = await POST(req, {});
    const data = await res.json();

    expect(data.settings.sortBy).toBe("priority");
  });

  it("rejects invalid filter", async () => {
    readDB();

    const req = makeRequest("/api/settings", {
      method: "POST",
      body: { viewFilter: "nope" },
    });
    const res = await POST(req, {});

    expect(res.status).toBe(400);
  });

  it("rejects invalid sort", async () => {
    readDB();

    const req = makeRequest("/api/settings", {
      method: "POST",
      body: { sortBy: "nope" },
    });
    const res = await POST(req, {});

    expect(res.status).toBe(400);
  });

  it("rejects invalid dashboard view", async () => {
    readDB();

    const req = makeRequest("/api/settings", {
      method: "POST",
      body: { dashboardView: "nope" },
    });
    const res = await POST(req, {});

    expect(res.status).toBe(400);
  });

  it("rejects invalid deck mode", async () => {
    readDB();

    const req = makeRequest("/api/settings", {
      method: "POST",
      body: { deckMode: "nope" },
    });
    const res = await POST(req, {});

    expect(res.status).toBe(400);
  });

  it("preserves unmodified settings", async () => {
    readDB();

    const req = makeRequest("/api/settings", {
      method: "POST",
      body: { viewFilter: "done" },
    });
    const res = await POST(req, {});
    const data = await res.json();

    expect(data.settings.viewFilter).toBe("done");
    expect(data.settings.sortBy).toBe("manual"); // unchanged
  });

  it("accepts audio as dashboard view", async () => {
    readDB();

    const req = makeRequest("/api/settings", {
      method: "POST",
      body: { dashboardView: "audio" },
    });
    const res = await POST(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.settings.dashboardView).toBe("audio");
  });

  it("accepts audio as deck mode", async () => {
    readDB();

    const req = makeRequest("/api/settings", {
      method: "POST",
      body: { deckMode: "audio" },
    });
    const res = await POST(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.settings.deckMode).toBe("audio");
  });
});
