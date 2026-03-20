import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns ok status", async () => {
    const res = await GET();
    const data = await res.json();

    expect(data.status).toBe("ok");
  });

  it("includes CORS headers", async () => {
    const res = await GET();
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
