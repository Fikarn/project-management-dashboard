import { readDB, mutateDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { generateId } from "@/lib/id";
import { logActivity } from "@/lib/activity";
import { withErrorHandling, withGetHandler } from "@/lib/api";
import type { Priority } from "@/lib/types";

export const dynamic = "force-dynamic";

export const GET = withGetHandler(async (req: Request) => {
  const db = readDB();
  return Response.json(
    {
      projects: db.projects,
      tasks: db.tasks,
      filter: db.settings.viewFilter,
      settings: db.settings,
    },
    { headers: getCorsHeaders(req) }
  );
});

export const POST = withErrorHandling(async (req) => {
  const body = await req.json();
  const title: string | undefined = body.title;

  if (!title || typeof title !== "string" || !title.trim()) {
    return Response.json({ error: "title is required" }, { status: 400, headers: getCorsHeaders(req) });
  }

  const id = generateId("proj");
  const now = new Date().toISOString();

  const db = await mutateDB((db) => {
    const project = {
      id,
      title: title.trim(),
      description: (body.description ?? "").trim(),
      status: body.status ?? ("todo" as const),
      priority: (body.priority ?? "p2") as Priority,
      createdAt: now,
      lastUpdated: now,
      order: db.projects.length,
    };
    const updated = { ...db, projects: [...db.projects, project] };
    return logActivity(updated, "project", id, "created", `Project "${project.title}" created`);
  });

  eventEmitter.emit("update");

  const project = db.projects.find((p) => p.id === id);
  return Response.json({ project }, { status: 201, headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
