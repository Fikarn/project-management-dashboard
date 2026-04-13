import { getCorsHeaders } from "./cors";
import { DiskFullError } from "./db";
import type { RouteContext } from "./types";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(status: number, message: string, code = "API_ERROR", details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(400, message, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(404, message, "NOT_FOUND", details);
    this.name = "NotFoundError";
  }
}

function withCorsHeaders(req: Request, init: ResponseInit = {}): ResponseInit {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(getCorsHeaders(req))) {
    headers.set(key, value);
  }
  return { ...init, headers };
}

export function jsonResponse(req: Request, body: unknown, init: ResponseInit = {}): Response {
  return Response.json(body, withCorsHeaders(req, init));
}

export function errorResponse(
  req: Request,
  status: number,
  error: string,
  code = "API_ERROR",
  details?: Record<string, unknown>
): Response {
  const payload: Record<string, unknown> = { error, code };
  if (details !== undefined) {
    payload.details = details;
  }
  return jsonResponse(req, payload, { status });
}

export async function parseJsonObject(req: Request): Promise<Record<string, unknown>> {
  const body = await req.json();
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ValidationError("Request body must be a JSON object", {
      received: body === null ? "null" : Array.isArray(body) ? "array" : typeof body,
    });
  }
  return body as Record<string, unknown>;
}

export function getRequiredString(body: Record<string, unknown>, key: string, label = key): string {
  const value = body[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${label} is required`, { field: key });
  }
  return value.trim();
}

export function getOptionalString(body: Record<string, unknown>, key: string, label = key): string | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new ValidationError(`${label} must be a string`, { field: key });
  }
  return value.trim();
}

export function getOptionalNullableString(
  body: Record<string, unknown>,
  key: string,
  label = key
): string | null | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new ValidationError(`${label} must be a string or null`, { field: key });
  }
  return value.trim();
}

export function getOptionalBoolean(body: Record<string, unknown>, key: string, label = key): boolean | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new ValidationError(`${label} must be a boolean`, { field: key });
  }
  return value;
}

export function getOptionalNumber(body: Record<string, unknown>, key: string, label = key): number | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ValidationError(`${label} must be a number`, { field: key });
  }
  return value;
}

export function getOptionalStringArray(body: Record<string, unknown>, key: string, label = key): string[] | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new ValidationError(`${label} must be an array of strings`, { field: key });
  }
  return value.map((entry) => entry.trim());
}

export function getOptionalEnum<T extends string>(
  body: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
  label = key
): T | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new ValidationError(`Invalid ${label}. Must be one of: ${allowed.join(", ")}`, {
      field: key,
      allowed,
    });
  }
  return value as T;
}

function mapErrorToResponse(req: Request, err: unknown): Response {
  if (err instanceof ApiError) {
    return errorResponse(req, err.status, err.message, err.code, err.details);
  }
  if (err instanceof SyntaxError) {
    return errorResponse(req, 400, "Invalid request body", "INVALID_JSON");
  }
  if (err instanceof DiskFullError) {
    return errorResponse(req, 507, err.message, "DISK_FULL");
  }
  return errorResponse(req, 500, "Internal server error", "INTERNAL_SERVER_ERROR");
}

export function withErrorHandling<C = RouteContext>(handler: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      console.error(`API error [${req.method} ${req.url}]:`, err);
      return mapErrorToResponse(req, err);
    }
  };
}

export function withGetHandler<C = RouteContext>(handler: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      console.error(`API error [${req.method} ${req.url}]:`, err);
      return mapErrorToResponse(req, err);
    }
  };
}
