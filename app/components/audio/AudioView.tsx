"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AudioChannel,
  AudioConsoleStateConfidence,
  AudioConsoleSyncReason,
  AudioMixTarget,
  AudioSettings,
  AudioSnapshot,
} from "@/lib/types";
import {
  getAudioBus,
  getAudioMixLabel,
  getChannelSendLevel,
  supportsAutoSet,
  supportsGain,
  supportsInstrument,
  supportsPad,
  supportsPhase,
  supportsPhantom,
} from "@/lib/audio-console";
import { audioApi, audioSnapshotsApi } from "@/lib/client-api";
import { useToast } from "../shared/ToastContext";
import AudioChannelStrip from "./AudioChannelStrip";
import AudioSettingsModal from "./AudioSettingsModal";
import AudioToolbar from "./AudioToolbar";
import { useMeterPolling } from "./hooks/useMeterPolling";
import { useOscPolling } from "./hooks/useOscPolling";

type ModalState = { type: "none" } | { type: "settings" };

interface ConsoleState {
  confidence: AudioConsoleStateConfidence;
  lastSyncAt: string | null;
  lastSyncReason: AudioConsoleSyncReason;
  lastSnapshotRecallAt: string | null;
}

interface AudioViewProps {
  audioChannels: AudioChannel[];
  audioMixTargets: AudioMixTarget[];
  audioSnapshots: AudioSnapshot[];
  audioSettings: AudioSettings;
  onDataChange: () => void;
}

function meterFresh(updatedAt: number | null): string {
  if (!updatedAt) return "No inbound meter yet";
  const age = Date.now() - updatedAt;
  if (age < 3000) return "Metering live";
  if (age < 10000) return "Metering stale";
  return "No recent meter";
}

function formatSendDb(value: number): string {
  return value === 0 ? "-inf" : `${((value - 0.75) * 60).toFixed(1)} dB`;
}

