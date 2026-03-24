import type { Light, LightingSettings, LightSceneEntry, ColorMode } from "./types";
import { getCctRange, getConfig } from "./light-types";
import net from "net";

type SacnSenderType = any; // eslint-disable-line

interface LiveState {
  intensity: number;
  cct: number;
  on: boolean;
  red: number;
  green: number;
  blue: number;
  colorMode: ColorMode;
  gmTint: number | null;
}

interface FadeState {
  interval: ReturnType<typeof setInterval>;
  startTime: number;
  durationMs: number;
  startStates: Map<string, LightSceneEntry>;
  targetStates: Map<string, LightSceneEntry>;
  lights: Light[];
  lightingSettings: LightingSettings;
  onComplete: () => void;
}

declare global {
  // eslint-disable-next-line no-var
  var dmxSender: SacnSenderType | undefined;
  // eslint-disable-next-line no-var
  var dmxLiveState: Map<string, LiveState> | undefined;
  // eslint-disable-next-line no-var
  var dmxSendTimer: ReturnType<typeof setTimeout> | undefined;
  // eslint-disable-next-line no-var
  var dmxPendingSend: boolean | undefined;
  // eslint-disable-next-line no-var
  var dmxNeedsReinit: boolean | undefined;
  // eslint-disable-next-line no-var
  var dmxReinitAttempts: number[] | undefined;
  // eslint-disable-next-line no-var
  var dmxLastSettings: { ip: string; universe: number } | undefined;
  // eslint-disable-next-line no-var
  var dmxFadeState: FadeState | undefined;
}

global.dmxLiveState = global.dmxLiveState ?? new Map<string, LiveState>();
global.dmxReinitAttempts = global.dmxReinitAttempts ?? [];

const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

export function isValidIpv4(ip: string): boolean {
  const match = IPV4_REGEX.exec(ip);
  if (!match) return false;
  return match.slice(1).every((octet) => {
    const n = parseInt(octet, 10);
    return n >= 0 && n <= 255;
  });
}

export function isValidUniverse(universe: number): boolean {
  return Number.isInteger(universe) && universe >= 1 && universe <= 63999;
}

export async function initDmx(ip: string, universe: number): Promise<void> {
  await destroyDmx();

  if (!isValidIpv4(ip)) {
    console.error(`Invalid Apollo Bridge IP: ${ip}`);
    return;
  }
  if (!isValidUniverse(universe)) {
    console.error(`Invalid DMX universe: ${universe}`);
    return;
  }

  try {
    const { Sender } = await import("sacn");
    global.dmxSender = new Sender({
      universe,
      reuseAddr: true,
      useUnicastDestination: ip,
      defaultPacketOptions: { useRawDmxValues: true },
    });
    global.dmxLastSettings = { ip, universe };
    global.dmxNeedsReinit = false;
  } catch (err) {
    console.error("Failed to init sACN sender:", err);
    global.dmxSender = undefined;
  }
}

export async function destroyDmx(): Promise<void> {
  if (global.dmxSendTimer) {
    clearTimeout(global.dmxSendTimer);
    global.dmxSendTimer = undefined;
    global.dmxPendingSend = false;
  }
  if (global.dmxSender) {
    try {
      global.dmxSender.close();
    } catch {
      // ignore
    }
    global.dmxSender = undefined;
  }
}

/** Check if auto-reinit is allowed (max 3 attempts per minute). */
function canAttemptReinit(): boolean {
  const now = Date.now();
  const attempts = global.dmxReinitAttempts ?? [];
  // Remove attempts older than 60s
  global.dmxReinitAttempts = attempts.filter((t) => now - t < 60000);
  return global.dmxReinitAttempts.length < 3;
}

/** Attempt to auto-recover the sACN sender. */
async function tryAutoReinit(): Promise<void> {
  if (!global.dmxLastSettings || !canAttemptReinit()) return;
  global.dmxReinitAttempts!.push(Date.now());
  const { ip, universe } = global.dmxLastSettings;
  console.warn(`sACN auto-recovery: reinitializing sender (${ip}, universe ${universe})`);
  await initDmx(ip, universe);
}

function intensityToDmx(percent: number): number {
  return Math.round(Math.max(0, Math.min(100, percent)) * 2.55);
}

