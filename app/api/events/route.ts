import eventEmitter from "@/lib/events";
import { readDB } from "@/lib/db";
import { corsHeaders } from "@/lib/cors";

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
        eventEmitter.removeListener("update", sendUpdate);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      eventEmitter.on("update", sendUpdate);

      // Detect client disconnect
      req.signal.addEventListener("abort", cleanup);

      // Send initial event so client gets current filter on connect
      sendUpdate();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      ...corsHeaders,
    },
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
