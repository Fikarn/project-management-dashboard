import type { AudioChannel, AudioSettings, AudioMeterData } from "./types";

type OscClientType = InstanceType<typeof import("node-osc").Client>;
type OscServerType = InstanceType<typeof import("node-osc").Server>;

/** Partial audio channel values used during live slider drags. */
interface OscLiveState {
  gain: number;
  fader: number;
  mute: boolean;
  solo: boolean;
  phantom: boolean;
  phase: boolean;
  pad: boolean;
  loCut: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var oscClient: OscClientType | undefined;
  // eslint-disable-next-line no-var
  var oscServer: OscServerType | undefined;
  // eslint-disable-next-line no-var
  var oscLiveState: Map<string, Partial<OscLiveState>> | undefined;
  // eslint-disable-next-line no-var
  var oscMeterData: Map<string, AudioMeterData> | undefined;
  // eslint-disable-next-line no-var
  var oscSendTimer: ReturnType<typeof setTimeout> | undefined;
  // eslint-disable-next-line no-var
  var oscPendingSend: boolean | undefined;
  // eslint-disable-next-line no-var
  var oscReinitAttempts: number[] | undefined;
  // eslint-disable-next-line no-var
  var oscLastSettings: { host: string; sendPort: number; receivePort: number } | undefined;
}

global.oscLiveState = global.oscLiveState ?? new Map<string, Partial<OscLiveState>>();
global.oscMeterData = global.oscMeterData ?? new Map<string, AudioMeterData>();
global.oscReinitAttempts = global.oscReinitAttempts ?? [];

// ─── OSC Address Constants ──────────────────────────────────────────
// Based on RME TotalMix FX OSC protocol + streamdeck-totalmix reference.
// Addresses verified for TotalMix FX input channels (submix 1).
const OSC_ADDRESSES = {
  volume: (ch: number) => `/1/volume${ch}`,
  mute: (ch: number) => `/1/mute${ch}`,
  solo: (ch: number) => `/1/solo${ch}`,
  phantom: (ch: number) => `/1/phantomEnable${ch}`,
  phase: (ch: number) => `/1/phaseEnable${ch}`,
  gain: (ch: number) => `/1/gain${ch}`,
  pad: (ch: number) => `/1/pad${ch}`,
  loCut: (ch: number) => `/1/locut${ch}`,
  snapshotRecall: "/setBankStart",
} as const;

const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

export function isValidOscHost(host: string): boolean {
  if (host === "localhost") return true;
  const match = IPV4_REGEX.exec(host);
  if (!match) return false;
  return match.slice(1).every((octet) => {
    const n = parseInt(octet, 10);
    return n >= 0 && n <= 255;
  });
}

export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

// ─── Rate-limited auto-recovery ─────────────────────────────────────
const MAX_REINIT_PER_MINUTE = 3;

function canAttemptReinit(): boolean {
  const now = Date.now();
  const attempts = global.oscReinitAttempts ?? [];
  // Remove attempts older than 60s
  global.oscReinitAttempts = attempts.filter((t) => now - t < 60_000);
  return global.oscReinitAttempts.length < MAX_REINIT_PER_MINUTE;
}

function recordReinitAttempt(): void {
  global.oscReinitAttempts = global.oscReinitAttempts ?? [];
  global.oscReinitAttempts.push(Date.now());
}

export function isOscRecoveryExhausted(): boolean {
  return !canAttemptReinit();
}

// ─── Init / Destroy ─────────────────────────────────────────────────

export async function initOsc(host: string, sendPort: number, receivePort: number): Promise<void> {
  // Destroy existing connections first
  await destroyOsc();

  try {
    const { Client, Server } = await import("node-osc");

    global.oscClient = new Client(host, sendPort);
    global.oscClient.on("error", (err: Error) => {
      console.error("OSC Client error:", err.message);
    });

    global.oscServer = new Server(receivePort, "0.0.0.0");
    global.oscServer.on("error", (err: Error) => {
      console.error("OSC Server error:", err.message);
    });

    // Listen for metering data from TotalMix
    global.oscServer.on("message", (msg: unknown[]) => {
      handleIncomingOsc(msg);
    });

    global.oscLastSettings = { host, sendPort, receivePort };
    console.log(`OSC initialized: sending to ${host}:${sendPort}, receiving on port ${receivePort}`);
  } catch (err) {
    console.error("Failed to initialize OSC:", err);
    global.oscClient = undefined;
    global.oscServer = undefined;
    throw err;
  }
}

