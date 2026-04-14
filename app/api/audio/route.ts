import { readDB, mutateDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { logActivity } from "@/lib/activity";
import { withErrorHandling, withGetHandler } from "@/lib/api";
import { validateOscChannel } from "@/lib/osc";
import { createDefaultAudioChannels } from "@/lib/audio-console";

export const dynamic = "force-dynamic";

export const GET = withGetHandler(async (req: Request) => {
  const db = readDB();
  return Response.json(
    {
      audioChannels: db.audioChannels,
      audioMixTargets: db.audioMixTargets,
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
      { error: "oscChannel must be an integer between 1 and 12 for the fixed UFX III input map" },
      { status: 400, headers: getCorsHeaders(req) }
    );
  }

  const current = readDB();
  const existingChannel = current.audioChannels.find(
    (channel) => channel.oscChannel === oscChannel && channel.kind === "hardware-input"
  );
  if (!existingChannel) {
    return Response.json(
      { error: "Only mapped UFX III input strips can be relabeled from this endpoint" },
      { status: 400, headers: getCorsHeaders(req) }
    );
  }

  const db = await mutateDB((db) => {
    const idx = db.audioChannels.findIndex(
      (channel) => channel.oscChannel === oscChannel && channel.kind === "hardware-input"
    );
    if (idx === -1) throw new Error("NOT_FOUND");

    const defaultChannel = createDefaultAudioChannels().find((channel) => channel.id === db.audioChannels[idx].id);
    const updatedChannel = {
      ...db.audioChannels[idx],
      name: name.trim(),
      shortName: name.trim().slice(0, 8).toUpperCase(),
      gain: db.audioChannels[idx].gain,
      phantom: db.audioChannels[idx].phantom,
      pad: db.audioChannels[idx].pad,
      phase: db.audioChannels[idx].phase,
      mute: db.audioChannels[idx].mute,
      solo: db.audioChannels[idx].solo,
      fader: db.audioChannels[idx].fader,
      // Rear line labels can be reset from the default map later if needed.
      ...(defaultChannel
        ? { role: defaultChannel.role, kind: defaultChannel.kind, stereo: defaultChannel.stereo }
        : {}),
    };

    const channels = [...db.audioChannels];
    channels[idx] = updatedChannel;

    const updated = { ...db, audioChannels: channels };
    return logActivity(updated, "audio", updatedChannel.id, "updated", `Audio strip "${updatedChannel.name}" labeled`);
  });

  eventEmitter.emit("update");

  const channel = db.audioChannels.find((ch) => ch.id === existingChannel.id);
  return Response.json({ channel }, { status: 201, headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
