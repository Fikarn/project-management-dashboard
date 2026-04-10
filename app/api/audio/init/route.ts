import { readDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import { withErrorHandling } from "@/lib/api";
import { initOsc, isOscConnected, syncAllChannels } from "@/lib/osc";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (req) => {
  const db = readDB();
  const settings = db.audioSettings;

  if (!settings.oscEnabled) {
    return Response.json({ initialized: false, enabled: false }, { headers: getCorsHeaders(req) });
  }

  try {
    if (!isOscConnected()) {
      await initOsc(settings.oscSendHost, settings.oscSendPort, settings.oscReceivePort);
    }
    // Sync all current channel values to TotalMix
    await syncAllChannels(db.audioChannels);
    return Response.json({ initialized: true, enabled: true }, { headers: getCorsHeaders(req) });
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
