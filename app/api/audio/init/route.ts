import { mutateDB, readDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import { withErrorHandling } from "@/lib/api";
import { markAudioConsoleAssumed } from "@/lib/audio-console";
import { initOsc, isOscConnected, primeOscTransport } from "@/lib/osc";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (req) => {
  let db = readDB();
  const settings = db.audioSettings;

  if (!settings.oscEnabled) {
    return Response.json({ initialized: false, enabled: false }, { headers: getCorsHeaders(req) });
  }

  if (settings.consoleStateConfidence === "aligned") {
    db = await mutateDB((current) => ({
      ...current,
      audioSettings: markAudioConsoleAssumed(current.audioSettings, "startup"),
    }));
  }

  try {
    if (!isOscConnected()) {
      await initOsc(db.audioSettings.oscSendHost, db.audioSettings.oscSendPort, db.audioSettings.oscReceivePort);
    }
    const selectedMixTarget =
      db.audioMixTargets.find((target) => target.id === db.audioSettings.selectedMixTargetId) ?? null;
    await primeOscTransport(selectedMixTarget?.oscChannel);
    return Response.json(
      {
        initialized: true,
        enabled: true,
        safeStartup: true,
      },
      { headers: getCorsHeaders(req) }
    );
  } catch (err) {
    console.error("OSC init failed:", err);
    return Response.json(
      { initialized: false, enabled: true, error: "OSC init failed" },
      { headers: getCorsHeaders(req) }
    );
  }
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
