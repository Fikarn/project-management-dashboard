import type { Light, LightingSettings } from "./types";

type SacnSenderType = any; // eslint-disable-line

interface LiveState {
  intensity: number;
  cct: number;
  on: boolean;
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
}

global.dmxLiveState = global.dmxLiveState ?? new Map<string, LiveState>();

export async function initDmx(ip: string, universe: number): Promise<void> {
  await destroyDmx();
  try {
    const { Sender } = await import("sacn");
    global.dmxSender = new Sender({
      universe,
      reuseAddr: true,
      useUnicastDestination: ip,
    });
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

function intensityToDmx(percent: number): number {
  return Math.round(Math.max(0, Math.min(100, percent)) * 2.55);
}

function cctToDmx(kelvin: number): number {
  // Map 2700-6500K → 0-255 (warm→cool)
  const clamped = Math.max(2700, Math.min(6500, kelvin));
  return Math.round(((clamped - 2700) / (6500 - 2700)) * 255);
}

export function updateLiveState(lightId: string, values: Partial<LiveState>): void {
  const current = global.dmxLiveState!.get(lightId) ?? { intensity: 0, cct: 4500, on: false };
  global.dmxLiveState!.set(lightId, { ...current, ...values });
}

export function getLiveState(lightId: string): LiveState | undefined {
  return global.dmxLiveState?.get(lightId);
}

export function clearLiveState(lightId: string): void {
  global.dmxLiveState?.delete(lightId);
}

export async function sendDmxFrame(lights: Light[], lightingSettings: LightingSettings): Promise<void> {
  if (!global.dmxSender || !lightingSettings.dmxEnabled) return;

  const channelData: Record<number, number> = {};

  for (const light of lights) {
    // Use live state if available, else use persisted values
    const live = global.dmxLiveState?.get(light.id);
    const intensity = live?.intensity ?? light.intensity;
    const cct = live?.cct ?? light.cct;
    const on = live?.on ?? light.on;

    const addr = light.dmxStartAddress;
    channelData[addr] = on ? intensityToDmx(intensity) : 0;
    channelData[addr + 1] = cctToDmx(cct);
  }

  try {
    await global.dmxSender.send({
      payload: channelData,
      sourceName: "EdvinProjectManager",
      priority: 100,
    });
  } catch (err) {
    console.error("Failed to send sACN frame:", err);
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
