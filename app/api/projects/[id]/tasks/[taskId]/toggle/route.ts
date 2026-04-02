import { mutateDB } from "@/lib/db";
import eventEmitter from "@/lib/events";
import { getCorsHeaders } from "@/lib/cors";
import { logActivity } from "@/lib/activity";
import { withErrorHandling } from "@/lib/api";

export const POST = withErrorHandling(async (req: Request, { params }: { params: { id: string; taskId: string } }) => {
  const { taskId } = params;

  const db = await mutateDB((db) => {
    const task = db.tasks.find((t) => t.id === taskId);
    if (!task) return db;

    const newCompleted = !task.completed;
    const updated = {
      ...db,
      tasks: db.tasks.map((t) => (t.id === taskId ? { ...t, completed: newCompleted } : t)),
    };
    return logActivity(
      updated,
      "task",
      taskId,
      newCompleted ? "completed" : "uncompleted",
      `Task "${task.title}" marked as ${newCompleted ? "completed" : "incomplete"}`
    );
  });

  eventEmitter.emit("update");

  const task = db.tasks.find((t) => t.id === taskId) ?? null;
  return Response.json({ task }, { headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
