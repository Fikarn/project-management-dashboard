import { readDB, mutateDB } from "@/lib/db";
import eventEmitter from "@/lib/events";
import { corsHeaders } from "@/lib/cors";
import type { ViewFilter, SortOption } from "@/lib/types";

const VALID_FILTERS: ViewFilter[] = ["all", "todo", "in-progress", "blocked", "done"];
const VALID_SORTS: SortOption[] = ["manual", "priority", "date", "name"];

export const dynamic = "force-dynamic";

export async function GET() {
  const db = readDB();
  return Response.json({ settings: db.settings }, { headers: corsHeaders });
}

export async function POST(req: Request) {
  const body = await req.json();

  if (body.viewFilter && !VALID_FILTERS.includes(body.viewFilter)) {
    return Response.json(
      { error: `Invalid filter. Must be one of: ${VALID_FILTERS.join(", ")}` },
      { status: 400, headers: corsHeaders }
    );
  }

  if (body.sortBy && !VALID_SORTS.includes(body.sortBy)) {
    return Response.json(
      { error: `Invalid sort. Must be one of: ${VALID_SORTS.join(", ")}` },
      { status: 400, headers: corsHeaders }
    );
  }

  const db = await mutateDB((db) => ({
    ...db,
    settings: {
      ...db.settings,
      ...(body.viewFilter !== undefined && { viewFilter: body.viewFilter }),
      ...(body.sortBy !== undefined && { sortBy: body.sortBy }),
      ...(body.selectedProjectId !== undefined && { selectedProjectId: body.selectedProjectId }),
      ...(body.selectedTaskId !== undefined && { selectedTaskId: body.selectedTaskId }),
    },
  }));

  eventEmitter.emit("update");

  return Response.json({ settings: db.settings }, { headers: corsHeaders });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
