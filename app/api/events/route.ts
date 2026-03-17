import eventEmitter from "@/lib/events";
import { getViewFilter } from "@/lib/view-state";
import { corsHeaders } from "@/lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial state immediately on connect
      const sendUpdate = () => {
        try {
          const filter = getViewFilter();
          controller.enqueue(
            encoder.encode(
              `event: update\ndata: ${JSON.stringify({ filter })}\n\n`
            )
          );
        } catch {
          cleanup();
        }
      };

      const cleanup = () => {
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
