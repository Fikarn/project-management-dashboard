import type { AudioChannel, AudioConsoleSyncReason, AudioMixTarget, AudioSettings } from "./types";

export type AudioBus = "input" | "playback" | "output";

type AudioChannelSeed = Pick<
  AudioChannel,
  "id" | "name" | "shortName" | "oscChannel" | "order" | "kind" | "role" | "stereo"
> & {
  defaultGain: number;
  defaultFader: number;
};

type AudioMixTargetSeed = Pick<
  AudioMixTarget,
  "id" | "name" | "shortName" | "oscChannel" | "order" | "role" | "stereo"
>;

const CHANNEL_SEEDS: AudioChannelSeed[] = [
  {
    id: "audio-input-9",
    name: "Front 9",
    shortName: "IN 9",
    oscChannel: 9,
    order: 0,
    kind: "hardware-input",
    role: "front-preamp",
    stereo: false,
    defaultGain: 34,
    defaultFader: 0.76,
  },
  {
    id: "audio-input-10",
    name: "Front 10",
    shortName: "IN 10",
    oscChannel: 10,
    order: 1,
    kind: "hardware-input",
    role: "front-preamp",
    stereo: false,
    defaultGain: 34,
    defaultFader: 0.76,
  },
  {
    id: "audio-input-11",
    name: "Front 11",
    shortName: "IN 11",
    oscChannel: 11,
    order: 2,
    kind: "hardware-input",
    role: "front-preamp",
    stereo: false,
    defaultGain: 32,
    defaultFader: 0.74,
  },
  {
    id: "audio-input-12",
    name: "Front 12",
    shortName: "IN 12",
    oscChannel: 12,
    order: 3,
    kind: "hardware-input",
    role: "front-preamp",
    stereo: false,
    defaultGain: 32,
    defaultFader: 0.74,
  },
  {
    id: "audio-input-1",
    name: "Line 1",
    shortName: "L 1",
    oscChannel: 1,
    order: 4,
    kind: "hardware-input",
    role: "rear-line",
    stereo: false,
    defaultGain: 0,
    defaultFader: 0.68,
  },
  {
    id: "audio-input-2",
    name: "Line 2",
    shortName: "L 2",
    oscChannel: 2,
    order: 5,
    kind: "hardware-input",
    role: "rear-line",
    stereo: false,
    defaultGain: 0,
    defaultFader: 0.68,
  },
  {
    id: "audio-input-3",
    name: "Line 3",
    shortName: "L 3",
    oscChannel: 3,
    order: 6,
    kind: "hardware-input",
    role: "rear-line",
    stereo: false,
    defaultGain: 0,
    defaultFader: 0.66,
  },
  {
    id: "audio-input-4",
    name: "Line 4",
    shortName: "L 4",
    oscChannel: 4,
    order: 7,
    kind: "hardware-input",
    role: "rear-line",
    stereo: false,
    defaultGain: 0,
    defaultFader: 0.66,
  },
  {
    id: "audio-input-5",
    name: "Line 5",
    shortName: "L 5",
    oscChannel: 5,
    order: 8,
    kind: "hardware-input",
    role: "rear-line",
    stereo: false,
    defaultGain: 0,
    defaultFader: 0.64,
  },
  {
    id: "audio-input-6",
    name: "Line 6",
    shortName: "L 6",
    oscChannel: 6,
    order: 9,
    kind: "hardware-input",
    role: "rear-line",
    stereo: false,
    defaultGain: 0,
    defaultFader: 0.64,
  },
  {
    id: "audio-input-7",
    name: "Line 7",
    shortName: "L 7",
    oscChannel: 7,
    order: 10,
    kind: "hardware-input",
    role: "rear-line",
    stereo: false,
    defaultGain: 0,
    defaultFader: 0.62,
  },
  {
    id: "audio-input-8",
    name: "Line 8",
    shortName: "L 8",
    oscChannel: 8,
    order: 11,
    kind: "hardware-input",
    role: "rear-line",
    stereo: false,
    defaultGain: 0,
    defaultFader: 0.62,
  },
  {
    id: "audio-playback-1-2",
    name: "Playback 1/2",
    shortName: "PB 1/2",
    oscChannel: 1,
    order: 12,
    kind: "software-playback",
    role: "playback-pair",
    stereo: true,
    defaultGain: 0,
    defaultFader: 0.58,
  },
  {
    id: "audio-playback-3-4",
    name: "Playback 3/4",
    shortName: "PB 3/4",
    oscChannel: 3,
    order: 13,
    kind: "software-playback",
    role: "playback-pair",
    stereo: true,
    defaultGain: 0,
    defaultFader: 0.56,
  },
  {
    id: "audio-playback-5-6",
    name: "Playback 5/6",
    shortName: "PB 5/6",
    oscChannel: 5,
    order: 14,
    kind: "software-playback",
    role: "playback-pair",
    stereo: true,
    defaultGain: 0,
    defaultFader: 0.54,
  },
  {
    id: "audio-playback-7-8",
    name: "Playback 7/8",
    shortName: "PB 7/8",
    oscChannel: 7,
    order: 15,
    kind: "software-playback",
    role: "playback-pair",
    stereo: true,
    defaultGain: 0,
    defaultFader: 0.52,
  },
  {
    id: "audio-playback-9-10",
    name: "Playback 9/10",
    shortName: "PB 9/10",
    oscChannel: 9,
    order: 16,
    kind: "software-playback",
    role: "playback-pair",
    stereo: true,
    defaultGain: 0,
    defaultFader: 0.52,
  },
  {
    id: "audio-playback-11-12",
    name: "Playback 11/12",
    shortName: "PB 11/12",
    oscChannel: 11,
    order: 17,
    kind: "software-playback",
    role: "playback-pair",
    stereo: true,
    defaultGain: 0,
    defaultFader: 0.5,
  },
];

