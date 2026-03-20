import { mutateDB } from "@/lib/db";
import eventEmitter from "@/lib/events";
import { corsHeaders } from "@/lib/cors";
import { logActivity } from "@/lib/activity";
import { withErrorHandling } from "@/lib/api";
import type { Priority } from "@/lib/types";

const VALID_PRIORITIES: Priority[] = ["p0", "p1", "p2", "p3"];

export const PUT = withErrorHandling(async (req: Request, { params }: { params: { id: string } }) => {
  const { id } = params;
  const body = await req.json();

  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    return Response.json(
      { error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}` },
      { status: 400, headers: corsHeaders }
    );
  }

  const db = await mutateDB((db) => {
    const changes: string[] = [];
    const updated = {
      ...db,
      projects: db.projects.map((p) => {
        if (p.id !== id) return p;
        const next = { ...p, lastUpdated: new Date().toISOString() };
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
        if (body.order !== undefined) {
          next.order = body.order;
          changes.push("order");
        }
        return next;
      }),
    };
    return logActivity(updated, "project", id, "updated", `Updated ${changes.join(", ")}`);
  });

  eventEmitter.emit("update");

  const project = db.projects.find((p) => p.id === id) ?? null;
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404, headers: corsHeaders });
  }
  return Response.json({ project }, { headers: corsHeaders });
});

export const DELETE = withErrorHandling(async (_req: Request, { params }: { params: { id: string } }) => {
  const { id } = params;

  const db = await mutateDB((db) => {
    const project = db.projects.find((p) => p.id === id);
    if (!project) return db;
    const updated = {
      ...db,
      projects: db.projects.filter((p) => p.id !== id),
      tasks: db.tasks.filter((t) => t.projectId !== id),
    };
    return logActivity(updated, "project", id, "deleted", `Project "${project.title}" deleted`);
  });

  eventEmitter.emit("update");

  return Response.json({ deleted: !db.projects.some((p) => p.id === id) }, { headers: corsHeaders });
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
