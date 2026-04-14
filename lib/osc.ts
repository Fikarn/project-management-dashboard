import type { AudioChannel, AudioMeterData, AudioMixTarget } from "./types";
import {
  getAudioBus,
  type AudioBus,
  supportsAutoSet,
  supportsGain,
  supportsInstrument,
  supportsPad,
  supportsPhase,
  supportsPhantom,
} from "./audio-console";

type OscClientType = InstanceType<typeof import("node-osc").Client>;
type OscServerType = InstanceType<typeof import("node-osc").Server>;

interface OscLiveState {
  gain?: number;
  fader?: number;
  mute?: boolean;
  solo?: boolean;
  phantom?: boolean;
  phase?: boolean;
  pad?: boolean;
  instrument?: boolean;
  autoSet?: boolean;
  mixTargetOscChannel?: number;
}

interface OscPendingState {
  channel: AudioChannel;
  values: Partial<OscLiveState>;
}

interface OscContext {
  bus: AudioBus;
  bankStart: number;
  submixIndex: number | null;
}

interface OscMeterState extends AudioMeterData {
  peakHoldAt: number | null;
  clipAt: number | null;
}

declare global {
  // eslint-disable-next-line no-var
  var oscClient: OscClientType | undefined;
  // eslint-disable-next-line no-var
  var oscServer: OscServerType | undefined;
  // eslint-disable-next-line no-var
  var oscLiveState: Map<string, OscPendingState> | undefined;
  // eslint-disable-next-line no-var
  var oscMeterData: Map<string, OscMeterState> | undefined;
  // eslint-disable-next-line no-var
  var oscSendTimer: ReturnType<typeof setTimeout> | undefined;
  // eslint-disable-next-line no-var
  var oscPendingSend: boolean | undefined;
  // eslint-disable-next-line no-var
  var oscReinitAttempts: number[] | undefined;
  // eslint-disable-next-line no-var
  var oscLastSettings: { host: string; sendPort: number; receivePort: number } | undefined;
  // eslint-disable-next-line no-var
  var oscContext: OscContext | undefined;
  // eslint-disable-next-line no-var
  var oscLastInboundAt: number | undefined;
  // eslint-disable-next-line no-var
  var oscLastInboundType: "meter" | "message" | undefined;
  // eslint-disable-next-line no-var
  var oscLastMeterAt: number | undefined;
}

global.oscLiveState = global.oscLiveState ?? new Map<string, OscPendingState>();
global.oscMeterData = global.oscMeterData ?? new Map<string, OscMeterState>();
global.oscReinitAttempts = global.oscReinitAttempts ?? [];
global.oscContext = global.oscContext ?? { bus: "input", bankStart: 0, submixIndex: null };

const OSC_NONE = {
  setSubmix: "/setSubmix",
  setBankStart: "/setBankStart",
} as const;

const OSC_PAGE1 = {
  busInput: "/1/busInput",
  busPlayback: "/1/busPlayback",
  busOutput: "/1/busOutput",
  volume: (slot: number) => `/1/volume${slot}`,
  masterVolume: "/1/mastervolume",
  mainDim: "/1/mainDim",
  mainMono: "/1/mainMono",
  mainTalkback: "/1/mainTalkback",
} as const;

const OSC_PAGE2 = {
  gain: "/2/gain",
  volume: "/2/volume",
  mute: "/2/mute",
  solo: "/2/solo",
  phantom: "/2/phantom",
  phase: "/2/phase",
  pad: "/2/pad",
  instrument: "/2/instrument",
  autoSet: "/2/autoset",
} as const;

const OSC_PAGE3 = {
  snapshot: (index: number) => `/3/snapshots/${8 - index}/1`,
} as const;

const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const MAX_REINIT_PER_MINUTE = 3;
const OSC_THROTTLE_MS = 25;
const METER_FRESH_MS = 3_000;
const METER_STALE_MS = 10_000;
const PEAK_HOLD_MS = 4_000;
const CLIP_HOLD_MS = 1_800;

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

