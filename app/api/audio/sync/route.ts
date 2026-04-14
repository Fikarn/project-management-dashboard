import { mutateDB, readDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { jsonResponse, withErrorHandling } from "@/lib/api";
import { getChannelSendLevel, markAudioConsoleAligned } from "@/lib/audio-console";
import { initOsc, isOscConnected, primeOscTransport, sendOscChannelUpdate, sendOscMixTargetUpdate } from "@/lib/osc";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (req) => {
  const db = readDB();
  const settings = db.audioSettings;

  if (!settings.oscEnabled) {
    return jsonResponse(
      req,
      { error: "OSC must be enabled before syncing the console", code: "OSC_DISABLED" },
      { status: 400 }
    );
  }

  if (!isOscConnected()) {
    await initOsc(settings.oscSendHost, settings.oscSendPort, settings.oscReceivePort);
  }

  for (const target of [...db.audioMixTargets].sort((a, b) => a.order - b.order)) {
    await sendOscMixTargetUpdate(target, {
      volume: target.volume,
      mute: target.mute,
      dim: target.dim,
      mono: target.mono,
      talkback: target.talkback,
    });
  }

  for (const channel of [...db.audioChannels].sort((a, b) => a.order - b.order)) {
    await sendOscChannelUpdate(channel, {
      gain: channel.gain,
      mute: channel.mute,
      solo: channel.solo,
      phantom: channel.phantom,
      phase: channel.phase,
      pad: channel.pad,
      instrument: channel.instrument,
      autoSet: channel.autoSet,
    });

    for (const target of db.audioMixTargets) {
      await sendOscChannelUpdate(
        channel,
        {
          fader: getChannelSendLevel(channel, target.id),
        },
        target.oscChannel
      );
    }
  }

  const selectedMixTarget = db.audioMixTargets.find((target) => target.id === settings.selectedMixTargetId) ?? null;
  await primeOscTransport(selectedMixTarget?.oscChannel);

  const syncedAt = new Date().toISOString();
  const updated = await mutateDB((current) => ({
    ...current,
    audioSettings: markAudioConsoleAligned(current.audioSettings, syncedAt),
  }));

  eventEmitter.emit("update");
  return jsonResponse(req, { synced: true, syncedAt, audioSettings: updated.audioSettings });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
