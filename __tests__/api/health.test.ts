import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";

const req = new Request("http://localhost/api/health", {
  headers: { Origin: "http://localhost:3000" },
});

describe("GET /api/health", () => {
  it("returns ok status", async () => {
    const res = await GET(req, {});
    const data = await res.json();

    expect(data.status).toBe("ok");
  });

  it("includes CORS headers", async () => {
    const res = await GET(req, {});
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
  });
});
