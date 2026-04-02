import { readDB, mutateDB } from "@/lib/db";
import { getCorsHeaders } from "@/lib/cors";
import eventEmitter from "@/lib/events";
import { sendDmxFrame, updateLiveState, sendDmxFrameThrottled } from "@/lib/dmx";
import { getCctRange, getConfig, supportsRgb, supportsGm } from "@/lib/light-types";
import { withErrorHandling } from "@/lib/api";

/**
 * Stream Deck+ dial endpoint.
 * Companion sends HTTP POST on dial rotation/press.
 *
 * Body: { dial: 1-4, delta: number, press: boolean }
 *   dial 1 = Intensity (rotate = adjust %, press = toggle on/off)
 *   dial 2 = CCT (rotate = adjust K, press = reset to neutral)
 *   dial 3 = Red (rotate = adjust 0-255, press = reset; no-op for non-RGB)
 *   dial 4 = Green/Blue (rotate = adjust, press = cycle Green→Blue)
 */

// Track which channel dial 4 controls per session
let dial4Mode: "green" | "blue" = "green";

export const POST = withErrorHandling(async (req) => {
  const body = await req.json();
  const { dial, delta, press } = body as { dial: number; delta: number; press: boolean };

  if (!dial || dial < 1 || dial > 4) {
    return Response.json({ error: "dial must be 1-4" }, { status: 400, headers: getCorsHeaders(req) });
  }

  const db = readDB();
  const lid = db.lightingSettings.selectedLightId;
  if (!lid) {
    return Response.json({ error: "No light selected" }, { status: 400, headers: getCorsHeaders(req) });
  }

  const light = db.lights.find((l) => l.id === lid);
  if (!light) {
    return Response.json({ error: "Selected light not found" }, { status: 404, headers: getCorsHeaders(req) });
  }

  const hasRgb = supportsRgb(light.type);
  const hasGm = supportsGm(light.type);

  // ── Dial 1: Intensity ──────────────────────────────
  if (dial === 1) {
    if (press) {
      // Toggle on/off — persists to disk
      const updated = await mutateDB((db) => ({
        ...db,
        lights: db.lights.map((l) => (l.id === lid ? { ...l, on: !l.on } : l)),
      }));
      await sendDmxFrame(updated.lights, updated.lightingSettings);
      eventEmitter.emit("update");
      return Response.json({ toggled: true, on: !light.on }, { headers: getCorsHeaders(req) });
    }

    // Rotate: adjust intensity via live state (no disk write)
    const newIntensity = Math.max(0, Math.min(100, light.intensity + (delta ?? 0) * 2));
    updateLiveState(lid, { intensity: newIntensity });
    sendDmxFrameThrottled(db.lights, db.lightingSettings);
    return Response.json({ intensity: newIntensity }, { headers: getCorsHeaders(req) });
  }

  // ── Dial 2: CCT ────────────────────────────────────
  if (dial === 2) {
    const [cctMin, cctMax] = getCctRange(light.type);
    if (press) {
      // Reset to neutral CCT — persists to disk
      const defaultCct = getConfig(light.type).defaultCct;
      const updated = await mutateDB((db) => ({
        ...db,
        lights: db.lights.map((l) => (l.id === lid ? { ...l, cct: defaultCct } : l)),
      }));
      await sendDmxFrame(updated.lights, updated.lightingSettings);
      eventEmitter.emit("update");
      return Response.json({ cct: defaultCct }, { headers: getCorsHeaders(req) });
    }

    const newCct = Math.max(cctMin, Math.min(cctMax, light.cct + (delta ?? 0) * 50));
    updateLiveState(lid, { cct: newCct });
    sendDmxFrameThrottled(db.lights, db.lightingSettings);
    return Response.json({ cct: newCct }, { headers: getCorsHeaders(req) });
  }

  // ── Dial 3: Red (RGB lights) or ±G/M Tint (Infinimat) ──
  if (dial === 3) {
    if (hasGm && !hasRgb) {
      // Infinimat: ±Green/Magenta tint control
      if (press) {
        const updated = await mutateDB((db) => ({
          ...db,
          lights: db.lights.map((l) => (l.id === lid ? { ...l, gmTint: 0 } : l)),
        }));
        await sendDmxFrame(updated.lights, updated.lightingSettings);
        eventEmitter.emit("update");
        return Response.json({ gmTint: 0 }, { headers: getCorsHeaders(req) });
      }
      const newGmTint = Math.max(-100, Math.min(100, (light.gmTint ?? 0) + (delta ?? 0) * 2));
      updateLiveState(lid, { gmTint: newGmTint });
      sendDmxFrameThrottled(db.lights, db.lightingSettings);
      return Response.json({ gmTint: newGmTint }, { headers: getCorsHeaders(req) });
    }
    if (!hasRgb) {
      return Response.json(
        { skipped: true, reason: "Light does not support RGB or G/M tint" },
        { headers: getCorsHeaders(req) }
      );
    }
    if (press) {
      const updated = await mutateDB((db) => ({
        ...db,
        lights: db.lights.map((l) => (l.id === lid ? { ...l, red: 0 } : l)),
      }));
      await sendDmxFrame(updated.lights, updated.lightingSettings);
      eventEmitter.emit("update");
      return Response.json({ red: 0 }, { headers: getCorsHeaders(req) });
    }

    const newRed = Math.max(0, Math.min(255, light.red + (delta ?? 0) * 5));
    updateLiveState(lid, { red: newRed });
    sendDmxFrameThrottled(db.lights, db.lightingSettings);
    return Response.json({ red: newRed }, { headers: getCorsHeaders(req) });
  }

  // ── Dial 4: Green / Blue (press to cycle) ──────────
  if (dial === 4) {
    if (!hasRgb) {
      return Response.json({ skipped: true, reason: "Light does not support RGB" }, { headers: getCorsHeaders(req) });
    }
    if (press) {
      // Cycle between green and blue control
      dial4Mode = dial4Mode === "green" ? "blue" : "green";
      return Response.json({ dial4Mode }, { headers: getCorsHeaders(req) });
    }

    const channel = dial4Mode;
    const current = channel === "green" ? light.green : light.blue;
    const newVal = Math.max(0, Math.min(255, current + (delta ?? 0) * 5));
    updateLiveState(lid, { [channel]: newVal });
    sendDmxFrameThrottled(db.lights, db.lightingSettings);
    return Response.json({ [channel]: newVal, dial4Mode }, { headers: getCorsHeaders(req) });
  }

  return Response.json({ error: "Invalid dial" }, { status: 400, headers: getCorsHeaders(req) });
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
