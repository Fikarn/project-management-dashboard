import { describe, it, expect } from "vitest";
import { withErrorHandling, withGetHandler } from "@/lib/api";

describe("withErrorHandling", () => {
  it("passes through successful responses", async () => {
    const handler = withErrorHandling(async () => {
      return Response.json({ ok: true });
    });

    const res = await handler(
      new Request("http://localhost/test", { headers: { Origin: "http://localhost:3000" } }),
      {}
    );
    const data = await res.json();
    expect(data).toEqual({ ok: true });
  });

  it("returns 400 for SyntaxError (malformed JSON)", async () => {
    const handler = withErrorHandling(async () => {
      throw new SyntaxError("Unexpected token");
    });

    const res = await handler(
      new Request("http://localhost/test", { headers: { Origin: "http://localhost:3000" } }),
      {}
    );
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Invalid request body");
  });

  it("returns 400 for TypeError (e.g. null body access)", async () => {
    const handler = withErrorHandling(async () => {
      throw new TypeError("Cannot read properties of null");
    });

    const res = await handler(
      new Request("http://localhost/test", { headers: { Origin: "http://localhost:3000" } }),
      {}
    );
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Invalid request body");
  });

  it("returns 500 for unknown errors", async () => {
    const handler = withErrorHandling(async () => {
      throw new Error("Something broke");
    });

    const res = await handler(
      new Request("http://localhost/test", { headers: { Origin: "http://localhost:3000" } }),
      {}
    );
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data.error).toBe("Internal server error");
  });

  it("includes CORS headers on error responses", async () => {
    const handler = withErrorHandling(async () => {
      throw new Error("fail");
    });

    const res = await handler(
      new Request("http://localhost/test", { headers: { Origin: "http://localhost:3000" } }),
      {}
    );
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
  });
});

describe("withGetHandler", () => {
  it("passes through successful responses", async () => {
    const handler = withGetHandler(async () => {
      return Response.json({ data: [1, 2, 3] });
    });

    const res = await handler(
      new Request("http://localhost/test", { headers: { Origin: "http://localhost:3000" } }),
      {}
    );
    const data = await res.json();
    expect(data).toEqual({ data: [1, 2, 3] });
  });

  it("returns 500 for thrown errors", async () => {
    const handler = withGetHandler(async () => {
      throw new Error("DB read failed");
    });

    const res = await handler(
      new Request("http://localhost/test", { headers: { Origin: "http://localhost:3000" } }),
      {}
    );
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data.error).toBe("Internal server error");
  });

  it("includes CORS headers on error responses", async () => {
    const handler = withGetHandler(async () => {
      throw new Error("fail");
    });

    const res = await handler(
      new Request("http://localhost/test", { headers: { Origin: "http://localhost:3000" } }),
      {}
    );
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
  });
});
