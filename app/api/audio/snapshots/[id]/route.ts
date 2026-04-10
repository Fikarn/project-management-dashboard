import { mutateDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { logActivity } from "@/lib/activity";
import { withErrorHandling } from "@/lib/api";
import { validateSnapshotIndex } from "@/lib/osc";

export const dynamic = "force-dynamic";

export const PUT = withErrorHandling(async (req, { params }: { params: { id: string } }) => {
  const body = await req.json();

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return Response.json({ error: "name must be a non-empty string" }, { status: 400, headers: getCorsHeaders(req) });
    }
    if (body.name.trim().length > 50) {
      return Response.json(
        { error: "Name must be 50 characters or fewer" },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }
  }

  if (body.oscIndex !== undefined && !validateSnapshotIndex(body.oscIndex)) {
    return Response.json(
      { error: "oscIndex must be an integer between 0 and 7" },
      { status: 400, headers: getCorsHeaders(req) }
    );
  }

  const db = await mutateDB((db) => {
    const idx = db.audioSnapshots.findIndex((s) => s.id === params.id);
    if (idx === -1) throw new Error("NOT_FOUND");

    const updated = { ...db.audioSnapshots[idx] };
    if (body.name !== undefined) updated.name = body.name.trim();
    if (body.oscIndex !== undefined) updated.oscIndex = body.oscIndex;

    const snapshots = [...db.audioSnapshots];
    snapshots[idx] = updated;
    const updatedDb = { ...db, audioSnapshots: snapshots };
    return logActivity(updatedDb, "audio", params.id, "updated", `Audio snapshot "${updated.name}" updated`);
  });

  const snapshot = db.audioSnapshots.find((s) => s.id === params.id);
  eventEmitter.emit("update");
  return Response.json({ snapshot }, { headers: getCorsHeaders(req) });
});

export const DELETE = withErrorHandling(async (req, { params }: { params: { id: string } }) => {
  await mutateDB((db) => {
    const snapshot = db.audioSnapshots.find((s) => s.id === params.id);
    if (!snapshot) throw new Error("NOT_FOUND");

    const snapshots = db.audioSnapshots.filter((s) => s.id !== params.id);
    const updatedDb = { ...db, audioSnapshots: snapshots };
    return logActivity(updatedDb, "audio", params.id, "deleted", `Audio snapshot "${snapshot.name}" deleted`);
  });

  eventEmitter.emit("update");
  return Response.json({ success: true }, { headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
