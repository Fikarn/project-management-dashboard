import { mutateDB } from "@/lib/db";
import eventEmitter from "@/lib/events";
import { corsHeaders } from "@/lib/cors";
import { generateId } from "@/lib/id";
import { logActivity } from "@/lib/activity";
import { withErrorHandling } from "@/lib/api";

export const POST = withErrorHandling(async (
  req: Request,
  { params }: { params: { id: string; taskId: string } }
) => {
  const { taskId } = params;
  const body = await req.json();
  const text: string | undefined = body.text;

  if (!text || typeof text !== "string" || !text.trim()) {
    return Response.json({ error: "text is required" }, { status: 400, headers: corsHeaders });
  }

  const itemId = generateId("cl");

  const db = await mutateDB((db) => {
    const task = db.tasks.find((t) => t.id === taskId);
    if (!task) return db;

    const item = { id: itemId, text: text.trim(), done: false };
    const updated = {
      ...db,
      tasks: db.tasks.map((t) =>
        t.id === taskId ? { ...t, checklist: [...t.checklist, item] } : t
      ),
    };
    return logActivity(updated, "task", taskId, "checklist_added", `Checklist item "${text.trim()}" added`);
  });

  eventEmitter.emit("update");

  const task = db.tasks.find((t) => t.id === taskId);
  const item = task?.checklist.find((c) => c.id === itemId);
  return Response.json({ item }, { status: 201, headers: corsHeaders });
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
