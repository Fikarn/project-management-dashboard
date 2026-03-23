import type { Light, LightingSettings, ColorMode } from "./types";
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

export async function sendDmxFrame(lights: Light[], lightingSettings: LightingSettings): Promise<void> {
  if (!lightingSettings.dmxEnabled) return;

  // Auto-recover sender if it was lost
  if (!global.dmxSender && global.dmxLastSettings) {
    await tryAutoReinit();
  }

  if (!global.dmxSender) return;

  const channelData: Record<number, number> = {};

  for (const light of lights) {
    // Use live state if available, else use persisted values
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

    if (config.channelCount === 8) {
      // Infinibar PB12: 8-channel CCT & RGB mode (Mode 1)
      // Ch1=Dimmer, Ch2=CCT, Ch3=Color Mix (0=CCT, 255=RGB), Ch4=R, Ch5=G, Ch6=B, Ch7=Effect, Ch8=Effect Speed
      channelData[addr] = on ? intensityToDmx(intensity) : 0;
      channelData[addr + 1] = cctToDmx(cct, cctMin, cctMax);
      channelData[addr + 2] = colorMode === "rgb" ? 255 : 0;
      channelData[addr + 3] = on && colorMode === "rgb" ? Math.max(0, Math.min(255, red)) : 0;
      channelData[addr + 4] = on && colorMode === "rgb" ? Math.max(0, Math.min(255, green)) : 0;
      channelData[addr + 5] = on && colorMode === "rgb" ? Math.max(0, Math.min(255, blue)) : 0;
      channelData[addr + 6] = 0; // No effect
      channelData[addr + 7] = 0; // Default speed
    } else if (config.channelCount === 4) {
      // Infinimat 2x4 Profile 2 (CCT 8-bit): 4-channel
      // Ch1=Intensity, Ch2=CCT, Ch3=±Green, Ch4=Strobe (always open)
      channelData[addr] = on ? intensityToDmx(intensity) : 0;
      channelData[addr + 1] = cctToDmx(cct, cctMin, cctMax);
      channelData[addr + 2] = gmTintToDmx(gmTint);
      channelData[addr + 3] = 0; // Strobe: 0 = open (no strobe)
    } else {
      // Astra Bi-Color: 2-channel (intensity + CCT)
      channelData[addr] = on ? intensityToDmx(intensity) : 0;
      channelData[addr + 1] = cctToDmx(cct, cctMin, cctMax);
    }
  }

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
