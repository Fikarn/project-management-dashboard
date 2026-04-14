import { describe, expect, it } from "vitest";

import {
  createDefaultAudioChannels,
  createDefaultAudioMixTargets,
  createDefaultAudioSettings,
  getAudioBus,
  getAudioMixLabel,
  getChannelSendLevel,
  markAudioConsoleAligned,
  markAudioConsoleAssumed,
  normalizeAudioChannels,
  normalizeAudioMixTargets,
  setChannelSendLevel,
  supportsAutoSet,
  supportsGain,
  supportsInstrument,
  supportsPad,
  supportsPhase,
  supportsPhantom,
} from "@/lib/audio-console";

describe("audio console helpers", () => {
  it("keeps snapshot-derived assumed state on startup", () => {
    const settings = {
      ...createDefaultAudioSettings(),
      consoleStateConfidence: "assumed" as const,
      lastConsoleSyncReason: "snapshot" as const,
    };

    expect(markAudioConsoleAssumed(settings, "startup")).toBe(settings);
  });

  it("marks the console assumed for other transitions", () => {
    const settings = {
      ...createDefaultAudioSettings(),
      consoleStateConfidence: "aligned" as const,
      lastConsoleSyncReason: "manual-sync" as const,
    };

    expect(markAudioConsoleAssumed(settings, "snapshot")).toMatchObject({
      consoleStateConfidence: "assumed",
      lastConsoleSyncReason: "snapshot",
    });
  });

  it("marks the console aligned with an explicit timestamp", () => {
    expect(markAudioConsoleAligned(createDefaultAudioSettings(), "2026-04-14T00:00:00.000Z")).toMatchObject({
      consoleStateConfidence: "aligned",
      lastConsoleSyncAt: "2026-04-14T00:00:00.000Z",
      lastConsoleSyncReason: "manual-sync",
    });
  });

  it("reports capability support by fixed strip role", () => {
    expect(supportsGain({ role: "front-preamp" })).toBe(true);
    expect(supportsGain({ role: "rear-line" })).toBe(false);
    expect(supportsPhantom({ role: "front-preamp" })).toBe(true);
    expect(supportsPhantom({ role: "playback-pair" })).toBe(false);
    expect(supportsPad({ role: "front-preamp" })).toBe(true);
    expect(supportsPad({ role: "rear-line" })).toBe(false);
    expect(supportsInstrument({ role: "front-preamp" })).toBe(true);
    expect(supportsInstrument({ role: "rear-line" })).toBe(false);
    expect(supportsAutoSet({ role: "front-preamp" })).toBe(true);
    expect(supportsAutoSet({ role: "rear-line" })).toBe(false);
    expect(supportsPhase({ role: "rear-line" })).toBe(true);
    expect(supportsPhase({ role: "playback-pair" })).toBe(false);
  });

  it("maps strip kinds to the expected audio bus", () => {
    expect(getAudioBus({ kind: "hardware-input" })).toBe("input");
    expect(getAudioBus({ kind: "software-playback" })).toBe("playback");
  });

  it("returns mix labels for each control-room target", () => {
    expect(getAudioMixLabel({ role: "main-out", name: "Main Out" })).toBe("Main Monitors");
    expect(getAudioMixLabel({ role: "phones-a", name: "Phones 1" })).toBe("Phones 1");
    expect(getAudioMixLabel({ role: "phones-b", name: "Phones 2" })).toBe("Phones 2");
    expect(getAudioMixLabel({ role: "main-out", name: "Custom" })).not.toBe("Custom");
  });

  it("reads and updates per-mix send levels safely", () => {
    const channel = createDefaultAudioChannels()[0];
    const updated = setChannelSendLevel(channel, "audio-mix-main", 1.5);

    expect(updated.fader).toBe(1.5);
    expect(updated.mixLevels["audio-mix-main"]).toBe(1);
    expect(getChannelSendLevel(updated, "audio-mix-main")).toBe(1);
    expect(getChannelSendLevel({ mixLevels: {}, fader: 0.33 }, "audio-mix-main")).toBe(0.33);
  });

  it("preserves stored strip order and ignores unsupported flags during normalization", () => {
    const channels = normalizeAudioChannels([
      {
        id: "audio-input-10",
        order: 0,
        name: "Host 10",
        phantom: true,
      },
      {
        id: "audio-input-9",
        order: 1,
        name: "Host 9",
        instrument: true,
        autoSet: true,
      },
      {
        id: "audio-playback-1-2",
        order: 2,
        name: "Playback Stem",
        phantom: true,
        phase: true,
      },
    ]);

    expect(channels[0]).toMatchObject({ id: "audio-input-10", name: "Host 10", phantom: true });
    expect(channels[1]).toMatchObject({ id: "audio-input-9", instrument: true, autoSet: true });
    expect(channels.find((channel) => channel.id === "audio-playback-1-2")).toMatchObject({
      id: "audio-playback-1-2",
      order: 2,
      phantom: false,
      phase: false,
    });
  });

  it("preserves stored mix-target order and respects main-out-only controls", () => {
    const mixTargets = normalizeAudioMixTargets([
      {
        id: "audio-mix-phones-a",
        order: 0,
        volume: 0.5,
        dim: true,
      },
      {
        id: "audio-mix-main",
        order: 1,
        volume: 0.61,
        dim: true,
        mono: true,
        talkback: true,
      },
    ]);

    expect(mixTargets[0]).toMatchObject({
      id: "audio-mix-phones-a",
      volume: 0.5,
      dim: false,
      mono: false,
      talkback: false,
    });
    expect(mixTargets[1]).toMatchObject({
      id: "audio-mix-main",
      volume: 0.61,
      dim: true,
      mono: true,
      talkback: true,
    });
  });

  it("exposes the fixed console seeds", () => {
    expect(createDefaultAudioChannels()).toHaveLength(18);
    expect(createDefaultAudioMixTargets()).toHaveLength(3);
  });
});
