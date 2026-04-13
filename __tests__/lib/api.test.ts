import { describe, it, expect } from "vitest";
import { ValidationError, parseJsonObject, withErrorHandling, withGetHandler } from "@/lib/api";
import { DiskFullError } from "@/lib/db";

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

  it("returns 500 for TypeError (application bug, not bad input)", async () => {
    const handler = withErrorHandling(async () => {
      throw new TypeError("Cannot read properties of null");
    });

    const res = await handler(
      new Request("http://localhost/test", { headers: { Origin: "http://localhost:3000" } }),
      {}
    );
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data.error).toBe("Internal server error");
  });

  it("returns 507 for DiskFullError", async () => {
    const handler = withErrorHandling(async () => {
      throw new DiskFullError();
    });

    const res = await handler(
      new Request("http://localhost/test", { headers: { Origin: "http://localhost:3000" } }),
      {}
    );
    expect(res.status).toBe(507);

    const data = await res.json();
    expect(data.error).toBe("Disk full: unable to save data");
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

  it("returns ApiError status and code for validation failures", async () => {
    const handler = withErrorHandling(async () => {
      throw new ValidationError("title is required", { field: "title" });
    });

    const res = await handler(
      new Request("http://localhost/test", { headers: { Origin: "http://localhost:3000" } }),
      {}
    );
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("title is required");
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.details).toEqual({ field: "title" });
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

  it("returns 507 for DiskFullError", async () => {
    const handler = withGetHandler(async () => {
      throw new DiskFullError();
    });

    const res = await handler(
      new Request("http://localhost/test", { headers: { Origin: "http://localhost:3000" } }),
      {}
    );
    expect(res.status).toBe(507);

    const data = await res.json();
    expect(data.error).toBe("Disk full: unable to save data");
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

describe("parseJsonObject", () => {
  it("returns parsed object bodies", async () => {
    const req = new Request("http://localhost/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hello: "world" }),
    });

    await expect(parseJsonObject(req)).resolves.toEqual({ hello: "world" });
  });

  it("rejects non-object bodies", async () => {
    const req = new Request("http://localhost/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(["not", "an", "object"]),
    });

    await expect(parseJsonObject(req)).rejects.toThrow("Request body must be a JSON object");
  });
});
