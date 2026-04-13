import { readDB, mutateDB } from "@/lib/db";
import eventEmitter from "@/lib/events";
import { getCorsHeaders } from "@/lib/cors";
import {
  getOptionalBoolean,
  getOptionalEnum,
  getOptionalNullableString,
  jsonResponse,
  parseJsonObject,
  withErrorHandling,
  withGetHandler,
} from "@/lib/api";
import type { ViewFilter, SortOption, DashboardView, DeckMode } from "@/lib/types";

const VALID_FILTERS: ViewFilter[] = ["all", "todo", "in-progress", "blocked", "done"];
const VALID_SORTS: SortOption[] = ["manual", "priority", "date", "name"];
const VALID_VIEWS: DashboardView[] = ["kanban", "lighting", "audio"];
const VALID_DECK_MODES: DeckMode[] = ["project", "light", "audio"];

export const dynamic = "force-dynamic";

export const GET = withGetHandler(async (req: Request) => {
  const db = readDB();
  return jsonResponse(req, { settings: db.settings });
});

export const POST = withErrorHandling(async (req) => {
  const body = await parseJsonObject(req);
  const viewFilter = getOptionalEnum(body, "viewFilter", VALID_FILTERS, "filter");
  const sortBy = getOptionalEnum(body, "sortBy", VALID_SORTS, "sort");
  const dashboardView = getOptionalEnum(body, "dashboardView", VALID_VIEWS, "view");
  const deckMode = getOptionalEnum(body, "deckMode", VALID_DECK_MODES, "deck mode");
  const selectedProjectId = getOptionalNullableString(body, "selectedProjectId", "selectedProjectId");
  const selectedTaskId = getOptionalNullableString(body, "selectedTaskId", "selectedTaskId");
  const hasCompletedSetup = getOptionalBoolean(body, "hasCompletedSetup", "hasCompletedSetup");

  const db = await mutateDB((db) => ({
    ...db,
    settings: {
      ...db.settings,
      ...(viewFilter !== undefined && { viewFilter }),
      ...(sortBy !== undefined && { sortBy }),
      ...(selectedProjectId !== undefined && { selectedProjectId }),
      ...(selectedTaskId !== undefined && { selectedTaskId }),
      ...(dashboardView !== undefined && { dashboardView }),
      ...(deckMode !== undefined && { deckMode }),
      ...(hasCompletedSetup !== undefined && { hasCompletedSetup }),
    },
  }));

  eventEmitter.emit("update");

  return jsonResponse(req, { settings: db.settings });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
