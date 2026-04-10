import { mutateDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { withErrorHandling } from "@/lib/api";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (req) => {
  const body = await req.json();
  const ids: string[] | undefined = body.ids;

  if (!Array.isArray(ids) || ids.length === 0) {
    return Response.json({ error: "ids must be a non-empty array" }, { status: 400, headers: getCorsHeaders(req) });
  }

  await mutateDB((db) => {
    const channels = [...db.audioChannels];
    const orderMap = new Map(ids.map((id, i) => [id, i]));
    channels.forEach((ch) => {
      const newOrder = orderMap.get(ch.id);
      if (newOrder !== undefined) ch.order = newOrder;
    });
    return { ...db, audioChannels: channels };
  });

  eventEmitter.emit("update");
  return Response.json({ success: true }, { headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
