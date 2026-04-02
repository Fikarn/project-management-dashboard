"use client";

import { useRef, useCallback, useState, useMemo } from "react";
import { Settings2, X, ChevronLeft } from "lucide-react";
import type { Light, ColorMode, EffectType, LightEffect } from "@/lib/types";
import { getCctRange, supportsRgb, supportsGm } from "@/lib/light-types";
import HueWheel, { rgbToHs, hsiToRgb } from "./HueWheel";

interface LightValues {
  intensity?: number;
  cct?: number;
  on?: boolean;
  red?: number;
  green?: number;
  blue?: number;
  colorMode?: ColorMode;
  gmTint?: number | null;
}

interface SpatialLightPanelProps {
  light: Light;
  onUpdate: (values: LightValues) => void;
  onDmx: (values: LightValues) => void;
  onEdit: () => void;
  onDelete: () => void;
  onEffect: (effect: LightEffect | null) => void;
  onDeselect: () => void;
}

const EFFECTS: { type: EffectType; label: string }[] = [
  { type: "pulse", label: "Pulse" },
  { type: "strobe", label: "Strobe" },
  { type: "candle", label: "Candle" },
];

const TYPE_LABELS: Record<string, string> = {
  "astra-bicolor": "Astra",
  infinimat: "Infinimat",
  "infinibar-pb12": "Infinibar",
};

const CCT_PRESETS = [
  { label: "Tungsten", cct: 3200, color: "#ff9329" },
  { label: "Halogen", cct: 3400, color: "#ffab4a" },
  { label: "Fluorescent", cct: 4200, color: "#ffe0b5" },
  { label: "Daylight", cct: 5600, color: "#fff5e6" },
  { label: "Overcast", cct: 6500, color: "#d6e4f0" },
  { label: "Shade", cct: 7500, color: "#b8cfe0" },
];

const GEL_PRESETS = [
  { label: "Full CTO", cct: 3200, color: "#ff8c00" },
  { label: "1/2 CTO", cct: 3800, color: "#ffab4a" },
  { label: "1/4 CTO", cct: 4400, color: "#ffc980" },
  { label: "1/4 CTB", cct: 5200, color: "#e8eef5" },
  { label: "1/2 CTB", cct: 6500, color: "#c4d6ea" },
  { label: "Full CTB", cct: 8000, color: "#8db4d9" },
];

