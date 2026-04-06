"use client";

import { Settings2 } from "lucide-react";
import type { Light, DmxStatus } from "@/lib/types";

interface CompactLightRowProps {
  light: Light;
  isSelected: boolean;
  dmxStatus: DmxStatus;
  onSelect: () => void;
  onUpdate: (values: { on?: boolean }) => void;
  onEdit: () => void;
}

export default function CompactLightRow({
  light,
  isSelected,
  dmxStatus,
  onSelect,
  onUpdate,
  onEdit,
}: CompactLightRowProps) {
  return (
    <div
      className={`flex cursor-pointer items-center gap-3 rounded-badge border px-3 py-2 transition-colors ${
        isSelected
          ? "border-accent-cyan/40 bg-studio-850"
          : "border-studio-750/50 bg-studio-850/60 hover:border-studio-700"
      }`}
      onClick={onSelect}
    >
      {/* Status dot */}
      <div
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          dmxStatus.enabled && dmxStatus.reachable ? "bg-accent-green" : "bg-accent-red"
        }`}
      />

      {/* Name */}
      <span className="min-w-0 flex-shrink truncate text-xs font-medium text-studio-100">{light.name}</span>

      {/* Mini intensity bar */}
      <div className="flex w-20 shrink-0 items-center gap-1.5">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-studio-750">
          <div
            className="h-full rounded-full bg-accent-amber transition-all"
            style={{ width: `${light.on ? light.intensity : 0}%` }}
          />
        </div>
        <span className="w-7 text-right font-mono text-xxs tabular-nums text-studio-500">
          {light.on ? `${light.intensity}%` : "Off"}
        </span>
      </div>

      {/* CCT or color indicator */}
      <span className="w-12 shrink-0 text-right font-mono text-xxs tabular-nums text-studio-500">
        {light.colorMode === "cct" || light.colorMode === undefined ? `${light.cct}K` : "RGB"}
      </span>

      {/* Edit */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="shrink-0 rounded-badge p-1 text-studio-600 transition-colors hover:text-studio-300"
        title="Edit"
      >
        <Settings2 size={12} />
      </button>

      {/* Power toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onUpdate({ on: !light.on });
        }}
        className={`relative h-6 w-10 shrink-0 rounded-full transition-all duration-200 ${light.on ? "bg-accent-blue" : "bg-studio-600"}`}
        title={light.on ? "Turn off" : "Turn on"}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200 ${
            light.on ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
