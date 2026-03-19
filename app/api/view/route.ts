import { mutateDB } from "@/lib/db";
import eventEmitter from "@/lib/events";
import { corsHeaders } from "@/lib/cors";
import { withErrorHandling } from "@/lib/api";
import type { ViewFilter } from "@/lib/types";

const VALID_FILTERS: ViewFilter[] = ["all", "todo", "in-progress", "blocked", "done"];

export const POST = withErrorHandling(async (req) => {
  const body = await req.json();
  const filter: ViewFilter = body.filter;

  if (!VALID_FILTERS.includes(filter)) {
    return Response.json(
      { error: `Invalid filter. Must be one of: ${VALID_FILTERS.join(", ")}` },
      { status: 400, headers: corsHeaders }
    );
  }

  await mutateDB((db) => ({
    ...db,
    settings: { ...db.settings, viewFilter: filter },
  }));

  eventEmitter.emit("update");

  return Response.json({ filter }, { headers: corsHeaders });
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
