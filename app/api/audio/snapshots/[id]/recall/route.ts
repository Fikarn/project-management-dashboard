import { readDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import { withErrorHandling } from "@/lib/api";
import { sendOscSnapshotRecall } from "@/lib/osc";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (req, { params }: { params: { id: string } }) => {
  const db = readDB();
  const snapshot = db.audioSnapshots.find((s) => s.id === params.id);

  if (!snapshot) {
    return Response.json({ error: "Snapshot not found" }, { status: 404, headers: getCorsHeaders(req) });
  }

  try {
    await sendOscSnapshotRecall(snapshot.oscIndex);
  } catch {
    // OSC failure must not prevent API response
    return Response.json({ recalled: false, error: "OSC send failed" }, { headers: getCorsHeaders(req) });
  }

  return Response.json({ recalled: true, snapshot }, { headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
