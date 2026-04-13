import { readDB, mutateDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { generateId } from "@/lib/id";
import { logActivity } from "@/lib/activity";
import {
  getOptionalEnum,
  getOptionalString,
  getRequiredString,
  jsonResponse,
  parseJsonObject,
  withErrorHandling,
  withGetHandler,
} from "@/lib/api";
import type { Priority, ProjectStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_PRIORITIES: Priority[] = ["p0", "p1", "p2", "p3"];
const VALID_STATUSES: ProjectStatus[] = ["todo", "in-progress", "blocked", "done"];

export const GET = withGetHandler(async (req: Request) => {
  const db = readDB();
  return jsonResponse(req, {
    projects: db.projects,
    tasks: db.tasks,
    filter: db.settings.viewFilter,
    settings: db.settings,
  });
});

export const POST = withErrorHandling(async (req) => {
  const body = await parseJsonObject(req);
  const title = getRequiredString(body, "title");
  const description = getOptionalString(body, "description") ?? "";
  const status = getOptionalEnum(body, "status", VALID_STATUSES, "status") ?? "todo";
  const priority = getOptionalEnum(body, "priority", VALID_PRIORITIES, "priority") ?? "p2";

  const id = generateId("proj");
  const now = new Date().toISOString();

  const db = await mutateDB((db) => {
    const project = {
      id,
      title,
      description,
      status,
      priority,
      createdAt: now,
      lastUpdated: now,
      order: db.projects.length,
    };
    const updated = { ...db, projects: [...db.projects, project] };
    return logActivity(updated, "project", id, "created", `Project "${project.title}" created`);
  });

  eventEmitter.emit("update");

  const project = db.projects.find((p) => p.id === id);
  return jsonResponse(req, { project }, { status: 201 });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
