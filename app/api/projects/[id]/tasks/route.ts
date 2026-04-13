import { mutateDB } from "@/lib/db";
import eventEmitter from "@/lib/events";
import { getCorsHeaders } from "@/lib/cors";
import { generateId } from "@/lib/id";
import { logActivity } from "@/lib/activity";
import {
  NotFoundError,
  ValidationError,
  getOptionalEnum,
  getOptionalString,
  getOptionalStringArray,
  getRequiredString,
  jsonResponse,
  parseJsonObject,
  withErrorHandling,
} from "@/lib/api";
import type { Priority } from "@/lib/types";

const VALID_PRIORITIES: Priority[] = ["p0", "p1", "p2", "p3"];

export const POST = withErrorHandling(async (req: Request, { params }: { params: { id: string } }) => {
  const { id: projectId } = params;
  const body = await parseJsonObject(req);
  const title = getRequiredString(body, "title");
  const description = getOptionalString(body, "description") ?? "";
  const priority = getOptionalEnum(body, "priority", VALID_PRIORITIES, "priority") ?? "p2";
  const labels = getOptionalStringArray(body, "labels", "labels") ?? [];
  const dueDate = body.dueDate;

  if (dueDate !== undefined && dueDate !== null && typeof dueDate !== "string") {
    throw new ValidationError("dueDate must be a string or null", { field: "dueDate" });
  }

  const taskId = generateId("task");
  const now = new Date().toISOString();

  const db = await mutateDB((db) => {
    if (!db.projects.some((p) => p.id === projectId)) {
      throw new NotFoundError("Project not found", { projectId });
    }

    const task = {
      id: taskId,
      projectId,
      title,
      description,
      priority,
      dueDate: dueDate ?? null,
      labels,
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

  const task = db.tasks.find((t) => t.id === taskId)!;
  return jsonResponse(req, { task }, { status: 201 });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
