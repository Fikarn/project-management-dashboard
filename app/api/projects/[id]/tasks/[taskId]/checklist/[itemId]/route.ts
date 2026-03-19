import { mutateDB } from "@/lib/db";
import eventEmitter from "@/lib/events";
import { corsHeaders } from "@/lib/cors";
import { logActivity } from "@/lib/activity";
import { withErrorHandling } from "@/lib/api";

export const PUT = withErrorHandling(async (
  req: Request,
  { params }: { params: { id: string; taskId: string; itemId: string } }
) => {
  const { taskId, itemId } = params;
  const body = await req.json();

  const db = await mutateDB((db) => {
    const updated = {
      ...db,
      tasks: db.tasks.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          checklist: t.checklist.map((c) => {
            if (c.id !== itemId) return c;
            return {
              ...c,
              ...(body.text !== undefined && { text: body.text.trim() }),
              ...(body.done !== undefined && { done: body.done }),
            };
          }),
        };
      }),
    };
    const detail = body.done !== undefined
      ? `Checklist item ${body.done ? "checked" : "unchecked"}`
      : "Checklist item updated";
    return logActivity(updated, "task", taskId, "checklist_updated", detail);
  });

  eventEmitter.emit("update");

  const task = db.tasks.find((t) => t.id === taskId);
  const item = task?.checklist.find((c) => c.id === itemId);
  if (!item) {
    return Response.json({ error: "Item not found" }, { status: 404, headers: corsHeaders });
  }
  return Response.json({ item }, { headers: corsHeaders });
});

export const DELETE = withErrorHandling(async (
  _req: Request,
  { params }: { params: { id: string; taskId: string; itemId: string } }
) => {
  const { taskId, itemId } = params;

  const db = await mutateDB((db) => {
    const updated = {
      ...db,
      tasks: db.tasks.map((t) => {
        if (t.id !== taskId) return t;
        return { ...t, checklist: t.checklist.filter((c) => c.id !== itemId) };
      }),
    };
    return logActivity(updated, "task", taskId, "checklist_removed", "Checklist item removed");
  });

  eventEmitter.emit("update");

  return Response.json({ deleted: true }, { headers: corsHeaders });
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
