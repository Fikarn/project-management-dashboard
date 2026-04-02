import { mutateDB } from "@/lib/db";
import eventEmitter from "@/lib/events";
import { getCorsHeaders } from "@/lib/cors";
import { logActivity } from "@/lib/activity";
import { withErrorHandling } from "@/lib/api";
import type { ProjectStatus } from "@/lib/types";

const STATUS_CYCLE: ProjectStatus[] = ["todo", "in-progress", "blocked", "done"];

export const POST = withErrorHandling(async (req: Request, { params }: { params: { id: string } }) => {
  const { id } = params;

  const db = await mutateDB((db) => {
    const project = db.projects.find((p) => p.id === id);
    if (!project) return db;

    const currentIdx = STATUS_CYCLE.indexOf(project.status);
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];

    const updated = {
      ...db,
      projects: db.projects.map((p) =>
        p.id === id ? { ...p, status: nextStatus, lastUpdated: new Date().toISOString() } : p
      ),
    };
    return logActivity(
      updated,
      "project",
      id,
      "status_changed",
      `Status cycled from ${project.status} to ${nextStatus}`
    );
  });

  eventEmitter.emit("update");

  const project = db.projects.find((p) => p.id === id) ?? null;
  return Response.json({ project }, { headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
