import { mutateDB } from "@/lib/db";
import eventEmitter from "@/lib/events";
import { corsHeaders } from "@/lib/cors";
import { logActivity } from "@/lib/activity";
import { withErrorHandling } from "@/lib/api";

export const POST = withErrorHandling(async (
  req: Request,
  { params }: { params: { id: string; taskId: string } }
) => {
  const { taskId } = params;
  const body = await req.json();
  let action: string = body.action;

  if (action !== "start" && action !== "stop" && action !== "toggle") {
    return Response.json(
      { error: "Invalid action. Must be 'start', 'stop', or 'toggle'." },
      { status: 400, headers: corsHeaders }
    );
  }

  const db = await mutateDB((db) => {
    const task = db.tasks.find((t) => t.id === taskId);
    if (!task) return db;

    // Resolve toggle to start/stop
    if (action === "toggle") {
      action = task.isRunning ? "stop" : "start";
    }

    const updated = {
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
    };

    return logActivity(
      updated,
      "task",
      taskId,
      action === "start" ? "timer_started" : "timer_stopped",
      `Timer ${action === "start" ? "started" : "stopped"} on "${task.title}"`
    );
  });

  eventEmitter.emit("update");

  const task = db.tasks.find((t) => t.id === taskId) ?? null;
  return Response.json({ task }, { headers: corsHeaders });
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