function canAttemptReinit(): boolean {
  const now = Date.now();
  const attempts = global.oscReinitAttempts ?? [];
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

export async function initOsc(host: string, sendPort: number, receivePort: number): Promise<void> {
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
    global.oscServer.on("message", (msg: unknown[]) => {
      handleIncomingOsc(msg);
    });

    global.oscLastSettings = { host, sendPort, receivePort };
    global.oscContext = { bus: "input", bankStart: 0, submixIndex: null };
    console.log(`OSC initialized: ${host}:${sendPort} / ${receivePort}`);
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
  clearMeterData();

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
  return global.oscClient !== undefined && global.oscServer !== undefined;
}

export function getOscLastActivity(): {
  lastMessageAt: number | null;
  lastMeterAt: number | null;
  lastInboundType: "meter" | "message" | null;
} {
  return {
    lastMessageAt: global.oscLastInboundAt ?? null,
    lastMeterAt: global.oscLastMeterAt ?? null,
    lastInboundType: global.oscLastInboundType ?? null,
  };
}

export function isOscVerified(): boolean {
  if (!global.oscLastMeterAt) return false;
  return Date.now() - global.oscLastMeterAt <= 15_000;
}

async function oscSend(address: string, ...args: (number | string)[]): Promise<void> {
  const client = global.oscClient;
  if (!client) return;

  try {
    await client.send(address, ...args);
  } catch (err) {
    console.error(`OSC send failed [${address}]:`, err);
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

async function ensureClient(): Promise<boolean> {
  if (global.oscClient) return true;
  return tryAutoReinit();
}

function gainDbToOsc(db: number): number {
  return Math.max(0, Math.min(1, db / 75));
}

async function selectOscSubmix(submixIndex: number): Promise<void> {
  if (!(await ensureClient())) return;
  if (global.oscContext?.submixIndex === submixIndex) return;
  await oscSend(OSC_NONE.setSubmix, submixIndex);
  global.oscContext = { ...(global.oscContext ?? { bus: "input", bankStart: 0, submixIndex: null }), submixIndex };
}

async function setOscBankStart(channelIndexZeroBased: number): Promise<void> {
  if (!(await ensureClient())) return;
  if (global.oscContext?.bankStart === channelIndexZeroBased) return;
  await oscSend(OSC_NONE.setBankStart, channelIndexZeroBased);
  global.oscContext = {
    ...(global.oscContext ?? { bus: "input", bankStart: 0, submixIndex: null }),
    bankStart: channelIndexZeroBased,
  };
}

async function selectOscBus(bus: AudioBus): Promise<void> {
  if (!(await ensureClient())) return;
  if (global.oscContext?.bus === bus) return;

  switch (bus) {
    case "input":
      await oscSend(OSC_PAGE1.busInput, 1);
      break;
    case "playback":
      await oscSend(OSC_PAGE1.busPlayback, 1);
      break;
    case "output":
      await oscSend(OSC_PAGE1.busOutput, 1);
      break;
  }

  global.oscContext = { ...(global.oscContext ?? { bus, bankStart: 0, submixIndex: null }), bus };
}

async function prepareSourceMixContext(channel: AudioChannel, mixTargetOscChannel: number): Promise<void> {
  await selectOscSubmix(mixTargetOscChannel - 1);
  await selectOscBus(getAudioBus(channel));
  await setOscBankStart(0);
}

async function prepareChannelContext(channel: AudioChannel, mixTargetOscChannel?: number): Promise<void> {
  if (mixTargetOscChannel !== undefined) {
    await selectOscSubmix(mixTargetOscChannel - 1);
  }
  await selectOscBus(getAudioBus(channel));
  await setOscBankStart(channel.oscChannel - 1);
}

async function prepareOutputContext(target: AudioMixTarget): Promise<void> {
  await selectOscSubmix(target.oscChannel - 1);
  await selectOscBus("output");
  await setOscBankStart(target.oscChannel - 1);
}

export async function primeOscTransport(mixTargetOscChannel?: number): Promise<void> {
  if (!(await ensureClient())) return;
  if (mixTargetOscChannel !== undefined) {
    await selectOscSubmix(mixTargetOscChannel - 1);
  }
  await selectOscBus("input");
  await setOscBankStart(0);
}

export async function sendOscChannelUpdate(
  channel: AudioChannel,
  values: Partial<OscLiveState>,
  mixTargetOscChannel?: number
): Promise<void> {
  if (!(await ensureClient())) return;

  if (values.gain !== undefined && supportsGain(channel)) {
    await prepareChannelContext(channel);
    await oscSend(OSC_PAGE2.gain, gainDbToOsc(values.gain));
  }

  if (values.fader !== undefined) {
    const targetChannel = mixTargetOscChannel ?? values.mixTargetOscChannel;
    if (targetChannel === undefined) return;
    await prepareSourceMixContext(channel, targetChannel);
    await oscSend(OSC_PAGE1.volume(channel.oscChannel), Math.max(0, Math.min(1, values.fader)));
  }

  if (values.mute !== undefined) {
    await prepareChannelContext(channel, mixTargetOscChannel ?? values.mixTargetOscChannel);
    await oscSend(OSC_PAGE2.mute, values.mute ? 1 : 0);
  }

  if (values.solo !== undefined) {
    await prepareChannelContext(channel, mixTargetOscChannel ?? values.mixTargetOscChannel);
    await oscSend(OSC_PAGE2.solo, values.solo ? 1 : 0);
  }

  if (values.phantom !== undefined && supportsPhantom(channel)) {
    await prepareChannelContext(channel);
    await oscSend(OSC_PAGE2.phantom, values.phantom ? 1 : 0);
  }

  if (values.phase !== undefined && supportsPhase(channel)) {
    await prepareChannelContext(channel);
    await oscSend(OSC_PAGE2.phase, values.phase ? 1 : 0);
  }

  if (values.pad !== undefined && supportsPad(channel)) {
    await prepareChannelContext(channel);
    await oscSend(OSC_PAGE2.pad, values.pad ? 1 : 0);
  }

  if (values.instrument !== undefined && supportsInstrument(channel)) {
    await prepareChannelContext(channel);
    await oscSend(OSC_PAGE2.instrument, values.instrument ? 1 : 0);
  }

  if (values.autoSet !== undefined && supportsAutoSet(channel)) {
    await prepareChannelContext(channel);
    await oscSend(OSC_PAGE2.autoSet, values.autoSet ? 1 : 0);
  }
}

export async function sendOscMixTargetUpdate(
  target: AudioMixTarget,
  values: Partial<Pick<AudioMixTarget, "volume" | "mute" | "dim" | "mono" | "talkback">>
): Promise<void> {
  if (!(await ensureClient())) return;

  if (values.volume !== undefined) {
    if (target.role === "main-out") {
      await oscSend(OSC_PAGE1.masterVolume, Math.max(0, Math.min(1, values.volume)));
    } else {
      await prepareOutputContext(target);
      await oscSend(OSC_PAGE2.volume, Math.max(0, Math.min(1, values.volume)));
    }
  }

  if (values.mute !== undefined) {
    await prepareOutputContext(target);
    await oscSend(OSC_PAGE2.mute, values.mute ? 1 : 0);
  }

  if (target.role === "main-out" && values.dim !== undefined) {
    await oscSend(OSC_PAGE1.mainDim, values.dim ? 1 : 0);
  }

  if (target.role === "main-out" && values.mono !== undefined) {
    await oscSend(OSC_PAGE1.mainMono, values.mono ? 1 : 0);
  }

  if (target.role === "main-out" && values.talkback !== undefined) {
    await oscSend(OSC_PAGE1.mainTalkback, values.talkback ? 1 : 0);
  }
}

export async function sendOscSnapshotRecall(index: number): Promise<void> {
  if (!(await ensureClient())) return;
  await oscSend(OSC_PAGE3.snapshot(index), 1);
}

function updateOscLiveState(channel: AudioChannel, values: Partial<OscLiveState>): void {
  const map = global.oscLiveState ?? new Map<string, OscPendingState>();
  const existing = map.get(channel.id);
  map.set(channel.id, {
    channel,
    values: {
      ...(existing?.values ?? {}),
      ...values,
    },
  });
  global.oscLiveState = map;
}

export function clearOscLiveState(channelId: string): void {
  global.oscLiveState?.delete(channelId);
}

export function sendOscThrottled(
  channel: AudioChannel,
  values: Partial<OscLiveState>,
  mixTargetOscChannel?: number
): void {
  updateOscLiveState(channel, { ...values, mixTargetOscChannel });

  if (global.oscPendingSend) return;
  global.oscPendingSend = true;

  global.oscSendTimer = setTimeout(async () => {
    global.oscPendingSend = false;
    const liveEntries = [...(global.oscLiveState?.values() ?? [])];
    global.oscLiveState?.clear();

    for (const entry of liveEntries) {
      try {
        await sendOscChannelUpdate(entry.channel, entry.values, entry.values.mixTargetOscChannel);
      } catch {
        /* logged in oscSend */
      }
    }
  }, OSC_THROTTLE_MS);
}

function normalizeMeterValue(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= -90) return 0;
  if (value < 0) return Math.max(0, Math.min(1, Math.pow(10, value / 20)));
  return Math.max(0, Math.min(1, value));
}

function setMeter(key: string, side: "left" | "right", rawValue: number): void {
  const now = Date.now();
  const map = global.oscMeterData ?? new Map<string, OscMeterState>();
  const existing =
    map.get(key) ??
    ({
      channelId: key,
      left: 0,
      right: 0,
      level: 0,
      peakHold: 0,
      clip: false,
      updatedAt: null,
      peakHoldAt: null,
      clipAt: null,
    } satisfies OscMeterState);
  const nextValue = normalizeMeterValue(rawValue);
  const nextLeft = side === "left" ? nextValue : existing.left;
  const nextRight = side === "right" ? nextValue : existing.right;
  const nextLevel = Math.max(nextLeft, nextRight);
  const heldPeak =
    existing.peakHoldAt !== null && now - existing.peakHoldAt <= PEAK_HOLD_MS ? existing.peakHold : existing.level;
  const nextPeakHold = Math.max(nextLevel, heldPeak);
  const nextPeakHoldAt = nextPeakHold > heldPeak || existing.peakHoldAt === null ? now : existing.peakHoldAt;
  const nextClipAt = rawValue >= -0.3 || nextValue >= 0.98 ? now : existing.clipAt;
  const next = {
    ...existing,
    left: nextLeft,
    right: nextRight,
    level: nextLevel,
    peakHold: nextPeakHold,
    clip: nextClipAt !== null && now - nextClipAt <= CLIP_HOLD_MS,
    updatedAt: now,
    peakHoldAt: nextPeakHoldAt,
    clipAt: nextClipAt,
  };
  map.set(key, next);
  global.oscMeterData = map;
}

function handleIncomingOsc(msg: unknown[]): void {
  if (!Array.isArray(msg) || msg.length < 2) return;

  const address = typeof msg[0] === "string" ? msg[0] : "";
  const rawValue = typeof msg[1] === "number" ? msg[1] : Number(msg[1]);

  global.oscLastInboundAt = Date.now();
  global.oscLastInboundType = "message";

  const page1Match = /^\/1\/level(\d+)(Left|Right)$/.exec(address);
  if (page1Match) {
    const slot = parseInt(page1Match[1], 10);
    const side = page1Match[2].toLowerCase() as "left" | "right";
    const context = global.oscContext ?? { bus: "input", bankStart: 0, submixIndex: null };
    const oscChannel = context.bankStart + slot;
    setMeter(`${context.bus}:${oscChannel}`, side, rawValue);
    global.oscLastMeterAt = Date.now();
    global.oscLastInboundType = "meter";
    return;
  }

  const page2Match = /^\/2\/level(Left|Right)$/.exec(address);
  if (page2Match) {
    const side = page2Match[1].toLowerCase() as "left" | "right";
    const context = global.oscContext ?? { bus: "input", bankStart: 0, submixIndex: null };
    const oscChannel = context.bankStart + 1;
    setMeter(`${context.bus}:${oscChannel}`, side, rawValue);
    global.oscLastMeterAt = Date.now();
    global.oscLastInboundType = "meter";
  }
}

export function getMeterData(): Map<string, AudioMeterData> {
  const now = Date.now();
  const map = global.oscMeterData ?? new Map<string, OscMeterState>();

  return new Map<string, AudioMeterData>(
    [...map.entries()].map(([key, meter]) => {
      const peakHold =
        meter.peakHoldAt !== null && now - meter.peakHoldAt <= PEAK_HOLD_MS ? meter.peakHold : meter.level;
      const clip = meter.clipAt !== null && now - meter.clipAt <= CLIP_HOLD_MS;
      return [
        key,
        {
          channelId: meter.channelId,
          left: meter.left,
          right: meter.right,
          level: meter.level,
          peakHold,
          clip,
          updatedAt: meter.updatedAt,
        },
      ];
    })
  );
}

export function getOscMeterDiagnostics(): {
  lastMeterAt: number | null;
  freshChannels: number;
  staleChannels: number;
  clippedChannels: number;
} {
  const now = Date.now();
  let freshChannels = 0;
  let staleChannels = 0;
  let clippedChannels = 0;

  for (const meter of global.oscMeterData?.values() ?? []) {
    if (meter.updatedAt !== null) {
      const age = now - meter.updatedAt;
      if (age <= METER_FRESH_MS) {
        freshChannels += 1;
      } else if (age <= METER_STALE_MS) {
        staleChannels += 1;
      }
    }

    if (meter.clipAt !== null && now - meter.clipAt <= CLIP_HOLD_MS) {
      clippedChannels += 1;
    }
  }

  return {
    lastMeterAt: global.oscLastMeterAt ?? null,
    freshChannels,
    staleChannels,
    clippedChannels,
  };
}

export function clearMeterData(): void {
  global.oscMeterData = new Map<string, OscMeterState>();
  global.oscLastInboundAt = undefined;
  global.oscLastMeterAt = undefined;
  global.oscLastInboundType = undefined;
}

export function validateGain(gain: number): boolean {
  return Number.isFinite(gain) && gain >= 0 && gain <= 75;
}

export function validateFader(fader: number): boolean {
  return Number.isFinite(fader) && fader >= 0 && fader <= 1;
}

export function validateOscChannel(ch: number): boolean {
  return Number.isInteger(ch) && ch >= 1 && ch <= 12;
}

export function validateSnapshotIndex(idx: number): boolean {
  return Number.isInteger(idx) && idx >= 0 && idx <= 7;
}
