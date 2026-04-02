import eventEmitter from "@/lib/events";
import { readDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const sendUpdate = () => {
        if (closed) return;
        try {
          const db = readDB();
          controller.enqueue(
            encoder.encode(`event: update\ndata: ${JSON.stringify({ filter: db.settings.viewFilter })}\n\n`)
          );
        } catch {
          cleanup();
        }
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (pingInterval) clearInterval(pingInterval);
        eventEmitter.removeListener("update", sendUpdate);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      eventEmitter.on("update", sendUpdate);

      // Detect client disconnect
      req.signal.addEventListener("abort", cleanup, { once: true });

      // Send initial event so client gets current filter on connect
      sendUpdate();

      // Keepalive ping every 30s — detects dead connections
      const pingInterval = setInterval(() => {
        if (closed) {
          clearInterval(pingInterval);
          return;
        }
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          cleanup();
        }
      }, 30000);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      ...getCorsHeaders(req),
    },
  });
}

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
