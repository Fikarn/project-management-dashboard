import { readDB, mutateDB } from "@/lib/db";
import { corsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { generateId } from "@/lib/id";
import { logActivity } from "@/lib/activity";
import type { Priority } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = readDB();
  return Response.json(
    {
      projects: db.projects,
      tasks: db.tasks,
      filter: db.settings.viewFilter,
      settings: db.settings,
    },
    { headers: corsHeaders }
  );
}

export async function POST(req: Request) {
  const body = await req.json();
  const title: string | undefined = body.title;

  if (!title || typeof title !== "string" || !title.trim()) {
    return Response.json(
      { error: "title is required" },
      { status: 400, headers: corsHeaders }
    );
  }

  const id = generateId("proj");
  const now = new Date().toISOString();

  const db = await mutateDB((db) => {
    const project = {
      id,
      title: title.trim(),
      description: (body.description ?? "").trim(),
      status: body.status ?? "todo" as const,
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
  return Response.json({ project }, { status: 201, headers: corsHeaders });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
