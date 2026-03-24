import { readDB, mutateDB } from "@/lib/db";
import { corsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { generateId } from "@/lib/id";
import { logActivity } from "@/lib/activity";
import { withErrorHandling, withGetHandler } from "@/lib/api";

export const GET = withGetHandler(async () => {
  const db = readDB();
  return Response.json({ lightGroups: db.lightGroups }, { headers: corsHeaders });
});

export const POST = withErrorHandling(async (req) => {
  const body = await req.json();
  const name = (body.name || "").trim();
  if (!name) {
    return Response.json({ error: "Group name is required" }, { status: 400, headers: corsHeaders });
  }

  const id = generateId("grp");
  const db = await mutateDB((db) => {
    const group = {
      id,
      name,
      order: db.lightGroups.length,
    };
    const updated = { ...db, lightGroups: [...db.lightGroups, group] };
    return logActivity(updated, "light", id, "created", `Group "${name}" created`);
  });

  eventEmitter.emit("update");
  return Response.json({ group: db.lightGroups.find((g) => g.id === id) }, { status: 201, headers: corsHeaders });
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
