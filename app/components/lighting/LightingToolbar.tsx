"use client";

import type { DmxStatus } from "@/lib/types";
import HoldButton from "../shared/HoldButton";

interface LightingToolbarProps {
  allLoading: boolean;
  onAllOn: () => void;
  onAllOff: () => void;
  gmValue: number;
  onGmDrag: (val: number) => void;
  onGmRelease: (val: number) => void;
  dmxStatus: DmxStatus;
  showDmxHint: boolean;
  onDismissHint: () => void;
}

export default function LightingToolbar({
  allLoading,
  onAllOn,
  onAllOff,
  gmValue,
  onGmDrag,
  onGmRelease,
  dmxStatus,
  showDmxHint,
  onDismissHint,
}: LightingToolbarProps) {
  const dmxTone = !dmxStatus.enabled
    ? "border-studio-700/80 bg-studio-950/50 text-studio-500"
    : dmxStatus.reachable
      ? "border-accent-green/20 bg-accent-green/10 text-accent-green"
      : "border-accent-red/20 bg-accent-red/10 text-accent-red";

  return (
    <div className="console-toolbar-surface">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* All On / All Off */}
        <div className="flex rounded-badge border border-studio-700 bg-studio-800">
          <button
            type="button"
            onClick={onAllOn}
            disabled={allLoading}
            className="rounded-l-badge px-3 py-1.5 text-xs text-studio-300 transition-colors hover:text-studio-100 disabled:opacity-50"
          >
            All On
          </button>
          <div className="w-px bg-studio-700" />
          <HoldButton
            onConfirm={onAllOff}
            holdDuration={2000}
            disabled={allLoading}
            className="rounded-r-badge px-3 py-1.5 text-xs text-studio-300 transition-colors hover:text-studio-100 disabled:opacity-50"
            title="Hold to turn all lights off"
          >
            All Off
          </HoldButton>
        </div>

        {/* Grand Master fader */}
        <div className="flex items-center gap-2 rounded-card border border-studio-700 bg-studio-800/80 px-3 py-2">
          <label
            htmlFor="lighting-grand-master"
            className="text-xxs font-bold uppercase tracking-widest text-studio-500"
          >
            GM
          </label>
          <input
            id="lighting-grand-master"
            type="range"
            min="0"
            max="100"
            value={gmValue}
            aria-label="Grand master"
            aria-valuetext={`${gmValue}%`}
            onChange={(e) => onGmDrag(Number(e.target.value))}
            onMouseUp={(e) => onGmRelease(Number((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => onGmRelease(Number((e.target as HTMLInputElement).value))}
            className="light-slider w-28"
            style={{
              background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${gmValue}%, #242430 ${gmValue}%, #242430 100%)`,
            }}
          />
          <span
            className={`min-w-[2.2rem] text-right font-mono text-xs tabular-nums ${
              gmValue < 100 ? "text-accent-amber" : "text-studio-400"
            }`}
          >
            {gmValue}%
          </span>
        </div>
      </div>

      {/* DMX status */}
      <div className="relative flex items-center gap-2">
        <span className={`console-status-pill ${dmxTone}`}>
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              !dmxStatus.enabled ? "bg-studio-600" : dmxStatus.reachable ? "bg-accent-green" : "bg-accent-red"
            }`}
          />
          {!dmxStatus.enabled ? "DMX Off" : dmxStatus.reachable ? "Bridge Ready" : "Bridge Down"}
        </span>
        {showDmxHint && (
          <button
            type="button"
            onClick={onDismissHint}
            className="absolute right-0 top-7 z-10 w-56 rounded-card border border-studio-600 bg-studio-800 p-2 text-left text-xs text-studio-300 shadow-modal"
          >
            <span className="font-medium text-studio-200">Status indicator:</span> Green = connected, Red = unreachable,
            Gray = disabled
            <span className="ml-1 text-studio-500">(click to dismiss)</span>
          </button>
        )}
      </div>
    </div>
  );
}
