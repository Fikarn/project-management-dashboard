"use client";

import { useRef, useCallback, useState } from "react";
import { X } from "lucide-react";
import type { Light, LightValues } from "@/lib/types";

interface SpatialMultiPanelProps {
  lights: Light[];
  onUpdate: (values: LightValues) => void;
  onDmx: (values: LightValues) => void;
  onDeselect: () => void;
}

export default function SpatialMultiPanel({ lights, onUpdate, onDmx, onDeselect }: SpatialMultiPanelProps) {
  const rafRef = useRef<number | null>(null);

  const throttledDmx = useCallback(
    (values: LightValues) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        onDmx(values);
        rafRef.current = null;
      });
    },
    [onDmx]
  );

  const [dragging, setDragging] = useState<Record<string, number | null>>({});
  const startDrag = (key: string, val: number) => setDragging((d) => ({ ...d, [key]: val }));
  const endDrag = (key: string) => setDragging((d) => ({ ...d, [key]: null }));

  // Compute aggregated values
  const allOn = lights.every((l) => l.on);
  const allOff = lights.every((l) => !l.on);
  const intensities = lights.map((l) => l.intensity);
  const avgIntensity = Math.round(intensities.reduce((a, b) => a + b, 0) / lights.length);
  const ccts = lights.map((l) => l.cct);
  const avgCct = Math.round(ccts.reduce((a, b) => a + b, 0) / lights.length);
  const mixedIntensity = new Set(intensities).size > 1;
  const mixedCct = new Set(ccts).size > 1;

  const intensityVal = dragging["intensity"] ?? avgIntensity;
  const cctVal = dragging["cct"] ?? avgCct;

  const intensityGradient = `linear-gradient(to right, #b45309 0%, #fbbf24 ${intensityVal}%, #242430 ${intensityVal}%, #242430 100%)`;
  const cctGradient = "linear-gradient(to right, #ff6b00, #ff9329, #fff5e6, #a8c4e0, #8db4d9)";

  return (
    <div className="animate-fade-in rounded-card border border-studio-750 bg-studio-850 p-3">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={onDeselect}
          className="rounded-badge p-1 text-studio-500 transition-colors hover:bg-studio-750 hover:text-studio-300"
          title="Deselect all"
        >
          <X size={14} />
        </button>
        <div className="min-w-0 flex-1">
          <span className="text-xs font-semibold text-studio-100">{lights.length} lights selected</span>
        </div>
      </div>

      {/* Power toggle */}
      <div className="mb-3 flex items-center justify-between">
        <span id="spatial-multi-power-label" className="text-xxs font-medium text-studio-400">
          Power
          {!allOn && !allOff && (
            <span className="ml-1 rounded-badge bg-studio-700/50 px-1.5 py-0.5 text-xxs text-studio-500">mixed</span>
          )}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={allOn ? true : allOff ? false : "mixed"}
          aria-labelledby="spatial-multi-power-label"
          onClick={() => onUpdate({ on: !allOn })}
          className={`relative h-6 w-10 rounded-full transition-all duration-200 ${
            allOn ? "bg-accent-blue" : allOff ? "bg-studio-600" : "bg-accent-blue/50"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200 ${
              allOn ? "left-[18px]" : "left-0.5"
            }`}
          />
        </button>
      </div>

      {/* Intensity */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="spatial-multi-intensity" className="text-xxs font-medium text-studio-400">
            Intensity
            {mixedIntensity && dragging["intensity"] == null && (
              <span className="ml-1 rounded-badge bg-studio-700/50 px-1.5 py-0.5 text-xxs text-studio-500">mixed</span>
            )}
          </label>
          <span className="font-mono text-xxs tabular-nums text-studio-300">{intensityVal}%</span>
        </div>
        <input
          id="spatial-multi-intensity"
          type="range"
          min="0"
          max="100"
          value={intensityVal}
          aria-label={`Group intensity (${lights.length} lights)`}
          aria-valuetext={`${intensityVal}%`}
          onChange={(e) => {
            const val = Number(e.target.value);
            startDrag("intensity", val);
            throttledDmx({ intensity: val });
          }}
          onMouseUp={(e) => {
            const val = Number((e.target as HTMLInputElement).value);
            endDrag("intensity");
            onUpdate({ intensity: val });
          }}
          onTouchEnd={(e) => {
            const val = Number((e.target as HTMLInputElement).value);
            endDrag("intensity");
            onUpdate({ intensity: val });
          }}
          className="light-slider"
          style={{ background: intensityGradient }}
        />
      </div>

      {/* CCT */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="spatial-multi-cct" className="text-xxs font-medium text-studio-400">
            CCT
            {mixedCct && dragging["cct"] == null && (
              <span className="ml-1 rounded-badge bg-studio-700/50 px-1.5 py-0.5 text-xxs text-studio-500">mixed</span>
            )}
          </label>
          <span className="font-mono text-xxs tabular-nums text-studio-300">{cctVal}K</span>
        </div>
        <input
          id="spatial-multi-cct"
          type="range"
          min="2000"
          max="10000"
          step="100"
          value={cctVal}
          aria-label={`Group color temperature (${lights.length} lights)`}
          aria-valuetext={`${cctVal} Kelvin`}
          onChange={(e) => {
            const val = Number(e.target.value);
            startDrag("cct", val);
            throttledDmx({ cct: val });
          }}
          onMouseUp={(e) => {
            const val = Number((e.target as HTMLInputElement).value);
            endDrag("cct");
            onUpdate({ cct: val });
          }}
          onTouchEnd={(e) => {
            const val = Number((e.target as HTMLInputElement).value);
            endDrag("cct");
            onUpdate({ cct: val });
          }}
          className="light-slider"
          style={{ background: cctGradient }}
        />
        <div className="mt-0.5 flex justify-between text-xxs text-studio-500">
          <span>2000K</span>
          <span>10000K</span>
        </div>
      </div>
    </div>
  );
}
