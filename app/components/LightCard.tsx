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

export default function LightCard({ light, isSelected, onSelect, onUpdate, onDmx, onEdit }: LightCardProps) {
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
      className={`cursor-pointer rounded-lg border bg-gray-800 p-4 transition-colors ${
        isSelected ? "border-blue-500 ring-1 ring-blue-500/30" : "border-gray-700 hover:border-gray-600"
      }`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${light.on ? "bg-yellow-400" : "bg-gray-600"}`} />
          <span className="text-sm font-medium text-white">{light.name}</span>
          <span className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-400">
            {TYPE_LABELS[light.type] ?? light.type}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="text-xs text-gray-500 hover:text-gray-300"
            title="Edit light"
          >
            &#9881;
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdate({ on: !light.on });
            }}
            className={`relative h-5 w-9 rounded-full transition-colors ${light.on ? "bg-blue-600" : "bg-gray-600"}`}
            title={light.on ? "Turn off" : "Turn on"}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                light.on ? "left-[18px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Intensity slider */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <label className="text-[11px] text-gray-400">Intensity</label>
          <span className="font-mono text-[11px] text-gray-300">{light.intensity}%</span>
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
          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-700 accent-yellow-400"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* CCT slider */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-[11px] text-gray-400">CCT</label>
          <span className="font-mono text-[11px] text-gray-300">{light.cct}K</span>
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
          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg"
          style={{
            background: "linear-gradient(to right, #ff9329, #fff5e6, #a8c4e0)",
          }}
          onClick={(e) => e.stopPropagation()}
        />
        <div className="mt-0.5 flex justify-between text-[9px] text-gray-500">
          <span>2700K</span>
          <span>6500K</span>
        </div>
      </div>
    </div>
  );
}
