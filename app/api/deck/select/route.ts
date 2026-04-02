import { readDB, mutateDB } from "@/lib/db";
import eventEmitter from "@/lib/events";
import { getCorsHeaders } from "@/lib/cors";
import { withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (req) => {
  const body = await req.json();

  if (body.projectId) {
    // Direct selection by ID — also auto-select first task
    const db = await mutateDB((db) => {
      const projectTasks = db.tasks.filter((t) => t.projectId === body.projectId).sort((a, b) => a.order - b.order);
      const firstTaskId = projectTasks.length > 0 ? projectTasks[0].id : null;
      return {
        ...db,
        settings: { ...db.settings, selectedProjectId: body.projectId, selectedTaskId: firstTaskId },
      };
    });
    eventEmitter.emit("update");
    const project = db.projects.find((p) => p.id === body.projectId);
    return Response.json(
      { selectedProjectId: body.projectId, selectedTaskId: db.settings.selectedTaskId, project },
      { headers: getCorsHeaders(req) }
    );
  }

  const direction: string = body.direction;
  if (direction !== "next" && direction !== "prev") {
    return Response.json(
      { error: "Must provide 'direction' (next/prev) or 'projectId'" },
      { status: 400, headers: getCorsHeaders(req) }
    );
  }

  const db = await mutateDB((db) => {
    if (db.projects.length === 0) return db;

    const currentId = db.settings.selectedProjectId;
    const currentIdx = db.projects.findIndex((p) => p.id === currentId);

    let nextIdx: number;
    if (currentIdx === -1) {
      nextIdx = 0;
    } else if (direction === "next") {
      nextIdx = (currentIdx + 1) % db.projects.length;
    } else {
      nextIdx = (currentIdx - 1 + db.projects.length) % db.projects.length;
    }

    const newProjectId = db.projects[nextIdx].id;
    const projectTasks = db.tasks.filter((t) => t.projectId === newProjectId).sort((a, b) => a.order - b.order);
    const firstTaskId = projectTasks.length > 0 ? projectTasks[0].id : null;

    return {
      ...db,
      settings: { ...db.settings, selectedProjectId: newProjectId, selectedTaskId: firstTaskId },
    };
  });

  eventEmitter.emit("update");

  const project = db.projects.find((p) => p.id === db.settings.selectedProjectId);
  return Response.json(
    { selectedProjectId: db.settings.selectedProjectId, selectedTaskId: db.settings.selectedTaskId, project },
    { headers: getCorsHeaders(req) }
  );
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
