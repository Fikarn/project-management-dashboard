import type { Light, LightingSettings, LightEffect } from "./types";
import { sendDmxFrame } from "./dmx";

declare global {
  // eslint-disable-next-line no-var
  var effectInterval: ReturnType<typeof setInterval> | undefined;
  // eslint-disable-next-line no-var
  var effectLights: Map<string, { light: Light; effect: LightEffect }> | undefined;
  // eslint-disable-next-line no-var
  var effectLightingSettings: LightingSettings | undefined;
  // eslint-disable-next-line no-var
  var effectStartTime: number | undefined;
}

global.effectLights = global.effectLights ?? new Map();

const EFFECT_FPS = 30;
const EFFECT_INTERVAL = Math.round(1000 / EFFECT_FPS);

/**
 * Compute the intensity multiplier (0-1) for an effect at a given time.
 * The base light intensity is multiplied by this value.
 */
function computeEffect(effect: LightEffect, timeMs: number): number {
  // Speed maps to frequency: speed 1 = 0.5Hz, speed 10 = 5Hz
  const freq = 0.5 + ((effect.speed - 1) / 9) * 4.5;
  const phase = (timeMs / 1000) * freq * Math.PI * 2;

  switch (effect.type) {
    case "pulse": {
      // Smooth sine wave from 0.15 to 1.0
      return 0.15 + 0.85 * ((Math.sin(phase) + 1) / 2);
    }
    case "strobe": {
      // Hard on/off toggle
      return Math.sin(phase) > 0 ? 1.0 : 0.0;
    }
    case "candle": {
      // Random flicker with warm bias — combine multiple sine waves + noise
      const base = 0.4 + 0.3 * Math.sin(phase * 0.7);
      const flicker = 0.15 * Math.sin(phase * 3.3) + 0.15 * Math.sin(phase * 7.1);
      // Pseudo-random component using the time
      const noise = 0.1 * Math.sin(timeMs * 0.013) * Math.cos(timeMs * 0.007);
      return Math.max(0.1, Math.min(1.0, base + flicker + noise));
    }
    default:
      return 1.0;
  }
}

/** Tick function called by the effect interval. */
function effectTick(): void {
  const lights = global.effectLights;
  const settings = global.effectLightingSettings;
  if (!lights || lights.size === 0 || !settings) {
    stopEffectLoop();
    return;
  }

  const now = Date.now() - (global.effectStartTime ?? Date.now());

  // Build modified light array with effect-modulated intensity
  const modifiedLights: Light[] = [];
  lights.forEach(({ light, effect }) => {
    const multiplier = computeEffect(effect, now);
    modifiedLights.push({
      ...light,
      intensity: Math.round(light.intensity * multiplier),
    });
  });

  sendDmxFrame(modifiedLights, settings).catch((err) => {
    console.error("Effect DMX send failed:", err);
  });
}

/** Start the effect loop if not already running. */
function startEffectLoop(): void {
  if (global.effectInterval) return;
  global.effectStartTime = Date.now();
  global.effectInterval = setInterval(effectTick, EFFECT_INTERVAL);
}

/** Stop the effect loop. */
function stopEffectLoop(): void {
  if (global.effectInterval) {
    clearInterval(global.effectInterval);
    global.effectInterval = undefined;
  }
  global.effectStartTime = undefined;
}

/**
 * Register a light with an active effect. Starts the loop if needed.
 * Pass the full light object and its lighting settings for DMX output.
 */
export function registerEffect(light: Light, effect: LightEffect, lightingSettings: LightingSettings): void {
  global.effectLights!.set(light.id, { light, effect });
  global.effectLightingSettings = lightingSettings;
  startEffectLoop();
}

/**
 * Unregister a light's effect. Stops the loop if no effects remain.
 * Sends one final DMX frame with the light's base intensity to restore it.
 */
export function unregisterEffect(light: Light, allLights: Light[], lightingSettings: LightingSettings): void {
  global.effectLights?.delete(light.id);

  if (!global.effectLights || global.effectLights.size === 0) {
    stopEffectLoop();
  }

  // Send a clean frame to restore the light to its base state
  sendDmxFrame(allLights, lightingSettings).catch((err) => {
    console.error("DMX send failed restoring light after effect:", err);
  });
}

/**
 * Update the cached light data for any running effects.
 * Called when light values change while effects are active.
 */
export function refreshEffectLight(light: Light): void {
  const entry = global.effectLights?.get(light.id);
  if (entry) {
    entry.light = light;
  }
}

/** Clear all effects (e.g., on shutdown). */
export function clearAllEffects(): void {
  stopEffectLoop();
  global.effectLights?.clear();
}

/** Check if a specific light has an active effect running. */
export function hasActiveEffect(lightId: string): boolean {
  return global.effectLights?.has(lightId) ?? false;
}