const MIX_TARGET_SEEDS: AudioMixTargetSeed[] = [
  {
    id: "audio-mix-main",
    name: "Main Out",
    shortName: "MAIN",
    oscChannel: 1,
    order: 0,
    role: "main-out",
    stereo: true,
  },
  {
    id: "audio-mix-phones-a",
    name: "Phones 1",
    shortName: "HP 1",
    oscChannel: 9,
    order: 1,
    role: "phones-a",
    stereo: true,
  },
  {
    id: "audio-mix-phones-b",
    name: "Phones 2",
    shortName: "HP 2",
    oscChannel: 11,
    order: 2,
    role: "phones-b",
    stereo: true,
  },
];

export const DEFAULT_AUDIO_CHANNEL_ID = CHANNEL_SEEDS[0].id;
export const DEFAULT_AUDIO_MIX_TARGET_ID = MIX_TARGET_SEEDS[0].id;
export const DEFAULT_AUDIO_FADERS_PER_BANK = 12;
export const AUDIO_MIX_TARGET_IDS = {
  main: "audio-mix-main",
  phonesA: "audio-mix-phones-a",
  phonesB: "audio-mix-phones-b",
} as const;

function clampFader(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}

function clampGain(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(75, value)) : fallback;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function findLegacyMatch(
  seed: Pick<AudioChannel, "id" | "oscChannel" | "kind">,
  rawChannels: unknown[]
): Record<string, unknown> | null {
  for (const raw of rawChannels) {
    if (!raw || typeof raw !== "object") continue;
    const channel = raw as Record<string, unknown>;

    if (channel.id === seed.id) return channel;

    if (typeof channel.oscChannel === "number" && channel.oscChannel === seed.oscChannel) {
      if (seed.kind === "hardware-input" && channel.kind !== "software-playback") return channel;
      if (seed.kind === "software-playback" && channel.kind === "software-playback") return channel;
    }
  }

  return null;
}

function findMixTargetMatch(seed: AudioMixTargetSeed, rawMixTargets: unknown[]): Record<string, unknown> | null {
  for (const raw of rawMixTargets) {
    if (!raw || typeof raw !== "object") continue;
    const target = raw as Record<string, unknown>;
    if (target.id === seed.id) return target;
    if (typeof target.oscChannel === "number" && target.oscChannel === seed.oscChannel) return target;
  }

  return null;
}

