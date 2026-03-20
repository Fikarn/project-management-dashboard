import { readDB, mutateDB } from "@/lib/db";
import eventEmitter from "@/lib/events";
import { corsHeaders } from "@/lib/cors";
import { withErrorHandling, withGetHandler } from "@/lib/api";
import type { ViewFilter, SortOption, DashboardView, DeckMode } from "@/lib/types";

const VALID_FILTERS: ViewFilter[] = ["all", "todo", "in-progress", "blocked", "done"];
const VALID_SORTS: SortOption[] = ["manual", "priority", "date", "name"];
const VALID_VIEWS: DashboardView[] = ["kanban", "lighting"];
const VALID_DECK_MODES: DeckMode[] = ["project", "light"];

export const dynamic = "force-dynamic";

export const GET = withGetHandler(async () => {
  const db = readDB();
  return Response.json({ settings: db.settings }, { headers: corsHeaders });
});

export const POST = withErrorHandling(async (req) => {
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

  if (body.dashboardView && !VALID_VIEWS.includes(body.dashboardView)) {
    return Response.json(
      { error: `Invalid view. Must be one of: ${VALID_VIEWS.join(", ")}` },
      { status: 400, headers: corsHeaders }
    );
  }

  if (body.deckMode && !VALID_DECK_MODES.includes(body.deckMode)) {
    return Response.json(
      { error: `Invalid deck mode. Must be one of: ${VALID_DECK_MODES.join(", ")}` },
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
      ...(body.dashboardView !== undefined && { dashboardView: body.dashboardView }),
      ...(body.deckMode !== undefined && { deckMode: body.deckMode }),
      ...(body.hasCompletedSetup !== undefined && { hasCompletedSetup: !!body.hasCompletedSetup }),
    },
  }));

  eventEmitter.emit("update");

  return Response.json({ settings: db.settings }, { headers: corsHeaders });
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
