"use client";

import { useRef, useCallback } from "react";
import type { Light } from "@/lib/types";

interface LightCardProps {
  light: Light;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (values: { intensity?: number; cct?: number; on?: boolean }) => void;
  onDmx: (values: { intensity?: number; cct?: number; on?: boolean }) => void;
  onEdit: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  "astra-bicolor": "Astra",
  infinimat: "Infinimat",
};

export default function LightCard({
  light,
  isSelected,
  onSelect,
  onUpdate,
  onDmx,
  onEdit,
}: LightCardProps) {
  const rafRef = useRef<number | null>(null);

  const throttledDmx = useCallback(
    (values: { intensity?: number; cct?: number; on?: boolean }) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        onDmx(values);
        rafRef.current = null;
      });
    },
    [onDmx]
  );

  return (
    <div
      className={`bg-gray-800 border rounded-lg p-4 cursor-pointer transition-colors ${
        isSelected ? "border-blue-500 ring-1 ring-blue-500/30" : "border-gray-700 hover:border-gray-600"
      }`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${light.on ? "bg-yellow-400" : "bg-gray-600"}`}
          />
          <span className="text-sm font-medium text-white">{light.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
            {TYPE_LABELS[light.type] ?? light.type}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="text-gray-500 hover:text-gray-300 text-xs"
            title="Edit light"
          >
            &#9881;
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdate({ on: !light.on });
            }}
            className={`w-9 h-5 rounded-full relative transition-colors ${
              light.on ? "bg-blue-600" : "bg-gray-600"
            }`}
            title={light.on ? "Turn off" : "Turn on"}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                light.on ? "left-[18px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Intensity slider */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] text-gray-400">Intensity</label>
          <span className="text-[11px] text-gray-300 font-mono">{light.intensity}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={light.intensity}
          onChange={(e) => {
            const val = Number(e.target.value);
            throttledDmx({ intensity: val });
          }}
          onMouseUp={(e) => {
            const val = Number((e.target as HTMLInputElement).value);
            onUpdate({ intensity: val });
          }}
          onTouchEnd={(e) => {
            const val = Number((e.target as HTMLInputElement).value);
            onUpdate({ intensity: val });
          }}
          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* CCT slider */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] text-gray-400">CCT</label>
          <span className="text-[11px] text-gray-300 font-mono">{light.cct}K</span>
        </div>
        <input
          type="range"
          min="2700"
          max="6500"
          step="100"
          value={light.cct}
          onChange={(e) => {
            const val = Number(e.target.value);
            throttledDmx({ cct: val });
          }}
          onMouseUp={(e) => {
            const val = Number((e.target as HTMLInputElement).value);
            onUpdate({ cct: val });
          }}
          onTouchEnd={(e) => {
            const val = Number((e.target as HTMLInputElement).value);
            onUpdate({ cct: val });
          }}
          className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
          style={{
            background: "linear-gradient(to right, #ff9329, #fff5e6, #a8c4e0)",
          }}
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex justify-between text-[9px] text-gray-500 mt-0.5">
          <span>2700K</span>
          <span>6500K</span>
        </div>
      </div>
    </div>
  );
}
