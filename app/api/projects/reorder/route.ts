import { mutateDB } from "@/lib/db";
import eventEmitter from "@/lib/events";
import { getCorsHeaders } from "@/lib/cors";
import { logActivity } from "@/lib/activity";
import { withErrorHandling } from "@/lib/api";
import type { ProjectStatus } from "@/lib/types";

const VALID_STATUSES: ProjectStatus[] = ["todo", "in-progress", "blocked", "done"];

export const POST = withErrorHandling(async (req) => {
  const body = await req.json();
  const { projectId, newStatus, newIndex } = body;

  if (!projectId || typeof projectId !== "string") {
    return Response.json({ error: "projectId is required" }, { status: 400, headers: getCorsHeaders(req) });
  }

  if (newStatus && !VALID_STATUSES.includes(newStatus)) {
    return Response.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400, headers: getCorsHeaders(req) }
    );
  }

  const db = await mutateDB((db) => {
    const project = db.projects.find((p) => p.id === projectId);
    if (!project) return db;

    const oldStatus = project.status;
    const targetStatus = newStatus ?? oldStatus;

    // Update status if changed
    let projects = db.projects.map((p) =>
      p.id === projectId ? { ...p, status: targetStatus, lastUpdated: new Date().toISOString() } : p
    );

    // Get projects in the target column, sorted by current order
    const columnProjects = projects
      .filter((p) => p.status === targetStatus && p.id !== projectId)
      .sort((a, b) => a.order - b.order);

    // Insert the moved project at newIndex
    const movedProject = projects.find((p) => p.id === projectId)!;
    const idx =
      typeof newIndex === "number" ? Math.max(0, Math.min(newIndex, columnProjects.length)) : columnProjects.length;
    columnProjects.splice(idx, 0, movedProject);

    // Reassign order values for the target column
    const orderMap = new Map<string, number>();
    columnProjects.forEach((p, i) => orderMap.set(p.id, i));

    projects = projects.map((p) => (orderMap.has(p.id) ? { ...p, order: orderMap.get(p.id)! } : p));

    let updated = { ...db, projects };

    if (oldStatus !== targetStatus) {
      updated = logActivity(
        updated,
        "project",
        projectId,
        "status_changed",
        `Moved from ${oldStatus} to ${targetStatus}`
      );
    }

    return updated;
  });

  eventEmitter.emit("update");

  const project = db.projects.find((p) => p.id === projectId);
  return Response.json({ project }, { headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
