import { mutateDB } from "@/lib/db";
import eventEmitter from "@/lib/events";
import { getCorsHeaders } from "@/lib/cors";
import { logActivity } from "@/lib/activity";
import { withErrorHandling } from "@/lib/api";
import type { Priority } from "@/lib/types";

const VALID_PRIORITIES: Priority[] = ["p0", "p1", "p2", "p3"];

export const PUT = withErrorHandling(async (req: Request, { params }: { params: { id: string; taskId: string } }) => {
  const { taskId } = params;
  const body = await req.json();

  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    return Response.json(
      { error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}` },
      { status: 400, headers: getCorsHeaders(req) }
    );
  }

  const db = await mutateDB((db) => {
    const changes: string[] = [];
    const updated = {
      ...db,
      tasks: db.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const next = { ...t };
        if (body.title !== undefined) {
          next.title = body.title.trim();
          changes.push("title");
        }
        if (body.description !== undefined) {
          next.description = body.description;
          changes.push("description");
        }
        if (body.priority !== undefined) {
          next.priority = body.priority;
          changes.push("priority");
        }
        if (body.dueDate !== undefined) {
          next.dueDate = body.dueDate;
          changes.push("dueDate");
        }
        if (body.labels !== undefined) {
          next.labels = body.labels;
          changes.push("labels");
        }
        if (body.completed !== undefined) {
          next.completed = body.completed;
          changes.push("completed");
        }
        if (body.order !== undefined) {
          next.order = body.order;
          changes.push("order");
        }
        return next;
      }),
    };
    return logActivity(updated, "task", taskId, "updated", `Updated ${changes.join(", ")}`);
  });

  eventEmitter.emit("update");

  const task = db.tasks.find((t) => t.id === taskId) ?? null;
  if (!task) {
    return Response.json({ error: "Task not found" }, { status: 404, headers: getCorsHeaders(req) });
  }
  return Response.json({ task }, { headers: getCorsHeaders(req) });
});

export const DELETE = withErrorHandling(
  async (req: Request, { params }: { params: { id: string; taskId: string } }) => {
    const { taskId } = params;

    const db = await mutateDB((db) => {
      const task = db.tasks.find((t) => t.id === taskId);
      if (!task) return db;
      const updated = {
        ...db,
        tasks: db.tasks.filter((t) => t.id !== taskId),
      };
      return logActivity(updated, "task", taskId, "deleted", `Task "${task.title}" deleted`);
    });

    eventEmitter.emit("update");

    return Response.json({ deleted: !db.tasks.some((t) => t.id === taskId) }, { headers: getCorsHeaders(req) });
  }
);

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
