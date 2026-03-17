import { readDB, mutateDB } from "@/lib/db";
import eventEmitter from "@/lib/events";
import { corsHeaders } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();

  if (body.projectId) {
    // Direct selection by ID
    await mutateDB((db) => ({
      ...db,
      settings: { ...db.settings, selectedProjectId: body.projectId },
    }));
    eventEmitter.emit("update");
    const db = readDB();
    const project = db.projects.find((p) => p.id === body.projectId);
    return Response.json({ selectedProjectId: body.projectId, project }, { headers: corsHeaders });
  }

  const direction: string = body.direction;
  if (direction !== "next" && direction !== "prev") {
    return Response.json(
      { error: "Must provide 'direction' (next/prev) or 'projectId'" },
      { status: 400, headers: corsHeaders }
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

    return {
      ...db,
      settings: { ...db.settings, selectedProjectId: db.projects[nextIdx].id },
    };
  });

  eventEmitter.emit("update");

  const project = db.projects.find((p) => p.id === db.settings.selectedProjectId);
  return Response.json(
    { selectedProjectId: db.settings.selectedProjectId, project },
    { headers: corsHeaders }
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
