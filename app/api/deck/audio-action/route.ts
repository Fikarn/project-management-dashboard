import { readDB, mutateDB } from "@/lib/db";
import eventEmitter from "@/lib/events";
import { getCorsHeaders } from "@/lib/cors";
import { withErrorHandling } from "@/lib/api";
import { sendOscChannelUpdate, sendOscSnapshotRecall } from "@/lib/osc";
import type { DeckMode } from "@/lib/types";

const GAIN_STEP = 3; // dB per dial tick

export const POST = withErrorHandling(async (req) => {
  const body = await req.json();
  const action: string = body.action;

  if (!action) {
    return Response.json({ error: "action is required" }, { status: 400, headers: getCorsHeaders(req) });
  }

  let result: Record<string, unknown> = {};

  switch (action) {
    // ── Deck mode switch ────────────────────────────────
    case "switchToDeckMode": {
      const mode: DeckMode = body.value;
      await mutateDB((db) => ({
        ...db,
        settings: { ...db.settings, deckMode: mode },
      }));
      eventEmitter.emit("update");
      result = { deckMode: mode };
      break;
    }

    // ── Mute toggle by channel index ────────────────────
    case "toggleMute": {
      const chIdx = parseInt(body.value, 10);
      const db = await mutateDB((db) => {
        const sorted = [...db.audioChannels].sort((a, b) => a.order - b.order);
        const ch = sorted[chIdx - 1];
        if (!ch) return db;
        return {
          ...db,
          audioChannels: db.audioChannels.map((c) => (c.id === ch.id ? { ...c, mute: !c.mute } : c)),
        };
      });
      const sorted = [...db.audioChannels].sort((a, b) => a.order - b.order);
      const ch = sorted[chIdx - 1];
      const selectedMixTarget =
        db.audioMixTargets.find((target) => target.id === db.audioSettings.selectedMixTargetId) ?? null;
      if (ch) {
        try {
          await sendOscChannelUpdate(ch, { mute: ch.mute }, selectedMixTarget?.oscChannel);
        } catch {
          /* OSC failure non-blocking */
        }
      }
      eventEmitter.emit("update");
      result = { channel: ch?.name, mute: ch?.mute };
      break;
    }

    // ── Phantom toggle by channel index ─────────────────
    case "togglePhantom": {
      const chIdx = parseInt(body.value, 10);
      const db = await mutateDB((db) => {
        const sorted = [...db.audioChannels].sort((a, b) => a.order - b.order);
        const ch = sorted[chIdx - 1];
        if (!ch) return db;
        return {
          ...db,
          audioChannels: db.audioChannels.map((c) => (c.id === ch.id ? { ...c, phantom: !c.phantom } : c)),
        };
      });
      const sorted = [...db.audioChannels].sort((a, b) => a.order - b.order);
      const ch = sorted[chIdx - 1];
      if (ch) {
        try {
          await sendOscChannelUpdate(ch, { phantom: ch.phantom });
        } catch {
          /* OSC failure non-blocking */
        }
      }
      eventEmitter.emit("update");
      result = { channel: ch?.name, phantom: ch?.phantom };
      break;
    }

    // ── Gain up/down by channel index ───────────────────
    case "gainUp":
    case "gainDown": {
      const chIdx = parseInt(body.value, 10);
      const delta = action === "gainUp" ? GAIN_STEP : -GAIN_STEP;
      const db = await mutateDB((db) => {
        const sorted = [...db.audioChannels].sort((a, b) => a.order - b.order);
        const ch = sorted[chIdx - 1];
        if (!ch) return db;
        const newGain = Math.max(0, Math.min(75, ch.gain + delta));
        return {
          ...db,
          audioChannels: db.audioChannels.map((c) => (c.id === ch.id ? { ...c, gain: newGain } : c)),
        };
      });
      const sorted = [...db.audioChannels].sort((a, b) => a.order - b.order);
      const ch = sorted[chIdx - 1];
      if (ch) {
        try {
          await sendOscChannelUpdate(ch, { gain: ch.gain });
        } catch {
          /* OSC failure non-blocking */
        }
      }
      eventEmitter.emit("update");
      result = { channel: ch?.name, gain: ch?.gain };
      break;
    }

    // ── Snapshot recall ─────────────────────────────────
    case "recallSnapshot": {
      const db = readDB();
      const sorted = [...db.audioSnapshots].sort((a, b) => a.order - b.order);
      // Recall the first snapshot if no selection concept for deck
      const snap = sorted[0];
      if (snap) {
        try {
          await sendOscSnapshotRecall(snap.oscIndex);
        } catch {
          /* OSC failure non-blocking */
        }
        result = { recalled: snap.name };
      }
      break;
    }

    default:
      return Response.json({ error: `Unknown action: ${action}` }, { status: 400, headers: getCorsHeaders(req) });
  }

  return Response.json(result, { headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