function cctToDmx(kelvin: number, min: number, max: number): number {
  const clamped = Math.max(min, Math.min(max, kelvin));
  return Math.round(((clamped - min) / (max - min)) * 255);
}

/**
 * Convert ±green/magenta tint (-100..+100) to DMX value per Infinimat Profile 2.
 *   DMX 0-10:    No effect
 *   DMX 11-20:   Full minus green (-100%)
 *   DMX 21-119:  -99% to -1%
 *   DMX 120-145: Neutral (0%)
 *   DMX 146-244: +1% to +99%
 *   DMX 245-255: Full plus green (+100%)
 */
function gmTintToDmx(tint: number | null): number {
  if (tint === null || tint === 0) return 0; // "No Effect" range (0-10)
  const clamped = Math.max(-100, Math.min(100, Math.round(tint)));
  if (clamped <= -100) return 16;
  if (clamped < 0) return 119 + clamped + 1;
  if (clamped >= 100) return 250;
  return 145 + clamped;
}

export function updateLiveState(lightId: string, values: Partial<LiveState>): void {
  const current = global.dmxLiveState!.get(lightId) ?? ({} as Partial<LiveState>);
  global.dmxLiveState!.set(lightId, { ...current, ...values } as LiveState);
}

export function getLiveState(lightId: string): LiveState | undefined {
  return global.dmxLiveState?.get(lightId);
}

export function clearLiveState(lightId: string): void {
  global.dmxLiveState?.delete(lightId);
}

/** Compute DMX channel data for all lights (used by sendDmxFrame and DMX monitor). */
export function computeChannelData(lights: Light[], lightingSettings: LightingSettings): Record<number, number> {
  const channelData: Record<number, number> = {};
  const gm = (lightingSettings.grandMaster ?? 100) / 100;

  for (const light of lights) {
    const live = global.dmxLiveState?.get(light.id);
    const intensity = live?.intensity ?? light.intensity;
    const cct = live?.cct ?? light.cct;
    const on = live?.on ?? light.on;
    const red = live?.red ?? light.red;
    const green = live?.green ?? light.green;
    const blue = live?.blue ?? light.blue;
    const colorMode = live?.colorMode ?? light.colorMode;
    const gmTint = live?.gmTint ?? light.gmTint;

    const addr = light.dmxStartAddress;
    const [cctMin, cctMax] = getCctRange(light.type);
    const config = getConfig(light.type);

    const dimmerDmx = on ? Math.round(intensityToDmx(intensity) * gm) : 0;

    if (config.channelCount === 8) {
      channelData[addr] = dimmerDmx;
      channelData[addr + 1] = cctToDmx(cct, cctMin, cctMax);
      const useRgb = colorMode === "rgb" || colorMode === "hsi";
      channelData[addr + 2] = useRgb ? 255 : 0;
      channelData[addr + 3] = on && useRgb ? Math.max(0, Math.min(255, red)) : 0;
      channelData[addr + 4] = on && useRgb ? Math.max(0, Math.min(255, green)) : 0;
      channelData[addr + 5] = on && useRgb ? Math.max(0, Math.min(255, blue)) : 0;
      channelData[addr + 6] = 0;
      channelData[addr + 7] = 0;
    } else if (config.channelCount === 4) {
      channelData[addr] = dimmerDmx;
      channelData[addr + 1] = cctToDmx(cct, cctMin, cctMax);
      channelData[addr + 2] = gmTintToDmx(gmTint);
      channelData[addr + 3] = 0;
    } else {
      channelData[addr] = dimmerDmx;
      channelData[addr + 1] = cctToDmx(cct, cctMin, cctMax);
    }
  }

  return channelData;
}

export async function sendDmxFrame(lights: Light[], lightingSettings: LightingSettings): Promise<void> {
  if (!lightingSettings.dmxEnabled) return;

  if (!global.dmxSender && global.dmxLastSettings) {
    await tryAutoReinit();
  }

  if (!global.dmxSender) return;

  const channelData = computeChannelData(lights, lightingSettings);

  try {
    await global.dmxSender.send({
      payload: channelData,
      sourceName: "EdvinProjectManager",
      priority: 100,
    });
  } catch (err) {
    console.error("Failed to send sACN frame, destroying sender for auto-recovery:", err);
    await destroyDmx();
    global.dmxNeedsReinit = true;
  }
}

