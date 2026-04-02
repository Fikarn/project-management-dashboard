import { readDB, mutateDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { generateId } from "@/lib/id";
import { logActivity } from "@/lib/activity";
import { withErrorHandling, withGetHandler } from "@/lib/api";

export const GET = withGetHandler(async (req: Request) => {
  const db = readDB();
  return Response.json({ lightGroups: db.lightGroups }, { headers: getCorsHeaders(req) });
});

export const POST = withErrorHandling(async (req) => {
  const body = await req.json();
  const name = (body.name || "").trim();
  if (!name) {
    return Response.json({ error: "Group name is required" }, { status: 400, headers: getCorsHeaders(req) });
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
  return Response.json(
    { group: db.lightGroups.find((g) => g.id === id) },
    { status: 201, headers: getCorsHeaders(req) }
  );
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