export function createDefaultAudioChannels(): AudioChannel[] {
  return CHANNEL_SEEDS.map((seed) => ({
    id: seed.id,
    name: seed.name,
    shortName: seed.shortName,
    oscChannel: seed.oscChannel,
    order: seed.order,
    kind: seed.kind,
    role: seed.role,
    stereo: seed.stereo,
    gain: seed.defaultGain,
    fader: seed.defaultFader,
    mixLevels: createDefaultMixLevels(seed.defaultFader, seed.kind),
    mute: false,
    solo: false,
    phantom: false,
    phase: false,
    pad: false,
    instrument: false,
    autoSet: false,
  }));
}

export function createDefaultAudioMixTargets(): AudioMixTarget[] {
  return MIX_TARGET_SEEDS.map((seed) => ({
    id: seed.id,
    name: seed.name,
    shortName: seed.shortName,
    oscChannel: seed.oscChannel,
    order: seed.order,
    role: seed.role,
    stereo: seed.stereo,
    volume: seed.role === "main-out" ? 0.78 : 0.72,
    mute: false,
    dim: false,
    mono: false,
    talkback: false,
  }));
}

export function normalizeAudioChannels(rawChannels: unknown): AudioChannel[] {
  const defaults = createDefaultAudioChannels();
  const candidates = Array.isArray(rawChannels) ? rawChannels : [];

  return defaults
    .map((seed) => {
      const match = findLegacyMatch(seed, candidates);
      if (!match) return seed;

      return {
        ...seed,
        name: text(match.name, seed.name),
        shortName: text(match.shortName, seed.shortName),
        order: typeof match.order === "number" && Number.isFinite(match.order) ? match.order : seed.order,
        gain: supportsGain(seed) ? clampGain(match.gain, seed.gain) : 0,
        fader: clampFader(match.fader, seed.fader),
        mixLevels: normalizeChannelMixLevels(match.mixLevels, match.fader, seed.fader, seed.kind),
        mute: bool(match.mute, seed.mute),
        solo: bool(match.solo, seed.solo),
        phantom: supportsPhantom(seed) ? bool(match.phantom, seed.phantom) : false,
        phase: supportsPhase(seed) ? bool(match.phase, seed.phase) : false,
        pad: supportsPad(seed) ? bool(match.pad, seed.pad) : false,
        instrument: supportsInstrument(seed) ? bool(match.instrument, false) : false,
        autoSet: supportsAutoSet(seed) ? bool(match.autoSet, false) : false,
      };
    })
    .sort((a, b) => a.order - b.order);
}

export function normalizeAudioMixTargets(rawMixTargets: unknown): AudioMixTarget[] {
  const defaults = createDefaultAudioMixTargets();
  const candidates = Array.isArray(rawMixTargets) ? rawMixTargets : [];

  return defaults
    .map((seed) => {
      const match = findMixTargetMatch(seed, candidates);
      if (!match) return seed;

      return {
        ...seed,
        name: text(match.name, seed.name),
        shortName: text(match.shortName, seed.shortName),
        order: typeof match.order === "number" && Number.isFinite(match.order) ? match.order : seed.order,
        volume: clampFader(match.volume, seed.volume),
        mute: bool(match.mute, seed.mute),
        dim: seed.role === "main-out" ? bool(match.dim, seed.dim) : false,
        mono: seed.role === "main-out" ? bool(match.mono, seed.mono) : false,
        talkback: seed.role === "main-out" ? bool(match.talkback, seed.talkback) : false,
      };
    })
    .sort((a, b) => a.order - b.order);
}