export async function destroyOsc(): Promise<void> {
  if (global.oscSendTimer) {
    clearTimeout(global.oscSendTimer);
    global.oscSendTimer = undefined;
  }
  global.oscPendingSend = false;

  if (global.oscClient) {
    try {
      await global.oscClient.close();
    } catch {
      /* ignore close errors */
    }
    global.oscClient = undefined;
  }
  if (global.oscServer) {
    try {
      await global.oscServer.close();
    } catch {
      /* ignore close errors */
    }
    global.oscServer = undefined;
  }
}

export function isOscConnected(): boolean {
  return global.oscClient !== undefined;
}

// ─── OSC Send Functions ─────────────────────────────────────────────

async function oscSend(address: string, ...args: (number | string)[]): Promise<void> {
  const client = global.oscClient;
  if (!client) return;

  try {
    await client.send(address, ...args);
  } catch (err) {
    console.error(`OSC send failed [${address}]:`, err);
    // Destroy broken client; will auto-reinit on next call
    try {
      await client.close();
    } catch {
      /* ignore */
    }
    global.oscClient = undefined;
    throw err;
  }
}

async function tryAutoReinit(): Promise<boolean> {
  if (!global.oscLastSettings) return false;
  if (!canAttemptReinit()) {
    console.warn("OSC reinit rate limit reached (3/min)");
    return false;
  }
  recordReinitAttempt();
  try {
    const { host, sendPort, receivePort } = global.oscLastSettings;
    await initOsc(host, sendPort, receivePort);
    return true;
  } catch {
    return false;
  }
}

/** Ensure the client is available, attempting reinit if needed. */
async function ensureClient(): Promise<boolean> {
  if (global.oscClient) return true;
  return tryAutoReinit();
}

/**
 * Map gain dB (0-75) to OSC float (0.0-1.0).
 * TotalMix expects gain as a normalized float.
 */
function gainDbToOsc(db: number): number {
  return Math.max(0, Math.min(1, db / 75));
}

export async function sendOscGain(channel: number, gainDb: number): Promise<void> {
  if (!(await ensureClient())) return;
  try {
    await oscSend(OSC_ADDRESSES.gain(channel), gainDbToOsc(gainDb));
  } catch {
    /* logged in oscSend */
  }
}

export async function sendOscFader(channel: number, value: number): Promise<void> {
  if (!(await ensureClient())) return;
  try {
    await oscSend(OSC_ADDRESSES.volume(channel), Math.max(0, Math.min(1, value)));
  } catch {
    /* logged in oscSend */
  }
}

export async function sendOscToggle(
  type: "mute" | "solo" | "phantom" | "phase" | "pad" | "loCut",
  channel: number,
  value: boolean
): Promise<void> {
  if (!(await ensureClient())) return;
  const addressFn = OSC_ADDRESSES[type];
  try {
    await oscSend(addressFn(channel), value ? 1 : 0);
  } catch {
    /* logged in oscSend */
  }
}

export async function sendOscSnapshotRecall(index: number): Promise<void> {
  if (!(await ensureClient())) return;
  try {
    await oscSend(OSC_ADDRESSES.snapshotRecall, index);
  } catch {
    /* logged in oscSend */
  }
}

/**
 * Send all current channel values to TotalMix to sync state.
 * Called on OSC init and page mount.
 */
export async function syncAllChannels(channels: AudioChannel[]): Promise<void> {
  if (!(await ensureClient())) return;

  for (const ch of channels) {
    try {
      await oscSend(OSC_ADDRESSES.gain(ch.oscChannel), gainDbToOsc(ch.gain));
      await oscSend(OSC_ADDRESSES.volume(ch.oscChannel), ch.fader);
      await oscSend(OSC_ADDRESSES.mute(ch.oscChannel), ch.mute ? 1 : 0);
      await oscSend(OSC_ADDRESSES.solo(ch.oscChannel), ch.solo ? 1 : 0);
      await oscSend(OSC_ADDRESSES.phantom(ch.oscChannel), ch.phantom ? 1 : 0);
      await oscSend(OSC_ADDRESSES.phase(ch.oscChannel), ch.phase ? 1 : 0);
      await oscSend(OSC_ADDRESSES.pad(ch.oscChannel), ch.pad ? 1 : 0);
      await oscSend(OSC_ADDRESSES.loCut(ch.oscChannel), ch.loCut ? 1 : 0);
    } catch {
      // First failure already destroys the client via oscSend; stop syncing
      break;
    }
  }
}

