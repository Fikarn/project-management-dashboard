import { readDB, mutateDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { generateId } from "@/lib/id";
import { logActivity } from "@/lib/activity";
import { withErrorHandling, withGetHandler } from "@/lib/api";
import { validateOscChannel } from "@/lib/osc";

export const dynamic = "force-dynamic";

export const GET = withGetHandler(async (req: Request) => {
  const db = readDB();
  return Response.json(
    {
      audioChannels: db.audioChannels,
      audioSnapshots: db.audioSnapshots,
      audioSettings: db.audioSettings,
    },
    { headers: getCorsHeaders(req) }
  );
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

  const oscChannel: number = body.oscChannel ?? 1;
  if (!validateOscChannel(oscChannel)) {
    return Response.json(
      { error: "oscChannel must be an integer between 1 and 128" },
      { status: 400, headers: getCorsHeaders(req) }
    );
  }

  const id = generateId("audio-ch");

  const db = await mutateDB((db) => {
    const channel = {
      id,
      name: name.trim(),
      oscChannel,
      order: db.audioChannels.length,
      gain: 0,
      fader: 0.75,
      mute: false,
      solo: false,
      phantom: false,
      phase: false,
      pad: false,
      loCut: false,
    };
    const updated = { ...db, audioChannels: [...db.audioChannels, channel] };
    return logActivity(updated, "audio", id, "created", `Audio channel "${channel.name}" created`);
  });

  eventEmitter.emit("update");

  const channel = db.audioChannels.find((ch) => ch.id === id);
  return Response.json({ channel }, { status: 201, headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
