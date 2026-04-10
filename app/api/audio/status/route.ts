import { readDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import { withGetHandler } from "@/lib/api";
import { isOscConnected, isOscRecoveryExhausted } from "@/lib/osc";

export const dynamic = "force-dynamic";

export const GET = withGetHandler(async (req: Request) => {
  const db = readDB();
  const settings = db.audioSettings;

  return Response.json(
    {
      connected: isOscConnected(),
      enabled: settings.oscEnabled,
      oscSendHost: settings.oscSendHost,
      oscSendPort: settings.oscSendPort,
      oscReceivePort: settings.oscReceivePort,
      recoveryExhausted: isOscRecoveryExhausted(),
    },
    { headers: getCorsHeaders(req) }
  );
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