// ─── Live State (in-memory during slider drag) ──────────────────────

export function updateOscLiveState(channelId: string, values: Partial<OscLiveState>): void {
  const map = global.oscLiveState ?? new Map<string, Partial<OscLiveState>>();
  const existing = map.get(channelId) ?? ({} as Partial<OscLiveState>);
  map.set(channelId, { ...existing, ...values });
  global.oscLiveState = map;
}

export function getOscLiveState(channelId: string): Partial<OscLiveState> | undefined {
  return global.oscLiveState?.get(channelId);
}

export function clearOscLiveState(channelId: string): void {
  global.oscLiveState?.delete(channelId);
}

// ─── Throttled Send (for slider drag) ───────────────────────────────

const OSC_THROTTLE_MS = 25;

/**
 * Send OSC values for a channel, throttled.
 * Used during slider drag for real-time feedback without overwhelming UDP.
 */
export function sendOscThrottled(channel: AudioChannel, values: Partial<OscLiveState>): void {
  updateOscLiveState(channel.id, values);

  if (global.oscPendingSend) return;
  global.oscPendingSend = true;

  global.oscSendTimer = setTimeout(async () => {
    global.oscPendingSend = false;
    const live = getOscLiveState(channel.id);
    if (!live) return;

    try {
      if (live.gain !== undefined) await sendOscGain(channel.oscChannel, live.gain);
      if (live.fader !== undefined) await sendOscFader(channel.oscChannel, live.fader);
      if (live.mute !== undefined) await sendOscToggle("mute", channel.oscChannel, live.mute);
      if (live.solo !== undefined) await sendOscToggle("solo", channel.oscChannel, live.solo);
      if (live.phantom !== undefined) await sendOscToggle("phantom", channel.oscChannel, live.phantom);
      if (live.phase !== undefined) await sendOscToggle("phase", channel.oscChannel, live.phase);
      if (live.pad !== undefined) await sendOscToggle("pad", channel.oscChannel, live.pad);
      if (live.loCut !== undefined) await sendOscToggle("loCut", channel.oscChannel, live.loCut);
    } catch {
      /* logged in individual sends */
    }
  }, OSC_THROTTLE_MS);
}

// ─── Metering ───────────────────────────────────────────────────────

function handleIncomingOsc(msg: unknown[]): void {
  if (!Array.isArray(msg) || msg.length < 2) return;

  const address = msg[0] as string;
  const value = msg[1] as number;

  // TotalMix sends metering on various addresses. Parse channel from address.
  // Typical format: /1/level{channel} or similar
  const meterMatch = /^\/1\/level(\d+)$/.exec(address);
  if (meterMatch) {
    const ch = parseInt(meterMatch[1], 10);
    const meterMap = global.oscMeterData ?? new Map<string, AudioMeterData>();
    // Store by oscChannel number; the API will map to channelId
    meterMap.set(String(ch), { channelId: String(ch), level: Math.max(0, Math.min(1, value)) });
    global.oscMeterData = meterMap;
  }
}

export function getMeterData(): Map<string, AudioMeterData> {
  return global.oscMeterData ?? new Map();
}

export function clearMeterData(): void {
  global.oscMeterData = new Map();
}

// ─── Validation helpers (re-exported for route use) ─────────────────

export function validateGain(gain: number): boolean {
  return Number.isFinite(gain) && gain >= 0 && gain <= 75;
}

export function validateFader(fader: number): boolean {
  return Number.isFinite(fader) && fader >= 0 && fader <= 1;
}

export function validateOscChannel(ch: number): boolean {
  return Number.isInteger(ch) && ch >= 1 && ch <= 128;
}

export function validateSnapshotIndex(idx: number): boolean {
  return Number.isInteger(idx) && idx >= 0 && idx <= 7;
}
