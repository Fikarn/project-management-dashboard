"use client";

import { Settings, Plus } from "lucide-react";
import type { AudioSnapshot, OscStatus } from "@/lib/types";

interface AudioToolbarProps {
  oscStatus: OscStatus;
  snapshots: AudioSnapshot[];
  onRecallSnapshot: (snapshot: AudioSnapshot) => void;
  onAddChannel: () => void;
  onOpenSettings: () => void;
}

export default function AudioToolbar({
  oscStatus,
  snapshots,
  onRecallSnapshot,
  onAddChannel,
  onOpenSettings,
}: AudioToolbarProps) {
  return (
    <div className="flex items-center justify-between rounded-card border border-studio-700 bg-studio-850 px-4 py-2">
      {/* Left: OSC status + Add channel */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              oscStatus.connected ? "bg-accent-green" : oscStatus.enabled ? "bg-accent-red" : "bg-studio-600"
            }`}
          />
          <span className="text-studio-400">
            {oscStatus.connected ? "OSC Connected" : oscStatus.enabled ? "OSC Disconnected" : "OSC Disabled"}
          </span>
        </div>
        <button
          onClick={onAddChannel}
          className="flex items-center gap-1 rounded-badge bg-accent-blue px-3 py-1 text-xs font-medium text-studio-950 transition-colors hover:bg-accent-blue/80"
        >
          <Plus size={12} />
          Add Channel
        </button>
      </div>

      {/* Center: Snapshot buttons */}
      {snapshots.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="mr-1 text-micro text-studio-500">Snapshots:</span>
          {snapshots
            .sort((a, b) => a.order - b.order)
            .map((snap) => (
              <button
                key={snap.id}
                onClick={() => onRecallSnapshot(snap)}
                className="rounded-badge border border-studio-600 bg-studio-800 px-2.5 py-1 text-xs text-studio-300 transition-colors hover:border-accent-blue hover:bg-studio-750 hover:text-studio-100"
                title={`Recall TotalMix Snapshot ${snap.oscIndex + 1}`}
              >
                {snap.name}
              </button>
            ))}
        </div>
      )}

      {/* Right: Settings */}
      <button
        onClick={onOpenSettings}
        className="rounded-badge p-2 text-studio-500 transition-colors hover:bg-studio-700 hover:text-studio-200"
        title="Audio Settings"
      >
        <Settings size={16} />
      </button>
    </div>
  );
}
