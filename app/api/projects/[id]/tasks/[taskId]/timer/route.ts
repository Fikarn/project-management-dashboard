import { mutateDB } from "@/lib/db";
import eventEmitter from "@/lib/events";
import { corsHeaders } from "@/lib/cors";

export async function POST(
  req: Request,
  { params }: { params: { id: string; taskId: string } }
) {
  const { taskId } = params;
  const body = await req.json();
  const action: string = body.action;

  if (action !== "start" && action !== "stop") {
    return Response.json(
      { error: "Invalid action. Must be 'start' or 'stop'." },
      { status: 400, headers: corsHeaders }
    );
  }

  const db = await mutateDB((db) => ({
    ...db,
    tasks: db.tasks.map((t) => {
      if (t.id !== taskId) return t;

      if (action === "start") {
        return {
          ...t,
          isRunning: true,
          lastStarted: new Date().toISOString(),
        };
      } else {
        const elapsed =
          t.lastStarted
            ? Math.floor((Date.now() - new Date(t.lastStarted).getTime()) / 1000)
            : 0;
        return {
          ...t,
          isRunning: false,
          totalSeconds: t.totalSeconds + elapsed,
          lastStarted: null,
        };
      }
    }),
  }));

  eventEmitter.emit("update");

  const task = db.tasks.find((t) => t.id === taskId) ?? null;
  return Response.json({ task }, { headers: corsHeaders });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
