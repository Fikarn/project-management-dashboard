import { readDB, mutateDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { logActivity } from "@/lib/activity";
import {
  NotFoundError,
  getOptionalBoolean,
  getOptionalNumber,
  jsonResponse,
  parseJsonObject,
  withErrorHandling,
} from "@/lib/api";
import { validateGain, validateFader, clearOscLiveState, sendOscGain, sendOscFader, sendOscToggle } from "@/lib/osc";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (req, { params }: { params: { id: string } }) => {
  const body = await parseJsonObject(req);
  const gain = getOptionalNumber(body, "gain", "gain");
  const fader = getOptionalNumber(body, "fader", "fader");
  const mute = getOptionalBoolean(body, "mute", "mute");
  const solo = getOptionalBoolean(body, "solo", "solo");
  const phantom = getOptionalBoolean(body, "phantom", "phantom");
  const phase = getOptionalBoolean(body, "phase", "phase");
  const pad = getOptionalBoolean(body, "pad", "pad");
  const loCut = getOptionalBoolean(body, "loCut", "loCut");

  if (gain !== undefined && !validateGain(gain)) {
    return jsonResponse(req, { error: "gain must be between 0 and 75", code: "VALIDATION_ERROR" }, { status: 400 });
  }
  if (fader !== undefined && !validateFader(fader)) {
    return jsonResponse(req, { error: "fader must be between 0.0 and 1.0", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const db = await mutateDB((db) => {
    const idx = db.audioChannels.findIndex((ch) => ch.id === params.id);
    if (idx === -1) throw new NotFoundError("Audio channel not found", { channelId: params.id });

    const updated = { ...db.audioChannels[idx] };
    if (gain !== undefined) updated.gain = gain;
    if (fader !== undefined) updated.fader = fader;
    if (mute !== undefined) updated.mute = mute;
    if (solo !== undefined) updated.solo = solo;
    if (phantom !== undefined) updated.phantom = phantom;
    if (phase !== undefined) updated.phase = phase;
    if (pad !== undefined) updated.pad = pad;
    if (loCut !== undefined) updated.loCut = loCut;

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
      if (gain !== undefined) await sendOscGain(channel.oscChannel, channel.gain);
      if (fader !== undefined) await sendOscFader(channel.oscChannel, channel.fader);
      if (mute !== undefined) await sendOscToggle("mute", channel.oscChannel, channel.mute);
      if (solo !== undefined) await sendOscToggle("solo", channel.oscChannel, channel.solo);
      if (phantom !== undefined) await sendOscToggle("phantom", channel.oscChannel, channel.phantom);
      if (phase !== undefined) await sendOscToggle("phase", channel.oscChannel, channel.phase);
      if (pad !== undefined) await sendOscToggle("pad", channel.oscChannel, channel.pad);
      if (loCut !== undefined) await sendOscToggle("loCut", channel.oscChannel, channel.loCut);
    } catch {
      // OSC failure must not prevent API response or DB update
    }
  }

  eventEmitter.emit("update");
  return jsonResponse(req, { channel });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