export default function AudioView({
  audioChannels,
  audioMixTargets,
  audioSnapshots,
  audioSettings,
  onDataChange,
}: AudioViewProps) {
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(audioSettings.selectedChannelId);
  const [selectedMixTargetId, setSelectedMixTargetId] = useState<string>(audioSettings.selectedMixTargetId);
  const [syncingConsole, setSyncingConsole] = useState(false);
  const [consoleState, setConsoleState] = useState<ConsoleState>({
    confidence: audioSettings.consoleStateConfidence,
    lastSyncAt: audioSettings.lastConsoleSyncAt,
    lastSyncReason: audioSettings.lastConsoleSyncReason,
    lastSnapshotRecallAt: audioSettings.lastSnapshotRecallAt,
  });
  const toast = useToast();
  const lastOscErrorRef = useRef(0);

  const { oscStatus } = useOscPolling({
    oscEnabled: audioSettings.oscEnabled,
    oscSendHost: audioSettings.oscSendHost,
  });

  const meters = useMeterPolling(audioSettings.oscEnabled);

  useEffect(() => {
    setSelectedChannelId(audioSettings.selectedChannelId);
  }, [audioSettings.selectedChannelId]);

  useEffect(() => {
    setSelectedMixTargetId(audioSettings.selectedMixTargetId);
  }, [audioSettings.selectedMixTargetId]);

  useEffect(() => {
    setConsoleState({
      confidence: audioSettings.consoleStateConfidence,
      lastSyncAt: audioSettings.lastConsoleSyncAt,
      lastSyncReason: audioSettings.lastConsoleSyncReason,
      lastSnapshotRecallAt: audioSettings.lastSnapshotRecallAt,
    });
  }, [
    audioSettings.consoleStateConfidence,
    audioSettings.lastConsoleSyncAt,
    audioSettings.lastConsoleSyncReason,
    audioSettings.lastSnapshotRecallAt,
  ]);

  useEffect(() => {
    if (!oscStatus.consoleStateConfidence) return;
    setConsoleState((current) => {
      if (
        current.confidence === "aligned" &&
        oscStatus.consoleStateConfidence === "assumed" &&
        current.lastSyncAt &&
        oscStatus.lastConsoleSyncAt !== current.lastSyncAt
      ) {
        return current;
      }

      return {
        confidence: oscStatus.consoleStateConfidence ?? current.confidence,
        lastSyncAt: oscStatus.lastConsoleSyncAt ?? current.lastSyncAt,
        lastSyncReason: oscStatus.lastConsoleSyncReason ?? current.lastSyncReason,
        lastSnapshotRecallAt: oscStatus.lastSnapshotRecallAt ?? current.lastSnapshotRecallAt,
      };
    });
  }, [
    oscStatus.consoleStateConfidence,
    oscStatus.lastConsoleSyncAt,
    oscStatus.lastConsoleSyncReason,
    oscStatus.lastSnapshotRecallAt,
  ]);

  const sortedChannels = useMemo(() => [...audioChannels].sort((a, b) => a.order - b.order), [audioChannels]);
  const sortedMixTargets = useMemo(() => [...audioMixTargets].sort((a, b) => a.order - b.order), [audioMixTargets]);
  const frontInputs = sortedChannels.filter((channel) => channel.role === "front-preamp");
  const rearInputs = sortedChannels.filter((channel) => channel.role === "rear-line");
  const playbackChannels = sortedChannels.filter((channel) => channel.role === "playback-pair");

  const selectedChannel = sortedChannels.find((channel) => channel.id === selectedChannelId) ?? frontInputs[0] ?? null;
  const selectedMixTarget =
    sortedMixTargets.find((target) => target.id === selectedMixTargetId) ?? sortedMixTargets[0] ?? null;
  const selectedMeter = selectedChannel ? meters.get(selectedChannel.id) : undefined;
  const liveCount = Array.from(meters.values()).filter((meter) => meter.level > 0.015).length;
  const meterState = selectedMeter ? meterFresh(selectedMeter.updatedAt) : "No selected strip";
  const selectedPeakHoldDb =
    (selectedMeter?.peakHold ?? 0) <= 0.0001
      ? "-inf"
      : `${(20 * Math.log10(selectedMeter?.peakHold ?? 0)).toFixed(1)} dB`;
  const selectedSendMatrix = selectedChannel
    ? sortedMixTargets.map((target) => ({
        target,
        level: getChannelSendLevel(selectedChannel, target.id),
      }))
    : [];

  const handleUpdate = useCallback(
    async (channelId: string, values: Record<string, unknown>) => {
      try {
        const payload = values.fader !== undefined ? { ...values, mixTargetId: selectedMixTargetId } : values;
        const res = await audioApi.updateValue(channelId, payload);
        if (!res.ok) {
          const now = Date.now();
          if (now - lastOscErrorRef.current > 5000) {
            lastOscErrorRef.current = now;
            const data = await res.json().catch(() => null);
            toast("error", data?.error || "Failed to update audio strip");
          }
        }
      } catch {
        const now = Date.now();
        if (now - lastOscErrorRef.current > 5000) {
          lastOscErrorRef.current = now;
          toast("error", "Failed to update audio strip");
        }
      }
    },
    [selectedMixTargetId, toast]
  );

  const handleOsc = useCallback(
    async (channelId: string, values: Record<string, unknown>) => {
      try {
        await audioApi.sendOsc({ channelId, mixTargetId: selectedMixTargetId, ...values });
      } catch {
        // avoid toast spam during fader drag
      }
    },
    [selectedMixTargetId]
  );

  const handleSelectChannel = useCallback(
    async (channelId: string) => {
      setSelectedChannelId(channelId);
      try {
        await audioApi.updateSettings({ selectedChannelId: channelId });
      } catch {
        setSelectedChannelId(audioSettings.selectedChannelId);
        toast("error", "Failed to update strip focus");
      }
    },
    [audioSettings.selectedChannelId, toast]
  );

  const handleSelectMixTarget = useCallback(
    async (mixTargetId: string) => {
      setSelectedMixTargetId(mixTargetId);
      try {
        const res = await audioApi.updateSettings({ selectedMixTargetId: mixTargetId });
        if (!res.ok) {
          throw new Error("settings update failed");
        }
      } catch {
        setSelectedMixTargetId(audioSettings.selectedMixTargetId);
        toast("error", "Failed to switch mix target");
      }
    },
    [audioSettings.selectedMixTargetId, toast]
  );

  const handleUpdateMixTarget = useCallback(
    async (mixTargetId: string, values: Record<string, unknown>) => {
      try {
        const res = await audioApi.updateMixTargetValue(mixTargetId, values);
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          toast("error", data?.error || "Failed to update output mix");
        }
      } catch {
        toast("error", "Failed to update output mix");
      }
    },
    [toast]
  );

  const handleRecallSnapshot = useCallback(
    async (snapshot: AudioSnapshot) => {
      try {
        const res = await audioSnapshotsApi.recall(snapshot.id);
        const data = await res.json();
        if (data.recalled) {
          const recalledAt = new Date().toISOString();
          setConsoleState((current) => ({
            ...current,
            confidence: "assumed",
            lastSyncReason: "snapshot",
            lastSnapshotRecallAt: recalledAt,
          }));
          onDataChange();
          toast("success", `Recalled "${snapshot.name}"`);
        } else {
          toast("error", "Snapshot recall failed");
        }
      } catch {
        toast("error", "Failed to recall snapshot");
      }
    },
    [onDataChange, toast]
  );

  const handleSyncConsole = useCallback(async () => {
    setSyncingConsole(true);
    try {
      const res = await audioApi.syncConsole();
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.synced) {
        toast("error", data?.error || "Failed to sync the console to TotalMix");
        return;
      }
      const syncedAt = typeof data.syncedAt === "string" ? data.syncedAt : new Date().toISOString();
      setConsoleState((current) => ({
        ...current,
        confidence: "aligned",
        lastSyncAt: syncedAt,
        lastSyncReason: "manual-sync",
      }));
      onDataChange();
      toast("success", "Console pushed to TotalMix");
    } catch {
      toast("error", "Failed to sync the console to TotalMix");
    } finally {
      setSyncingConsole(false);
    }
  }, [onDataChange, toast]);

  const checklist = [
    {
      label: "Peak return",
      status: !audioSettings.expectedPeakData
        ? "Optional"
        : oscStatus.meteringState === "live"
          ? `${oscStatus.activeMeterChannels ?? 0} live`
          : oscStatus.meteringState === "stale"
            ? "Stale"
            : "Check TotalMix",
    },
    {
      label: "Submix lock",
      status: audioSettings.expectedSubmixLock ? "Expected" : "Review setup",
    },
    {
      label: "Compatibility",
      status: audioSettings.expectedCompatibilityMode ? "Enabled" : "Modern OSC",
    },
    {
      label: "Bank size",
      status: `${audioSettings.fadersPerBank} faders`,
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <AudioToolbar
        oscStatus={oscStatus}
        mixTargets={sortedMixTargets}
        selectedMixTargetId={selectedMixTargetId}
        selectedChannelName={selectedChannel?.name ?? null}
        inputCount={frontInputs.length + rearInputs.length}
        playbackCount={playbackChannels.length}
        liveCount={liveCount}
        snapshots={[...audioSnapshots].sort((a, b) => a.order - b.order)}
        activeSnapshotId={audioSettings.lastRecalledSnapshotId}
        consoleStateConfidence={consoleState.confidence}
        lastConsoleSyncAt={consoleState.lastSyncAt}
        lastConsoleSyncReason={consoleState.lastSyncReason}
        lastSnapshotRecallAt={consoleState.lastSnapshotRecallAt}
        syncingConsole={syncingConsole}
        onSelectMixTarget={handleSelectMixTarget}
        onUpdateMixTarget={handleUpdateMixTarget}
        onRecallSnapshot={handleRecallSnapshot}
        onSyncConsole={handleSyncConsole}
        onOpenSettings={() => setModal({ type: "settings" })}
      />

      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1.68fr)_340px]">
        <div className="grid min-h-0 gap-3 xl:grid-rows-[minmax(0,1.1fr)_minmax(0,0.95fr)]">
          <section className="console-surface min-h-0 overflow-hidden px-3 py-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="console-label">Front Preamps 9-12</div>
                <div className="mt-1 text-sm font-semibold text-studio-100">
                  Primary live inputs feeding {selectedMixTarget ? getAudioMixLabel(selectedMixTarget) : "Main Out"}
                </div>
              </div>
              <div className="text-xxs text-studio-500">Hold the 48V button to change phantom power.</div>
            </div>
            <div className="mt-3 grid h-[calc(100%-3.5rem)] min-h-0 gap-3 xl:grid-cols-4">
              {frontInputs.map((channel) => (
                <AudioChannelStrip
                  key={channel.id}
                  channel={channel}
                  meterData={meters.get(channel.id)}
                  selected={selectedChannel?.id === channel.id}
                  mixLabel={selectedMixTarget ? getAudioMixLabel(selectedMixTarget) : "Main Monitors"}
                  sendValue={getChannelSendLevel(channel, selectedMixTargetId)}
                  compact={false}
                  onSelect={handleSelectChannel}
                  onUpdate={handleUpdate}
                  onOsc={handleOsc}
                />
              ))}
            </div>
          </section>

          <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
            <section className="console-surface min-h-0 overflow-hidden px-3 py-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="console-label">Rear Line Inputs 1-8</div>
                  <div className="mt-1 text-sm font-semibold text-studio-100">
                    Secondary line sources and utility returns
                  </div>
                </div>
                <div className="text-xxs text-studio-500">Fixed line path, trim stays in hardware.</div>
              </div>
              <div className="mt-3 grid h-[calc(100%-3.5rem)] min-h-0 gap-2 xl:grid-cols-4">
                {rearInputs.map((channel) => (
                  <AudioChannelStrip
                    key={channel.id}
                    channel={channel}
                    meterData={meters.get(channel.id)}
                    selected={selectedChannel?.id === channel.id}
                    mixLabel={selectedMixTarget ? getAudioMixLabel(selectedMixTarget) : "Main Monitors"}
                    sendValue={getChannelSendLevel(channel, selectedMixTargetId)}
                    compact
                    onSelect={handleSelectChannel}
                    onUpdate={handleUpdate}
                    onOsc={handleOsc}
                  />
                ))}
              </div>
            </section>

            <section className="console-surface min-h-0 overflow-hidden px-3 py-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="console-label">Software Playback</div>
                  <div className="mt-1 text-sm font-semibold text-studio-100">DAW returns and program feeds</div>
                </div>
                <div className="text-xxs text-studio-500">Stereo pairs send to the selected output mix.</div>
              </div>
              <div className="mt-3 grid h-[calc(100%-3.5rem)] min-h-0 gap-2 xl:grid-cols-2">
                {playbackChannels.map((channel) => (
                  <AudioChannelStrip
                    key={channel.id}
                    channel={channel}
                    meterData={meters.get(channel.id)}
                    selected={selectedChannel?.id === channel.id}
                    mixLabel={selectedMixTarget ? getAudioMixLabel(selectedMixTarget) : "Main Monitors"}
                    sendValue={getChannelSendLevel(channel, selectedMixTargetId)}
                    compact
                    onSelect={handleSelectChannel}
                    onUpdate={handleUpdate}
                    onOsc={handleOsc}
                  />
                ))}
              </div>
            </section>
          </div>
        </div>

        <aside
          className="console-surface min-h-0 overflow-y-auto px-3 py-3"
          tabIndex={0}
          aria-label="Selected audio strip details and RME readiness"
        >
          <div className="flex flex-col gap-3">
            <section className="console-surface-soft px-3 py-3">
              <div className="console-label">Selected Strip</div>
              <div className="mt-1 text-base font-semibold text-studio-50">
                {selectedChannel?.name ?? "No strip selected"}
              </div>
              <div className="mt-1 text-sm text-studio-400">
                {selectedChannel
                  ? `${selectedChannel.role === "front-preamp" ? "Front preamp" : selectedChannel.role === "rear-line" ? "Rear line input" : "Playback return"} on ${getAudioBus(selectedChannel)} bus`
                  : "Choose a strip to inspect its live controls."}
              </div>

              {selectedChannel ? (
                <div className="mt-3 grid gap-2">
                  <div className="rounded-[14px] border border-studio-800 bg-studio-950/45 px-3 py-2.5">
                    <div className="console-label">Current Mix</div>
                    <div className="mt-1 text-sm font-semibold text-studio-100">
                      {selectedMixTarget ? getAudioMixLabel(selectedMixTarget) : "Main Monitors"}
                    </div>
                    <div className="mt-1 text-xxs text-studio-500">
                      Strip sends are stored per output mix. Changing the active destination swaps the entire send
                      layer.
                    </div>
                  </div>

                  <div className="rounded-[14px] border border-studio-800 bg-studio-950/45 px-3 py-2.5">
                    <div className="console-label">Send Matrix</div>
                    <div className="mt-2 grid gap-2">
                      {selectedSendMatrix.map(({ target, level }) => (
                        <div
                          key={target.id}
                          className={`flex items-center justify-between gap-3 rounded-[12px] border px-3 py-2 ${
                            selectedMixTarget?.id === target.id
                              ? "bg-accent-blue/8 border-accent-blue/35"
                              : "border-studio-800 bg-studio-950/35"
                          }`}
                        >
                          <div>
                            <div className="text-sm font-medium text-studio-100">{getAudioMixLabel(target)}</div>
                            <div className="text-xxs text-studio-500">
                              Out {target.oscChannel}/{target.oscChannel + 1}
                            </div>
                          </div>
                          <div className="font-mono text-xs font-semibold text-studio-300">{formatSendDb(level)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[14px] border border-studio-800 bg-studio-950/45 px-3 py-2.5">
                    <div className="console-label">Live Meter</div>
                    <div className="mt-1 text-sm font-semibold text-studio-100">{meterState}</div>
                    <div className="mt-1 font-mono text-xs text-studio-400">
                      L {(selectedMeter?.left ?? 0).toFixed(2)} / R {(selectedMeter?.right ?? 0).toFixed(2)}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xxs text-studio-500">
                      <span>Peak Hold {selectedPeakHoldDb}</span>
                      {selectedMeter?.clip ? (
                        <span className="bg-red-500/12 rounded-pill px-2 py-0.5 font-semibold uppercase tracking-[0.14em] text-red-400">
                          OVR
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-[14px] border border-studio-800 bg-studio-950/45 px-3 py-2.5">
                    <div className="console-label">Capabilities</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {supportsGain(selectedChannel) ? (
                        <span className="rounded-pill bg-accent-blue/10 px-2 py-0.5 text-xxs font-medium uppercase tracking-[0.14em] text-accent-blue">
                          Gain
                        </span>
                      ) : null}
                      {supportsPhantom(selectedChannel) ? (
                        <span className="rounded-pill bg-blue-500/10 px-2 py-0.5 text-xxs font-medium uppercase tracking-[0.14em] text-blue-300">
                          48V
                        </span>
                      ) : null}
                      {supportsPad(selectedChannel) ? (
                        <span className="rounded-pill bg-studio-800 px-2 py-0.5 text-xxs font-medium uppercase tracking-[0.14em] text-studio-300">
                          Pad
                        </span>
                      ) : null}
                      {supportsInstrument(selectedChannel) ? (
                        <span className="rounded-pill bg-accent-blue/10 px-2 py-0.5 text-xxs font-medium uppercase tracking-[0.14em] text-accent-blue">
                          Inst
                        </span>
                      ) : null}
                      {supportsAutoSet(selectedChannel) ? (
                        <span className="rounded-pill bg-accent-green/10 px-2 py-0.5 text-xxs font-medium uppercase tracking-[0.14em] text-accent-green">
                          AutoSet
                        </span>
                      ) : null}
                      {supportsPhase(selectedChannel) ? (
                        <span className="rounded-pill bg-amber-400/10 px-2 py-0.5 text-xxs font-medium uppercase tracking-[0.14em] text-amber-300">
                          Phase
                        </span>
                      ) : null}
                      {selectedChannel.stereo ? (
                        <span className="rounded-pill bg-studio-800 px-2 py-0.5 text-xxs font-medium uppercase tracking-[0.14em] text-studio-300">
                          Stereo Pair
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="console-surface-soft px-3 py-3">
              <div className="console-label">RME Readiness</div>
              <div className="mt-2 grid gap-2">
                {checklist.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3 rounded-[14px] border border-studio-800 bg-studio-950/45 px-3 py-2.5"
                  >
                    <span className="text-sm text-studio-200">{item.label}</span>
                    <span className="text-xxs font-semibold uppercase tracking-[0.16em] text-studio-500">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="console-surface-soft px-3 py-3">
              <div className="console-label">Operator Notes</div>
              <div className="mt-2 space-y-2 text-sm leading-6 text-studio-300">
                <p>
                  Front preamps 9-12 stay primary in this surface. Rear inputs 1-8 are available as line returns without
                  fake preamp controls.
                </p>
                <p>
                  Playback strips represent stereo software returns. Their faders always send into the currently
                  selected output mix, and each mix keeps its own stored send level.
                </p>
                <p>
                  Main monitors expose Dim, Mono, and Talkback. Phones mixes keep independent level and mute without
                  touching the live source layout.
                </p>
                <p>
                  Instrument and AutoSet are available only on the front preamps. Phantom requires a hold so it cannot
                  be armed accidentally during a live show.
                </p>
                <p>
                  Startup is transport-safe. If TotalMix was changed outside this surface, hold Sync Console to
                  deliberately reassert the stored UFX III console state.
                </p>
              </div>
            </section>
          </div>
        </aside>
      </div>

      {modal.type === "settings" ? (
        <AudioSettingsModal
          settings={audioSettings}
          onClose={() => setModal({ type: "none" })}
          onSaved={onDataChange}
        />
      ) : null}
    </div>
  );
}