export function createDefaultAudioSettings(): AudioSettings {
  return {
    oscEnabled: false,
    oscSendHost: "127.0.0.1",
    oscSendPort: 7001,
    oscReceivePort: 9001,
    selectedChannelId: DEFAULT_AUDIO_CHANNEL_ID,
    selectedMixTargetId: DEFAULT_AUDIO_MIX_TARGET_ID,
    expectedPeakData: true,
    expectedSubmixLock: true,
    expectedCompatibilityMode: false,
    fadersPerBank: DEFAULT_AUDIO_FADERS_PER_BANK,
    lastRecalledSnapshotId: null,
    consoleStateConfidence: "assumed",
    lastConsoleSyncAt: null,
    lastConsoleSyncReason: "startup",
    lastSnapshotRecallAt: null,
  };
}

export function normalizeAudioSettings(
  rawSettings: unknown,
  channels: AudioChannel[],
  mixTargets: AudioMixTarget[]
): AudioSettings {
  const defaults = createDefaultAudioSettings();
  const raw = rawSettings && typeof rawSettings === "object" ? (rawSettings as Record<string, unknown>) : {};

  const selectedChannelId =
    typeof raw.selectedChannelId === "string" && channels.some((channel) => channel.id === raw.selectedChannelId)
      ? raw.selectedChannelId
      : defaults.selectedChannelId;

  const selectedMixTargetId =
    typeof raw.selectedMixTargetId === "string" && mixTargets.some((target) => target.id === raw.selectedMixTargetId)
      ? raw.selectedMixTargetId
      : defaults.selectedMixTargetId;

  return {
    oscEnabled: bool(raw.oscEnabled, defaults.oscEnabled),
    oscSendHost: text(raw.oscSendHost, defaults.oscSendHost),
    oscSendPort:
      typeof raw.oscSendPort === "number" && Number.isInteger(raw.oscSendPort) ? raw.oscSendPort : defaults.oscSendPort,
    oscReceivePort:
      typeof raw.oscReceivePort === "number" && Number.isInteger(raw.oscReceivePort)
        ? raw.oscReceivePort
        : defaults.oscReceivePort,
    selectedChannelId,
    selectedMixTargetId,
    expectedPeakData: bool(raw.expectedPeakData, defaults.expectedPeakData),
    expectedSubmixLock: bool(raw.expectedSubmixLock, defaults.expectedSubmixLock),
    expectedCompatibilityMode: bool(raw.expectedCompatibilityMode, defaults.expectedCompatibilityMode),
    fadersPerBank:
      typeof raw.fadersPerBank === "number" && Number.isInteger(raw.fadersPerBank)
        ? raw.fadersPerBank
        : defaults.fadersPerBank,
    lastRecalledSnapshotId:
      typeof raw.lastRecalledSnapshotId === "string" && raw.lastRecalledSnapshotId.trim()
        ? raw.lastRecalledSnapshotId
        : defaults.lastRecalledSnapshotId,
    consoleStateConfidence: raw.consoleStateConfidence === "aligned" ? "aligned" : defaults.consoleStateConfidence,
    lastConsoleSyncAt:
      typeof raw.lastConsoleSyncAt === "string" && raw.lastConsoleSyncAt.trim()
        ? raw.lastConsoleSyncAt
        : defaults.lastConsoleSyncAt,
    lastConsoleSyncReason:
      raw.lastConsoleSyncReason === "startup" ||
      raw.lastConsoleSyncReason === "snapshot" ||
      raw.lastConsoleSyncReason === "manual-sync"
        ? raw.lastConsoleSyncReason
        : defaults.lastConsoleSyncReason,
    lastSnapshotRecallAt:
      typeof raw.lastSnapshotRecallAt === "string" && raw.lastSnapshotRecallAt.trim()
        ? raw.lastSnapshotRecallAt
        : defaults.lastSnapshotRecallAt,
  };
}

export function markAudioConsoleAssumed(
  settings: AudioSettings,
  reason: Exclude<AudioConsoleSyncReason, "manual-sync" | null>
): AudioSettings {
  if (
    settings.consoleStateConfidence === "assumed" &&
    settings.lastConsoleSyncReason === "snapshot" &&
    reason === "startup"
  ) {
    return settings;
  }

  return {
    ...settings,
    consoleStateConfidence: "assumed",
    lastConsoleSyncReason: reason,
  };
}

