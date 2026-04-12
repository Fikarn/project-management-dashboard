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
  return (
    <div className="mb-3 flex shrink-0 items-center">
      <div className="flex items-center gap-3">
        {/* All On / All Off */}
        <div className="flex rounded-badge border border-studio-700 bg-studio-800">
          <button
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
        <div className="flex items-center gap-2 rounded-card border border-studio-700 bg-studio-800/80 px-4 py-2">
          <span className="text-xxs font-bold uppercase tracking-widest text-studio-500">GM</span>
          <input
            type="range"
            min="0"
            max="100"
            value={gmValue}
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

        {/* DMX status */}
        <div className="relative flex items-center gap-1.5 text-xs text-studio-500">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              !dmxStatus.enabled ? "bg-studio-600" : dmxStatus.reachable ? "bg-accent-green" : "bg-accent-red"
            }`}
          />
          {!dmxStatus.enabled ? "DMX Off" : dmxStatus.reachable ? "Bridge Connected" : "Bridge Unreachable"}
          {showDmxHint && (
            <button
              onClick={onDismissHint}
              className="absolute left-0 top-6 z-10 w-56 rounded-card border border-studio-600 bg-studio-800 p-2 text-left text-xs text-studio-300 shadow-modal"
            >
              <span className="font-medium text-studio-200">Status indicator:</span> Green = connected, Red =
              unreachable, Gray = disabled
              <span className="ml-1 text-studio-500">(click to dismiss)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
