import { readDB, mutateDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { logActivity } from "@/lib/activity";
import { NotFoundError, withErrorHandling, withGetHandler } from "@/lib/api";
import { createDefaultAudioChannels } from "@/lib/audio-console";

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

  const db = await mutateDB((db) => {
    const idx = db.audioChannels.findIndex((ch) => ch.id === params.id);
    if (idx === -1) throw new NotFoundError("Audio channel not found", { channelId: params.id });

    const defaultChannel = createDefaultAudioChannels().find((channel) => channel.id === params.id);
    const updated = { ...db.audioChannels[idx] };
    if (body.name !== undefined) updated.name = body.name.trim();
    if (body.shortName !== undefined && typeof body.shortName === "string" && body.shortName.trim()) {
      updated.shortName = body.shortName.trim().slice(0, 8).toUpperCase();
    } else if (body.name !== undefined) {
      updated.shortName = body.name.trim().slice(0, 8).toUpperCase();
    }
    if (defaultChannel) {
      updated.kind = defaultChannel.kind;
      updated.role = defaultChannel.role;
      updated.stereo = defaultChannel.stereo;
      updated.oscChannel = defaultChannel.oscChannel;
    }

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
  return Response.json(
    { error: "The UFX III console uses a fixed strip layout. Strips can be relabeled, but not deleted." },
    { status: 400, headers: getCorsHeaders(req) }
  );
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
