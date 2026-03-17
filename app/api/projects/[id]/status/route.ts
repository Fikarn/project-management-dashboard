import { mutateDB } from "@/lib/db";
import eventEmitter from "@/lib/events";
import { corsHeaders } from "@/lib/cors";
import type { ProjectStatus } from "@/lib/types";

const VALID_STATUSES: ProjectStatus[] = ["todo", "in-progress", "blocked", "done"];

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await req.json();
  const status: ProjectStatus = body.status;

  if (!VALID_STATUSES.includes(status)) {
    return Response.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400, headers: corsHeaders }
    );
  }

  const db = await mutateDB((db) => ({
    ...db,
    projects: db.projects.map((p) =>
      p.id === id
        ? { ...p, status, lastUpdated: new Date().toISOString() }
        : p
    ),
  }));

  eventEmitter.emit("update");

  const project = db.projects.find((p) => p.id === id) ?? null;
  return Response.json({ project }, { headers: corsHeaders });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
