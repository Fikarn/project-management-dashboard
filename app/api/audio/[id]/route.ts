import { readDB, mutateDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { logActivity } from "@/lib/activity";
import { withErrorHandling, withGetHandler } from "@/lib/api";
import { validateOscChannel } from "@/lib/osc";

export const dynamic = "force-dynamic";

export const GET = withGetHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const db = readDB();
  const channel = db.audioChannels.find((ch) => ch.id === params.id);
  if (!channel) {
    return Response.json({ error: "Audio channel not found" }, { status: 404, headers: getCorsHeaders(req) });
  }
  return Response.json({ channel }, { headers: getCorsHeaders(req) });
});

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

  if (body.oscChannel !== undefined && !validateOscChannel(body.oscChannel)) {
    return Response.json(
      { error: "oscChannel must be an integer between 1 and 128" },
      { status: 400, headers: getCorsHeaders(req) }
    );
  }

  const db = await mutateDB((db) => {
    const idx = db.audioChannels.findIndex((ch) => ch.id === params.id);
    if (idx === -1) throw new Error("NOT_FOUND");

    const updated = { ...db.audioChannels[idx] };
    if (body.name !== undefined) updated.name = body.name.trim();
    if (body.oscChannel !== undefined) updated.oscChannel = body.oscChannel;

    const channels = [...db.audioChannels];
    channels[idx] = updated;
    const updatedDb = { ...db, audioChannels: channels };
    return logActivity(updatedDb, "audio", params.id, "updated", `Audio channel "${updated.name}" updated`);
  });

  const channel = db.audioChannels.find((ch) => ch.id === params.id);
  eventEmitter.emit("update");
  return Response.json({ channel }, { headers: getCorsHeaders(req) });
});

export const DELETE = withErrorHandling(async (req, { params }: { params: { id: string } }) => {
  const db = await mutateDB((db) => {
    const channel = db.audioChannels.find((ch) => ch.id === params.id);
    if (!channel) throw new Error("NOT_FOUND");

    const channels = db.audioChannels.filter((ch) => ch.id !== params.id);

    // Clear selection if this was the selected channel
    const audioSettings =
      db.audioSettings.selectedChannelId === params.id
        ? { ...db.audioSettings, selectedChannelId: null }
        : db.audioSettings;

    const updatedDb = { ...db, audioChannels: channels, audioSettings };
    return logActivity(updatedDb, "audio", params.id, "deleted", `Audio channel "${channel.name}" deleted`);
  });

  eventEmitter.emit("update");
  return Response.json({ success: true }, { headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