/** Throttled send — debounces to ~25ms intervals */
export function sendDmxFrameThrottled(lights: Light[], lightingSettings: LightingSettings): void {
  global.dmxPendingSend = true;
  if (global.dmxSendTimer) return;
  global.dmxSendTimer = setTimeout(() => {
    global.dmxSendTimer = undefined;
    if (global.dmxPendingSend) {
      global.dmxPendingSend = false;
      sendDmxFrame(lights, lightingSettings);
    }
  }, 25);
}

export function isDmxConnected(): boolean {
  return !!global.dmxSender;
}

/** Cancel any running scene fade. */
export function cancelFade(): void {
  if (global.dmxFadeState) {
    clearInterval(global.dmxFadeState.interval);
    global.dmxFadeState = undefined;
  }
}

/** Check if a scene fade is currently running. */
export function isFading(): boolean {
  return !!global.dmxFadeState;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Start a scene fade: interpolate from current light states to target scene states
 * over `durationMs` milliseconds, sending DMX frames at ~30fps.
 * On completion, calls `onComplete` (used to persist final values and emit SSE).
 */
export function startFade(
  lights: Light[],
  targetStates: LightSceneEntry[],
  lightingSettings: LightingSettings,
  durationMs: number,
  onComplete: () => void
): void {
  // Cancel any existing fade
  cancelFade();

  // Snapshot current states as starting points
  const startMap = new Map<string, LightSceneEntry>();
  for (const light of lights) {
    startMap.set(light.id, {
      lightId: light.id,
      intensity: light.intensity,
      cct: light.cct,
      on: light.on,
      red: light.red,
      green: light.green,
      blue: light.blue,
      colorMode: light.colorMode,
      gmTint: light.gmTint,
    });
  }

  const targetMap = new Map<string, LightSceneEntry>();
  for (const ts of targetStates) {
    targetMap.set(ts.lightId, ts);
  }

  const startTime = Date.now();
  const FRAME_INTERVAL = 33; // ~30fps

  const interval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(1, elapsed / durationMs);
    // Ease in-out for smooth transitions
    const t = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    // Build interpolated lights for DMX frame
    const interpolated: Light[] = lights.map((light) => {
      const start = startMap.get(light.id);
      const target = targetMap.get(light.id);
      if (!start || !target) return light;

      return {
        ...light,
        intensity: Math.round(lerp(start.intensity, target.intensity, t)),
        cct: Math.round(lerp(start.cct, target.cct, t)),
        on: t >= 0.5 ? target.on : start.on, // Switch on/off at midpoint
        red: Math.round(lerp(start.red, target.red, t)),
        green: Math.round(lerp(start.green, target.green, t)),
        blue: Math.round(lerp(start.blue, target.blue, t)),
        colorMode: t >= 0.5 ? target.colorMode : start.colorMode,
        gmTint:
          start.gmTint !== null && target.gmTint !== null
            ? Math.round(lerp(start.gmTint, target.gmTint, t))
            : t >= 0.5
              ? target.gmTint
              : start.gmTint,
      };
    });

    // Send interpolated DMX frame (fire-and-forget, don't block interval)
    sendDmxFrame(interpolated, lightingSettings).catch((err) => {
      console.error("DMX send failed during fade:", err);
    });

    // Fade complete
    if (progress >= 1) {
      cancelFade();
      onComplete();
    }
  }, FRAME_INTERVAL);

  global.dmxFadeState = {
    interval,
    startTime,
    durationMs,
    startStates: startMap,
    targetStates: targetMap,
    lights,
    lightingSettings,
    onComplete,
  };
}

/** Probe whether the Apollo Bridge IP is reachable on the network. */
export function checkBridgeReachable(ip: string, timeoutMs = 2000): Promise<boolean> {
  if (!isValidIpv4(ip)) return Promise.resolve(false);

  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);

    // Try TCP connect on port 80 — ECONNREFUSED still means host is reachable
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", (err: NodeJS.ErrnoException) => {
      socket.destroy();
      resolve(err.code === "ECONNREFUSED");
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(80, ip);
  });
}