export function markAudioConsoleAligned(settings: AudioSettings, syncedAt = new Date().toISOString()): AudioSettings {
  return {
    ...settings,
    consoleStateConfidence: "aligned",
    lastConsoleSyncAt: syncedAt,
    lastConsoleSyncReason: "manual-sync",
  };
}

export function supportsGain(channel: Pick<AudioChannel, "role">): boolean {
  return channel.role === "front-preamp";
}

export function supportsPhantom(channel: Pick<AudioChannel, "role">): boolean {
  return channel.role === "front-preamp";
}

export function supportsPad(channel: Pick<AudioChannel, "role">): boolean {
  return channel.role === "front-preamp";
}

export function supportsInstrument(channel: Pick<AudioChannel, "role">): boolean {
  return channel.role === "front-preamp";
}

export function supportsAutoSet(channel: Pick<AudioChannel, "role">): boolean {
  return channel.role === "front-preamp";
}

export function supportsPhase(channel: Pick<AudioChannel, "role">): boolean {
  return channel.role !== "playback-pair";
}

export function getAudioBus(channel: Pick<AudioChannel, "kind">): AudioBus {
  return channel.kind === "software-playback" ? "playback" : "input";
}

export function getAudioMixLabel(target: Pick<AudioMixTarget, "role" | "name">): string {
  switch (target.role) {
    case "main-out":
      return "Main Monitors";
    case "phones-a":
      return "Phones 1";
    case "phones-b":
      return "Phones 2";
    default:
      return target.name;
  }
}

function createDefaultMixLevels(base: number, kind: AudioChannel["kind"]): Record<string, number> {
  const phonesAPad = kind === "software-playback" ? 0.02 : 0.08;
  const phonesBPad = kind === "software-playback" ? 0.06 : 0.12;

  return {
    [AUDIO_MIX_TARGET_IDS.main]: base,
    [AUDIO_MIX_TARGET_IDS.phonesA]: Math.max(0, Math.min(1, base - phonesAPad)),
    [AUDIO_MIX_TARGET_IDS.phonesB]: Math.max(0, Math.min(1, base - phonesBPad)),
  };
}

function normalizeChannelMixLevels(
  rawMixLevels: unknown,
  legacyFader: unknown,
  fallbackBase: number,
  kind: AudioChannel["kind"]
): Record<string, number> {
  const defaults = createDefaultMixLevels(fallbackBase, kind);
  const raw = rawMixLevels && typeof rawMixLevels === "object" ? (rawMixLevels as Record<string, unknown>) : {};
  const mainFallback = clampFader(legacyFader, defaults[AUDIO_MIX_TARGET_IDS.main]);

  return {
    [AUDIO_MIX_TARGET_IDS.main]: clampFader(raw[AUDIO_MIX_TARGET_IDS.main], mainFallback),
    [AUDIO_MIX_TARGET_IDS.phonesA]: clampFader(
      raw[AUDIO_MIX_TARGET_IDS.phonesA],
      defaults[AUDIO_MIX_TARGET_IDS.phonesA]
    ),
    [AUDIO_MIX_TARGET_IDS.phonesB]: clampFader(
      raw[AUDIO_MIX_TARGET_IDS.phonesB],
      defaults[AUDIO_MIX_TARGET_IDS.phonesB]
    ),
  };
}

export function getChannelSendLevel(channel: Pick<AudioChannel, "mixLevels" | "fader">, mixTargetId: string): number {
  if (channel.mixLevels && typeof channel.mixLevels[mixTargetId] === "number") {
    return channel.mixLevels[mixTargetId];
  }
  return channel.fader;
}

export function setChannelSendLevel(channel: AudioChannel, mixTargetId: string, value: number): AudioChannel {
  return {
    ...channel,
    fader: value,
    mixLevels: {
      ...channel.mixLevels,
      [mixTargetId]: Math.max(0, Math.min(1, value)),
    },
  };
}