export default function SpatialLightPanel({
  light,
  onUpdate,
  onDmx,
  onEdit,
  onDelete,
  onEffect,
  onDeselect,
}: SpatialLightPanelProps) {
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

  const [cctMin, cctMax] = getCctRange(light.type);
  const hasRgb = supportsRgb(light.type);
  const hasGm = supportsGm(light.type);

  const [dragging, setDragging] = useState<Record<string, number | null>>({});
  const sliderVal = (key: string, propVal: number) => dragging[key] ?? propVal;
  const startDrag = (key: string, val: number) => setDragging((d) => ({ ...d, [key]: val }));
  const endDrag = (key: string) => setDragging((d) => ({ ...d, [key]: null }));

  const intensityVal = sliderVal("intensity", light.intensity);
  const intensityGradient = `linear-gradient(to right, #b45309 0%, #fbbf24 ${intensityVal}%, #242430 ${intensityVal}%, #242430 100%)`;

  const cctGradient =
    cctMin >= 3000
      ? "linear-gradient(to right, #ff9329, #fff5e6, #a8c4e0)"
      : "linear-gradient(to right, #ff6b00, #ff9329, #fff5e6, #a8c4e0, #8db4d9)";

  // HSI
  const [hsiHue, hsiSat] = useMemo(
    () => rgbToHs(light.red, light.green, light.blue),
    [light.red, light.green, light.blue]
  );
  const [localHue, setLocalHue] = useState<number | null>(null);
  const [localSat, setLocalSat] = useState<number | null>(null);

  const handleHsiChange = useCallback(
    (h: number, s: number) => {
      setLocalHue(h);
      setLocalSat(s);
      const [r, g, b] = hsiToRgb(h, s);
      throttledDmx({ red: r, green: g, blue: b });
    },
    [throttledDmx]
  );

  const handleHsiChangeEnd = useCallback(
    (h: number, s: number) => {
      const [r, g, b] = hsiToRgb(h, s);
      setLocalHue(null);
      setLocalSat(null);
      onUpdate({ red: r, green: g, blue: b });
    },
    [onUpdate]
  );

  const colorModes: { mode: ColorMode; label: string }[] = hasRgb
    ? [
        { mode: "cct", label: "CCT" },
        { mode: "hsi", label: "HSI" },
        { mode: "rgb", label: "RGB" },
      ]
    : [];

  return (
    <div className="animate-fade-in rounded-card border border-studio-750 bg-studio-850 p-3">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={onDeselect}
          className="rounded-badge p-1 text-studio-500 transition-colors hover:bg-studio-750 hover:text-studio-300"
          title="Back"
        >
          <ChevronLeft size={14} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-semibold text-studio-100">{light.name}</span>
            <span className="shrink-0 rounded-badge bg-studio-750/60 px-1.5 py-0.5 text-micro font-medium text-studio-500">
              {TYPE_LABELS[light.type] ?? light.type}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="rounded-badge p-1 text-studio-500 transition-colors hover:bg-studio-750 hover:text-studio-300"
            title="Edit light"
          >
            <Settings2 size={13} />
          </button>
          <button
            onClick={onDelete}
            className="rounded-badge p-1 text-studio-500 transition-colors hover:bg-studio-750 hover:text-red-400"
            title="Delete light"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Power toggle */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xxs font-medium text-studio-400">Power</span>
        <button
          onClick={() => onUpdate({ on: !light.on })}
          className={`relative h-6 w-10 rounded-full transition-all duration-200 ${
            light.on ? "bg-accent-blue" : "bg-studio-600"
          }`}
          title={light.on ? "Turn off" : "Turn on"}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200 ${
              light.on ? "left-[18px]" : "left-0.5"
            }`}
          />
        </button>
      </div>

      {/* Intensity */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <label className="text-xxs font-medium text-studio-400">Intensity</label>
          <span className="font-mono text-xxs tabular-nums text-studio-300">{intensityVal}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={intensityVal}
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

      {/* Color mode toggle */}
      {hasRgb && (
        <div className="mb-3 flex items-center gap-1">
          {colorModes.map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => onUpdate({ colorMode: mode })}
              className={`rounded-badge px-2 py-0.5 text-micro font-semibold tracking-wide transition-colors ${
                light.colorMode === mode
                  ? "bg-accent-cyan/15 text-accent-cyan"
                  : "bg-studio-750/50 text-studio-500 hover:bg-studio-750 hover:text-studio-300"
              }`}
            >
              {label}
            </button>
          ))}
          {(light.colorMode === "rgb" || light.colorMode === "hsi") && (
            <div
              className="ml-auto h-4 w-4 rounded-full border-2 border-white/20 shadow-sm"
              style={{ backgroundColor: `rgb(${light.red}, ${light.green}, ${light.blue})` }}
            />
          )}
        </div>
      )}

      {/* CCT slider */}
      {(!hasRgb || light.colorMode === "cct") && (
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xxs font-medium text-studio-400">CCT</label>
            <span className="font-mono text-xxs tabular-nums text-studio-300">{sliderVal("cct", light.cct)}K</span>
          </div>
          <input
            type="range"
            min={cctMin}
            max={cctMax}
            step="100"
            value={sliderVal("cct", light.cct)}
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
          <div className="mt-0.5 flex justify-between text-micro text-studio-500">
            <span>{cctMin}K</span>
            <span>{cctMax}K</span>
          </div>

          {/* CCT presets */}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {CCT_PRESETS.filter((p) => p.cct >= cctMin && p.cct <= cctMax).map((preset) => (
              <button
                key={preset.label}
                onClick={() => onUpdate({ cct: preset.cct })}
                className={`flex items-center gap-1 rounded-badge px-1.5 py-0.5 text-micro transition-colors ${
                  light.cct === preset.cct
                    ? "bg-studio-600 text-studio-100"
                    : "bg-studio-750/40 text-studio-500 hover:bg-studio-750 hover:text-studio-300"
                }`}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: preset.color }} />
                {preset.label}
              </button>
            ))}
          </div>

          {/* Gel presets */}
          <div className="mt-1 flex flex-wrap gap-1">
            {GEL_PRESETS.filter((g) => g.cct >= cctMin && g.cct <= cctMax).map((gel) => (
              <button
                key={gel.label}
                onClick={() => onUpdate({ cct: gel.cct })}
                className={`flex items-center gap-1 rounded-badge border px-1.5 py-0.5 text-micro transition-colors ${
                  light.cct === gel.cct
                    ? "border-studio-500 bg-studio-600 text-studio-100"
                    : "border-studio-750/50 bg-transparent text-studio-500 hover:border-studio-600 hover:text-studio-300"
                }`}
              >
                <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: gel.color }} />
                {gel.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* G/M Tint */}
      {hasGm && (
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xxs font-medium text-studio-400">G/M Tint</label>
            <div className="flex items-center gap-2">
              {light.gmTint !== null && (
                <span className="font-mono text-xxs tabular-nums text-studio-300">
                  {(() => {
                    const v = sliderVal("gmTint", light.gmTint);
                    return v > 0 ? `+${v}` : v;
                  })()}
                  %
                </span>
              )}
              <button
                onClick={() => onUpdate({ gmTint: light.gmTint === null ? 0 : null })}
                className={`rounded-badge px-1.5 py-0.5 text-micro font-semibold transition-colors ${
                  light.gmTint === null ? "bg-studio-750/50 text-studio-400" : "bg-accent-cyan/15 text-accent-cyan"
                }`}
              >
                {light.gmTint === null ? "Off" : "On"}
              </button>
            </div>
          </div>
          {light.gmTint !== null && (
            <>
              <input
                type="range"
                min="-100"
                max="100"
                value={sliderVal("gmTint", light.gmTint)}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  startDrag("gmTint", val);
                  throttledDmx({ gmTint: val });
                }}
                onMouseUp={(e) => {
                  const val = Number((e.target as HTMLInputElement).value);
                  endDrag("gmTint");
                  onUpdate({ gmTint: val });
                }}
                onTouchEnd={(e) => {
                  const val = Number((e.target as HTMLInputElement).value);
                  endDrag("gmTint");
                  onUpdate({ gmTint: val });
                }}
                className="light-slider"
                style={{ background: "linear-gradient(to right, #d946a8, #a3a3a3, #4ade80)" }}
              />
              <div className="mt-0.5 flex justify-between text-micro text-studio-500">
                <span>&minus;G</span>
                <span>0</span>
                <span>+G</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* HSI wheel */}
      {hasRgb && light.colorMode === "hsi" && (
        <div className="mb-3 flex justify-center">
          <HueWheel
            hue={localHue ?? hsiHue}
            saturation={localSat ?? hsiSat}
            onChange={handleHsiChange}
            onChangeEnd={handleHsiChangeEnd}
            disabled={!light.on}
          />
        </div>
      )}

      {/* RGB sliders */}
      {hasRgb && light.colorMode === "rgb" && (
        <div className="mb-3 space-y-2">
          {(["red", "green", "blue"] as const).map((channel) => {
            const colorMap = { red: "#ef4444", green: "#22c55e", blue: "#3b82f6" };
            const labelMap = { red: "R", green: "G", blue: "B" };
            const val = sliderVal(channel, light[channel]);
            return (
              <div key={channel}>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xxs font-medium" style={{ color: colorMap[channel] }}>
                    {labelMap[channel]}
                  </label>
                  <span className="font-mono text-xxs tabular-nums text-studio-300">{val}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={val}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    startDrag(channel, v);
                    throttledDmx({ [channel]: v });
                  }}
                  onMouseUp={(e) => {
                    const v = Number((e.target as HTMLInputElement).value);
                    endDrag(channel);
                    onUpdate({ [channel]: v });
                  }}
                  onTouchEnd={(e) => {
                    const v = Number((e.target as HTMLInputElement).value);
                    endDrag(channel);
                    onUpdate({ [channel]: v });
                  }}
                  className="light-slider"
                  style={{
                    background: `linear-gradient(to right, #0d0d12 0%, ${colorMap[channel]} ${(val / 255) * 100}%, #242430 ${(val / 255) * 100}%, #242430 100%)`,
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Effects */}
      <div className="border-t border-studio-750/40 pt-2">
        <div className="flex items-center gap-1">
          <span className="mr-1 text-micro font-medium text-studio-500">FX</span>
          {EFFECTS.map((fx) => {
            const isActive = light.effect?.type === fx.type;
            return (
              <button
                key={fx.type}
                onClick={() => onEffect(isActive ? null : { type: fx.type, speed: light.effect?.speed ?? 5 })}
                className={`rounded-badge px-2 py-0.5 text-micro font-medium transition-colors ${
                  isActive
                    ? "bg-accent-amber/20 text-accent-amber"
                    : "bg-studio-750/40 text-studio-500 hover:bg-studio-750 hover:text-studio-300"
                }`}
              >
                {fx.label}
              </button>
            );
          })}
        </div>
        {light.effect && (
          <div className="mt-2">
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xxs font-medium text-studio-400">Speed</label>
              <span className="font-mono text-xxs tabular-nums text-studio-300">{light.effect.speed}</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={light.effect.speed}
              onChange={(e) => {
                const speed = Number(e.target.value);
                onEffect({ type: light.effect!.type, speed });
              }}
              className="light-slider"
              style={{
                background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${((light.effect.speed - 1) / 9) * 100}%, #242430 ${((light.effect.speed - 1) / 9) * 100}%, #242430 100%)`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
