import { getCorsHeaders } from "./cors";
import { DiskFullError } from "./db";

export function withErrorHandling(handler: (req: Request, ctx: any) => Promise<Response>) {
  return async (req: Request, ctx: any) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      console.error(`API error [${req.method} ${req.url}]:`, err);
      const headers = getCorsHeaders(req);
      if (err instanceof SyntaxError) {
        return Response.json({ error: "Invalid request body" }, { status: 400, headers });
      }
      if (err instanceof DiskFullError) {
        return Response.json({ error: err.message }, { status: 507, headers });
      }
      return Response.json({ error: "Internal server error" }, { status: 500, headers });
    }
  };
}

export function withGetHandler(handler: (req: Request, ctx: any) => Promise<Response>) {
  return async (req: Request, ctx: any) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      console.error(`API error [${req.method} ${req.url}]:`, err);
      const headers = getCorsHeaders(req);
      if (err instanceof DiskFullError) {
        return Response.json({ error: err.message }, { status: 507, headers });
      }
      return Response.json({ error: "Internal server error" }, { status: 500, headers });
    }
  };
}
