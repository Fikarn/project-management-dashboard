"use client";

import { ShieldCheck, Settings } from "lucide-react";
import type {
  AudioConsoleStateConfidence,
  AudioConsoleSyncReason,
  AudioMixTarget,
  AudioSnapshot,
  OscStatus,
} from "@/lib/types";
import HoldButton from "../shared/HoldButton";

interface AudioToolbarProps {
  oscStatus: OscStatus;
  mixTargets: AudioMixTarget[];
  selectedMixTargetId: string;
  selectedChannelName: string | null;
  inputCount: number;
  playbackCount: number;
  liveCount: number;
  snapshots: AudioSnapshot[];
  activeSnapshotId: string | null;
  consoleStateConfidence: AudioConsoleStateConfidence;
  lastConsoleSyncAt: string | null;
  lastConsoleSyncReason: AudioConsoleSyncReason;
  lastSnapshotRecallAt: string | null;
  syncingConsole: boolean;
  onSelectMixTarget: (mixTargetId: string) => void;
  onUpdateMixTarget: (mixTargetId: string, values: Record<string, unknown>) => void;
  onRecallSnapshot: (snapshot: AudioSnapshot) => void;
  onSyncConsole: () => void;
  onOpenSettings: () => void;
}

function formatEventTime(iso: string | null): string {
  if (!iso) return "Never";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function MixTargetCard({
  target,
  selected,
  onSelect,
  onUpdate,
}: {
  target: AudioMixTarget;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (values: Record<string, unknown>) => void;
}) {
  const volumeDb = target.volume === 0 ? "-inf" : `${((target.volume - 0.75) * 60).toFixed(1)} dB`;

  return (
    <div
      data-testid={`audio-mix-target-${target.id}`}
      className={`rounded-[18px] border px-3 py-3 transition-all ${
        selected
          ? "border-accent-blue/45 bg-accent-blue/10 shadow-[0_12px_30px_rgba(37,99,235,0.12)]"
          : "border-studio-700/80 bg-studio-950/45"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onSelect} className="min-w-0 text-left">
          <div className="console-label">{target.shortName}</div>
          <div className="mt-1 text-sm font-semibold text-studio-50">{target.name}</div>
          <div className="mt-1 text-xxs text-studio-500">
            Output {target.oscChannel}/{target.oscChannel + 1}
          </div>
        </button>

        {selected ? (
          <span className="rounded-pill bg-accent-blue/15 px-2 py-0.5 text-xxs font-semibold uppercase tracking-[0.18em] text-accent-blue">
            Active Mix
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2 text-xxs uppercase tracking-[0.16em] text-studio-500">
            <span>Level</span>
            <span className="font-mono text-studio-300">{volumeDb}</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={target.volume}
            onChange={(event) => onUpdate({ volume: parseFloat(event.target.value) })}
            aria-label={`${target.name} output level`}
            title={`${target.name} output level`}
            className="audio-gain-slider h-2 w-full cursor-pointer appearance-none rounded-full bg-studio-700"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${target.volume * 100}%, rgba(49,56,71,0.95) ${target.volume * 100}%, rgba(49,56,71,0.95) 100%)`,
            }}
          />
        </div>

        <button
          type="button"
          onClick={() => onUpdate({ mute: !target.mute })}
          className={`rounded-badge px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${
            target.mute
              ? "bg-red-600 text-white"
              : "bg-studio-700 text-studio-300 hover:bg-studio-600 hover:text-studio-100"
          }`}
        >
          Mute
        </button>
      </div>

      {target.role === "main-out" ? (
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onUpdate({ dim: !target.dim })}
            className={`rounded-badge px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${
              target.dim ? "bg-amber-500 text-studio-950" : "bg-studio-700 text-studio-300 hover:bg-studio-600"
            }`}
          >
            Dim
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ mono: !target.mono })}
            className={`rounded-badge px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${
              target.mono ? "bg-accent-blue text-studio-950" : "bg-studio-700 text-studio-300 hover:bg-studio-600"
            }`}
          >
            Mono
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ talkback: !target.talkback })}
            className={`rounded-badge px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${
              target.talkback ? "bg-accent-green text-studio-950" : "bg-studio-700 text-studio-300 hover:bg-studio-600"
            }`}
          >
            Talk
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function AudioToolbar({
  oscStatus,
  mixTargets,
  selectedMixTargetId,
  selectedChannelName,
  inputCount,
  playbackCount,
  liveCount,
  snapshots,
  activeSnapshotId,
  consoleStateConfidence,
  lastConsoleSyncAt,
  lastConsoleSyncReason,
  lastSnapshotRecallAt,
  syncingConsole,
  onSelectMixTarget,
  onUpdateMixTarget,
  onRecallSnapshot,
  onSyncConsole,
  onOpenSettings,
}: AudioToolbarProps) {
  const activeSnapshot = snapshots.find((snapshot) => snapshot.id === activeSnapshotId) ?? null;
  const statusTone = !oscStatus.enabled
    ? "text-studio-500"
    : oscStatus.meteringState === "live"
      ? "text-accent-green"
      : oscStatus.meteringState === "stale" ||
          oscStatus.meteringState === "awaiting-peak-data" ||
          oscStatus.meteringState === "transport-only"
        ? "text-accent-amber"
        : "text-accent-red";
  const statusLabel =
    oscStatus.meteringState === "live"
      ? "Meter return verified"
      : oscStatus.meteringState === "stale"
        ? "Meter return stale"
        : oscStatus.meteringState === "awaiting-peak-data"
          ? "Transport ready, awaiting peak data"
          : oscStatus.meteringState === "transport-only"
            ? "Transport ready, peak verification optional"
            : !oscStatus.enabled
              ? "OSC disabled"
              : "OSC offline";
  const statusDetail =
    oscStatus.meteringState === "live"
      ? `${oscStatus.activeMeterChannels ?? 0} channels returning live peak data`
      : oscStatus.meteringState === "stale"
        ? `Last meter ${formatEventTime(oscStatus.lastMeterAt ?? null)}`
        : oscStatus.meteringState === "awaiting-peak-data"
          ? "Check TotalMix OSC: Send Peak Level Data"
          : oscStatus.meteringState === "transport-only"
            ? "Inbound peak verification is disabled in this console profile"
            : "No active TotalMix transport detected";
  const consoleTone = consoleStateConfidence === "aligned" ? "text-accent-green" : "text-accent-amber";
  const consoleLabel =
    consoleStateConfidence === "aligned"
      ? "Console aligned"
      : lastConsoleSyncReason === "snapshot"
        ? "Snapshot changed hardware"
        : "Console state assumed";
  const consoleDetail =
    consoleStateConfidence === "aligned"
      ? `Last full push ${formatEventTime(lastConsoleSyncAt)}`
      : lastConsoleSyncReason === "snapshot"
        ? `A TotalMix snapshot was recalled ${formatEventTime(lastSnapshotRecallAt)}. Sync before trusting stored strip values.`
        : "Startup is read-safe. This surface does not read back every TotalMix parameter until you intentionally sync.";

  return (
    <div className="console-surface-strong grid gap-3 px-3 py-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1.6fr)]">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div className="console-surface-soft flex flex-col gap-3 px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="console-label">OSC Link</div>
              <div className={`mt-1 text-sm font-semibold ${statusTone}`}>{statusLabel}</div>
              <div className="mt-1 text-xxs text-studio-500">{statusDetail}</div>
            </div>
            <button
              type="button"
              onClick={onOpenSettings}
              className="rounded-badge border border-studio-700 bg-studio-900/70 px-3 py-1.5 text-xs font-medium text-studio-300 transition-colors hover:border-studio-600 hover:bg-studio-850 hover:text-studio-100"
            >
              <span className="inline-flex items-center gap-1.5">
                <Settings size={14} />
                Settings
              </span>
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="console-stat-card">
              <div className="console-label">Inputs</div>
              <div className="console-stat-value">{inputCount}</div>
            </div>
            <div className="console-stat-card">
              <div className="console-label">Playback</div>
              <div className="console-stat-value">{playbackCount}</div>
            </div>
            <div className="console-stat-card">
              <div className="console-label">Live</div>
              <div className="console-stat-value">{liveCount}</div>
            </div>
          </div>

          <div
            data-testid="audio-toolbar-selected"
            className="rounded-[14px] border border-studio-800 bg-studio-950/45 px-3 py-2.5"
          >
            <div className="console-label">Focus</div>
            <div className="mt-1 text-sm font-semibold text-studio-100">
              {selectedChannelName ? selectedChannelName : "No strip selected"}
            </div>
            <div className="mt-1 text-xxs text-studio-500">
              {mixTargets.find((target) => target.id === selectedMixTargetId)?.name ?? "Main Out"} mix is active
            </div>
          </div>

          <div className="bg-emerald-500/8 rounded-[14px] border border-emerald-500/20 px-3 py-2.5 text-xxs leading-5 text-emerald-100/80">
            <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.16em] text-emerald-200">
              <ShieldCheck size={13} />
              Safe Startup
            </span>
            <div className="mt-1">
              Opening the page initializes OSC transport only. Stored fader or preamp state is never pushed on load.
            </div>
          </div>

          <div
            data-testid="audio-console-state"
            className="rounded-[14px] border border-studio-800 bg-studio-950/45 px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="console-label">Console State</div>
                <div className={`mt-1 text-sm font-semibold ${consoleTone}`}>{consoleLabel}</div>
                <div className="mt-1 text-xxs leading-5 text-studio-500">{consoleDetail}</div>
              </div>
              <HoldButton
                onConfirm={onSyncConsole}
                holdDuration={1200}
                disabled={!oscStatus.enabled || syncingConsole}
                className={`rounded-badge border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${
                  syncingConsole
                    ? "border-accent-blue/40 bg-accent-blue/15 text-accent-blue"
                    : "border-studio-700 bg-studio-900/70 text-studio-200 hover:border-accent-blue/35 hover:bg-studio-850 hover:text-studio-50"
                }`}
                title="Hold to push the current console state to TotalMix"
              >
                {syncingConsole ? "Syncing..." : "Sync Console"}
              </HoldButton>
            </div>
          </div>
        </div>

        <div className="console-surface-soft flex min-h-0 flex-col gap-3 px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="console-label">Snapshots</div>
              <div className="mt-1 text-sm font-semibold text-studio-100">Hold to recall approved TotalMix setups</div>
              <div className="mt-1 text-xxs text-studio-500">
                {activeSnapshot ? `Active: ${activeSnapshot.name}` : "No snapshot recalled this session"}
              </div>
            </div>
            <div className="text-right text-xxs text-studio-500">
              <div className="font-mono">{oscStatus.oscSendHost}</div>
              <div className="font-mono">
                TX {oscStatus.oscSendPort} / RX {oscStatus.oscReceivePort}
              </div>
            </div>
          </div>

          {consoleStateConfidence === "assumed" && lastConsoleSyncReason === "snapshot" ? (
            <div className="bg-amber-500/8 rounded-[14px] border border-amber-500/20 px-3 py-2.5 text-xxs leading-5 text-amber-100/85">
              Snapshot recall changes hardware outside this surface. Hold{" "}
              <span className="font-semibold text-amber-50">Sync Console</span> after recall if you want the app to
              reassert its stored mix.
            </div>
          ) : null}

          <div data-testid="audio-snapshot-rail" className="grid gap-2 sm:grid-cols-3">
            {snapshots.map((snapshot) => (
              <HoldButton
                key={snapshot.id}
                onConfirm={() => onRecallSnapshot(snapshot)}
                holdDuration={1200}
                className={`rounded-[14px] border px-3 py-3 text-left transition-colors ${
                  activeSnapshotId === snapshot.id
                    ? "border-accent-blue/45 bg-accent-blue/10 text-studio-50"
                    : "border-studio-700 bg-studio-950/45 text-studio-200 hover:border-accent-blue/35"
                }`}
                title={`Hold to recall snapshot slot ${snapshot.oscIndex + 1}`}
              >
                <div className="console-label">Slot {snapshot.oscIndex + 1}</div>
                <div className="mt-1 text-sm font-semibold">{snapshot.name}</div>
              </HoldButton>
            ))}
          </div>
        </div>
      </div>

      <div className="console-surface-soft flex min-h-0 flex-col gap-3 px-3 py-3">
        <div>
          <div className="console-label">Control Room</div>
          <div className="mt-1 text-sm font-semibold text-studio-100">
            Select the destination mix before touching strip sends
          </div>
          <div className="mt-1 text-xxs text-studio-500">
            Changing the active mix swaps the send layer shown on every source strip.
          </div>
        </div>

        <div className="grid gap-2 xl:grid-cols-3">
          {mixTargets.map((target) => (
            <MixTargetCard
              key={target.id}
              target={target}
              selected={selectedMixTargetId === target.id}
              onSelect={() => onSelectMixTarget(target.id)}
              onUpdate={(values) => onUpdateMixTarget(target.id, values)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
