import { readDB, mutateDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { logActivity } from "@/lib/activity";
import {
  NotFoundError,
  getOptionalBoolean,
  getOptionalNumber,
  getOptionalString,
  jsonResponse,
  parseJsonObject,
  withErrorHandling,
} from "@/lib/api";
import {
  getChannelSendLevel,
  setChannelSendLevel,
  supportsAutoSet,
  supportsGain,
  supportsInstrument,
  supportsPad,
  supportsPhase,
  supportsPhantom,
} from "@/lib/audio-console";
import { clearOscLiveState, sendOscChannelUpdate, validateFader, validateGain } from "@/lib/osc";

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
  const instrument = getOptionalBoolean(body, "instrument", "instrument");
  const autoSet = getOptionalBoolean(body, "autoSet", "autoSet");
  const mixTargetId = getOptionalString(body, "mixTargetId", "mixTargetId");

  if (gain !== undefined && !validateGain(gain)) {
    return jsonResponse(req, { error: "gain must be between 0 and 75", code: "VALIDATION_ERROR" }, { status: 400 });
  }
  if (fader !== undefined && !validateFader(fader)) {
    return jsonResponse(req, { error: "fader must be between 0.0 and 1.0", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const db = await mutateDB((db) => {
    const idx = db.audioChannels.findIndex((ch) => ch.id === params.id);
    if (idx === -1) throw new NotFoundError("Audio channel not found", { channelId: params.id });
    const resolvedMixTargetId = mixTargetId ?? db.audioSettings.selectedMixTargetId;
    if (fader !== undefined && !db.audioMixTargets.some((target) => target.id === resolvedMixTargetId)) {
      throw new NotFoundError("Audio mix target not found", { mixTargetId: resolvedMixTargetId });
    }

    const updated = { ...db.audioChannels[idx] };
    if (gain !== undefined && supportsGain(updated)) updated.gain = gain;
    if (fader !== undefined) {
      const next = setChannelSendLevel(updated, resolvedMixTargetId, fader);
      updated.fader = next.fader;
      updated.mixLevels = next.mixLevels;
    }
    if (mute !== undefined) updated.mute = mute;
    if (solo !== undefined) updated.solo = solo;
    if (phantom !== undefined && supportsPhantom(updated)) updated.phantom = phantom;
    if (phase !== undefined && supportsPhase(updated)) updated.phase = phase;
    if (pad !== undefined && supportsPad(updated)) updated.pad = pad;
    if (instrument !== undefined && supportsInstrument(updated)) updated.instrument = instrument;
    if (autoSet !== undefined && supportsAutoSet(updated)) updated.autoSet = autoSet;

    const channels = [...db.audioChannels];
    channels[idx] = updated;
    const updatedDb = { ...db, audioChannels: channels };
    return logActivity(updatedDb, "audio", params.id, "updated", `Audio channel "${updated.name}" values updated`);
  });

  // Clear live state and send OSC
  clearOscLiveState(params.id);
  const channel = db.audioChannels.find((ch) => ch.id === params.id);
  const resolvedMixTargetId = mixTargetId ?? db.audioSettings.selectedMixTargetId;
  const selectedMixTarget = db.audioMixTargets.find((target) => target.id === resolvedMixTargetId) ?? null;
  if (channel) {
    try {
      await sendOscChannelUpdate(
        channel,
        {
          gain,
          fader:
            fader !== undefined && selectedMixTarget ? getChannelSendLevel(channel, selectedMixTarget.id) : undefined,
          mute,
          solo,
          phantom,
          phase,
          pad,
          instrument,
          autoSet,
        },
        selectedMixTarget?.oscChannel
      );
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
