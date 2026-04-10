import { readDB, mutateDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { generateId } from "@/lib/id";
import { logActivity } from "@/lib/activity";
import { withErrorHandling, withGetHandler } from "@/lib/api";
import { validateSnapshotIndex } from "@/lib/osc";

export const dynamic = "force-dynamic";

export const GET = withGetHandler(async (req: Request) => {
  const db = readDB();
  return Response.json({ snapshots: db.audioSnapshots }, { headers: getCorsHeaders(req) });
});

export const POST = withErrorHandling(async (req) => {
  const body = await req.json();
  const name: string | undefined = body.name;

  if (!name || typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "name is required" }, { status: 400, headers: getCorsHeaders(req) });
  }

  if (name.trim().length > 50) {
    return Response.json(
      { error: "Name must be 50 characters or fewer" },
      { status: 400, headers: getCorsHeaders(req) }
    );
  }

  const oscIndex: number | undefined = body.oscIndex;
  if (oscIndex === undefined || !validateSnapshotIndex(oscIndex)) {
    return Response.json(
      { error: "oscIndex must be an integer between 0 and 7" },
      { status: 400, headers: getCorsHeaders(req) }
    );
  }

  const id = generateId("asnap");

  const db = await mutateDB((db) => {
    const snapshot = {
      id,
      name: name.trim(),
      oscIndex,
      order: db.audioSnapshots.length,
    };
    const updated = { ...db, audioSnapshots: [...db.audioSnapshots, snapshot] };
    return logActivity(updated, "audio", id, "created", `Audio snapshot "${snapshot.name}" created`);
  });

  eventEmitter.emit("update");

  const snapshot = db.audioSnapshots.find((s) => s.id === id);
  return Response.json({ snapshot }, { status: 201, headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
