import { mutateDB } from "@/lib/db";
import eventEmitter from "@/lib/events";
import { corsHeaders } from "@/lib/cors";
import { generateId } from "@/lib/id";
import { logActivity } from "@/lib/activity";
import { withErrorHandling } from "@/lib/api";
import type { Priority } from "@/lib/types";

export const POST = withErrorHandling(async (
  req: Request,
  { params }: { params: { id: string } }
) => {
  const { id: projectId } = params;
  const body = await req.json();
  const title: string | undefined = body.title;

  if (!title || typeof title !== "string" || !title.trim()) {
    return Response.json(
      { error: "title is required" },
      { status: 400, headers: corsHeaders }
    );
  }

  const taskId = generateId("task");
  const now = new Date().toISOString();

  const db = await mutateDB((db) => {
    if (!db.projects.some((p) => p.id === projectId)) {
      return db;
    }

    const task = {
      id: taskId,
      projectId,
      title: title.trim(),
      description: (body.description ?? "").trim(),
      priority: (body.priority ?? "p2") as Priority,
      dueDate: body.dueDate ?? null,
      labels: body.labels ?? [],
      checklist: [],
      isRunning: false,
      totalSeconds: 0,
      lastStarted: null,
      completed: false,
      order: db.tasks.filter((t) => t.projectId === projectId).length,
      createdAt: now,
    };

    const updated = { ...db, tasks: [...db.tasks, task] };
    return logActivity(updated, "task", taskId, "created", `Task "${task.title}" created`);
  });

  eventEmitter.emit("update");

  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) {
    return Response.json({ error: "Project not found" }, { status: 404, headers: corsHeaders });
  }
  return Response.json({ task }, { status: 201, headers: corsHeaders });
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
