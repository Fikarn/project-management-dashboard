import { readDB, mutateDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { logActivity } from "@/lib/activity";
import { withErrorHandling } from "@/lib/api";
import { validateGain, validateFader, clearOscLiveState, sendOscGain, sendOscFader, sendOscToggle } from "@/lib/osc";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (req, { params }: { params: { id: string } }) => {
  const body = await req.json();

  if (body.gain !== undefined && !validateGain(body.gain)) {
    return Response.json({ error: "gain must be between 0 and 75" }, { status: 400, headers: getCorsHeaders(req) });
  }
  if (body.fader !== undefined && !validateFader(body.fader)) {
    return Response.json({ error: "fader must be between 0.0 and 1.0" }, { status: 400, headers: getCorsHeaders(req) });
  }
  for (const key of ["mute", "solo", "phantom", "phase", "pad", "loCut"] as const) {
    if (body[key] !== undefined && typeof body[key] !== "boolean") {
      return Response.json({ error: `${key} must be a boolean` }, { status: 400, headers: getCorsHeaders(req) });
    }
  }

  const db = await mutateDB((db) => {
    const idx = db.audioChannels.findIndex((ch) => ch.id === params.id);
    if (idx === -1) throw new Error("NOT_FOUND");

    const updated = { ...db.audioChannels[idx] };
    if (body.gain !== undefined) updated.gain = body.gain;
    if (body.fader !== undefined) updated.fader = body.fader;
    if (body.mute !== undefined) updated.mute = body.mute;
    if (body.solo !== undefined) updated.solo = body.solo;
    if (body.phantom !== undefined) updated.phantom = body.phantom;
    if (body.phase !== undefined) updated.phase = body.phase;
    if (body.pad !== undefined) updated.pad = body.pad;
    if (body.loCut !== undefined) updated.loCut = body.loCut;

    const channels = [...db.audioChannels];
    channels[idx] = updated;
    const updatedDb = { ...db, audioChannels: channels };
    return logActivity(updatedDb, "audio", params.id, "updated", `Audio channel "${updated.name}" values updated`);
  });

  // Clear live state and send OSC
  clearOscLiveState(params.id);
  const channel = db.audioChannels.find((ch) => ch.id === params.id);
  if (channel) {
    try {
      if (body.gain !== undefined) await sendOscGain(channel.oscChannel, channel.gain);
      if (body.fader !== undefined) await sendOscFader(channel.oscChannel, channel.fader);
      if (body.mute !== undefined) await sendOscToggle("mute", channel.oscChannel, channel.mute);
      if (body.solo !== undefined) await sendOscToggle("solo", channel.oscChannel, channel.solo);
      if (body.phantom !== undefined) await sendOscToggle("phantom", channel.oscChannel, channel.phantom);
      if (body.phase !== undefined) await sendOscToggle("phase", channel.oscChannel, channel.phase);
      if (body.pad !== undefined) await sendOscToggle("pad", channel.oscChannel, channel.pad);
      if (body.loCut !== undefined) await sendOscToggle("loCut", channel.oscChannel, channel.loCut);
    } catch {
      // OSC failure must not prevent API response or DB update
    }
  }

  eventEmitter.emit("update");
  return Response.json({ channel }, { headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
