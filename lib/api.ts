import { getCorsHeaders } from "./cors";

export function withErrorHandling(handler: (req: Request, ctx: any) => Promise<Response>) {
  return async (req: Request, ctx: any) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      console.error(`API error [${req.method} ${req.url}]:`, err);
      const headers = getCorsHeaders(req);
      if (err instanceof SyntaxError || err instanceof TypeError) {
        return Response.json({ error: "Invalid request body" }, { status: 400, headers });
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
      return Response.json({ error: "Internal server error" }, { status: 500, headers: getCorsHeaders(req) });
    }
  };
}
