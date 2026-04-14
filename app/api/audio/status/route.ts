import { readDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import { withGetHandler } from "@/lib/api";
import {
  getOscLastActivity,
  getOscMeterDiagnostics,
  isOscConnected,
  isOscRecoveryExhausted,
  isOscVerified,
} from "@/lib/osc";

export const dynamic = "force-dynamic";

export const GET = withGetHandler(async (req: Request) => {
  const db = readDB();
  const settings = db.audioSettings;
  const activity = getOscLastActivity();
  const meter = getOscMeterDiagnostics();
  const connected = isOscConnected();
  const verified = isOscVerified();
  const meteringState = !settings.oscEnabled
    ? "disabled"
    : !connected
      ? "offline"
      : verified
        ? "live"
        : meter.lastMeterAt
          ? "stale"
          : settings.expectedPeakData
            ? "awaiting-peak-data"
            : "transport-only";

  return Response.json(
    {
      connected,
      verified,
      enabled: settings.oscEnabled,
      oscSendHost: settings.oscSendHost,
      oscSendPort: settings.oscSendPort,
      oscReceivePort: settings.oscReceivePort,
      recoveryExhausted: isOscRecoveryExhausted(),
      lastMessageAt: activity.lastMessageAt ? new Date(activity.lastMessageAt).toISOString() : null,
      lastMeterAt: activity.lastMeterAt ? new Date(activity.lastMeterAt).toISOString() : null,
      lastInboundType: activity.lastInboundType,
      meteringState,
      activeMeterChannels: meter.freshChannels,
      staleMeterChannels: meter.staleChannels,
      clippedChannels: meter.clippedChannels,
      consoleStateConfidence: settings.consoleStateConfidence,
      lastConsoleSyncAt: settings.lastConsoleSyncAt,
      lastConsoleSyncReason: settings.lastConsoleSyncReason,
      lastSnapshotRecallAt: settings.lastSnapshotRecallAt,
    },
    { headers: getCorsHeaders(req) }
  );
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
