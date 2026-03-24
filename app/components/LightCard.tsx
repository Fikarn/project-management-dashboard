"use client";

import { useRef, useCallback, useState, useMemo } from "react";
import type { Light, ColorMode, EffectType, LightEffect } from "@/lib/types";
import { getCctRange, supportsRgb, supportsGm } from "@/lib/light-types";
import HueWheel, { rgbToHs, hsiToRgb } from "./HueWheel";

interface DmxStatus {
  connected: boolean;
  reachable: boolean;
  enabled: boolean;
}

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

interface LightCardProps {
  light: Light;
  isSelected: boolean;
  dmxStatus: DmxStatus;
  onSelect: () => void;
  onUpdate: (values: LightValues) => void;
  onDmx: (values: LightValues) => void;
  onEdit: () => void;
  onDelete: () => void;
  onEffect: (effect: LightEffect | null) => void;
}

const EFFECTS: { type: EffectType; label: string; icon: string }[] = [
  { type: "pulse", label: "Pulse", icon: "~" },
  { type: "strobe", label: "Strobe", icon: "⚡" },
  { type: "candle", label: "Candle", icon: "🕯" },
];

const TYPE_LABELS: Record<string, string> = {
  "astra-bicolor": "Astra",
  infinimat: "Infinimat",
  "infinibar-pb12": "Infinibar",
};

// Common white light source presets (Kelvin values)
const CCT_PRESETS = [
  { label: "Tungsten", cct: 3200, color: "#ff9329" },
  { label: "Halogen", cct: 3400, color: "#ffab4a" },
  { label: "Fluorescent", cct: 4200, color: "#ffe0b5" },
  { label: "Daylight", cct: 5600, color: "#fff5e6" },
  { label: "Overcast", cct: 6500, color: "#d6e4f0" },
  { label: "Shade", cct: 7500, color: "#b8cfe0" },
];

// CTO/CTB gel presets — standard film industry corrections
// CTO (Color Temperature Orange) warms: shifts daylight toward tungsten
// CTB (Color Temperature Blue) cools: shifts tungsten toward daylight
const GEL_PRESETS = [
  { label: "Full CTO", cct: 3200, color: "#ff8c00" },
  { label: "1/2 CTO", cct: 3800, color: "#ffab4a" },
  { label: "1/4 CTO", cct: 4400, color: "#ffc980" },
  { label: "1/4 CTB", cct: 5200, color: "#e8eef5" },
  { label: "1/2 CTB", cct: 6500, color: "#c4d6ea" },
  { label: "Full CTB", cct: 8000, color: "#8db4d9" },
];

/** Map CCT (Kelvin) to an approximate RGB color for glow effects. */
function cctToColor(cct: number): string {
  // Simplified Kelvin to RGB approximation
  const t = cct / 100;
  let r: number, g: number, b: number;

  if (t <= 66) {
    r = 255;
    g = Math.min(255, Math.max(0, 99.47 * Math.log(t) - 161.12));
    b = t <= 19 ? 0 : Math.min(255, Math.max(0, 138.52 * Math.log(t - 10) - 305.04));
  } else {
    r = Math.min(255, Math.max(0, 329.7 * Math.pow(t - 60, -0.133)));
    g = Math.min(255, Math.max(0, 288.12 * Math.pow(t - 60, -0.0755)));
    b = 255;
  }

  return `${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}`;
}

export default function LightCard({
  light,
  isSelected,
  dmxStatus,
  onSelect,
  onUpdate,
  onDmx,
  onEdit,
  onDelete,
  onEffect,
}: LightCardProps) {
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

  // Local state for slider values during drag — prevents snap-back
  const [dragging, setDragging] = useState<Record<string, number | null>>({});
  const sliderVal = (key: string, propVal: number) => dragging[key] ?? propVal;

  const startDrag = (key: string, val: number) => setDragging((d) => ({ ...d, [key]: val }));
  const endDrag = (key: string) => setDragging((d) => ({ ...d, [key]: null }));

  // Compute the card's glow color based on current light output
  const glowColor = useMemo(() => {
    if (!light.on) return null;
    if (hasRgb && (light.colorMode === "rgb" || light.colorMode === "hsi")) {
      return `${light.red}, ${light.green}, ${light.blue}`;
    }
    return cctToColor(light.cct);
  }, [light.on, light.cct, light.red, light.green, light.blue, light.colorMode, hasRgb]);

  const glowOpacity = light.on ? Math.max(0.08, (light.intensity / 100) * 0.35) : 0;

  // CCT gradient
  const cctGradient =
    cctMin >= 3000
      ? "linear-gradient(to right, #ff9329, #fff5e6, #a8c4e0)"
      : "linear-gradient(to right, #ff6b00, #ff9329, #fff5e6, #a8c4e0, #8db4d9)";

  // Intensity gradient (dark to amber, filled to current value)
  const intensityVal = sliderVal("intensity", light.intensity);
  const intensityGradient = `linear-gradient(to right, #b45309 0%, #fbbf24 ${intensityVal}%, #374151 ${intensityVal}%, #374151 100%)`;

  // HSI state derived from current RGB (local during drag)
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

  // Color mode labels for RGB-capable lights
  const colorModes: { mode: ColorMode; label: string }[] = hasRgb
    ? [
        { mode: "cct", label: "CCT" },
        { mode: "hsi", label: "HSI" },
        { mode: "rgb", label: "RGB" },
      ]
    : [];

  return (
    <div
      className={`light-card-glow relative cursor-pointer overflow-hidden rounded-xl border p-4 transition-all ${
        isSelected ? "border-blue-500 ring-1 ring-blue-500/30" : "border-gray-700/80 hover:border-gray-600"
      } ${light.on ? "bg-gray-800/95" : "bg-gray-850 bg-gray-800/60"}`}
      style={{
        boxShadow: glowColor
          ? `inset 0 1px 0 0 rgba(${glowColor}, ${glowOpacity}), 0 0 20px -4px rgba(${glowColor}, ${glowOpacity * 0.6})`
          : undefined,
      }}
      onClick={onSelect}
    >
      {/* Top color bar — reflects light output */}
      {light.on && glowColor && (
        <div
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{
            background: `linear-gradient(90deg, transparent 0%, rgba(${glowColor}, ${glowOpacity * 2}) 30%, rgba(${glowColor}, ${glowOpacity * 2.5}) 50%, rgba(${glowColor}, ${glowOpacity * 2}) 70%, transparent 100%)`,
          }}
        />
      )}

      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              dmxStatus.enabled && dmxStatus.reachable ? "bg-green-400" : "bg-red-500"
            }`}
            title={!dmxStatus.enabled ? "DMX disabled" : dmxStatus.reachable ? "Connected" : "Bridge unreachable"}
          />
          <span className="text-[13px] font-semibold text-white">{light.name}</span>
          <span className="rounded-md bg-gray-700/60 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
            {TYPE_LABELS[light.type] ?? light.type}
          </span>
          {dmxStatus.enabled && !dmxStatus.reachable && (
            <span className="rounded bg-red-900/50 px-1.5 py-0.5 text-[10px] text-red-400">No Signal</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-700 hover:text-gray-300"
            title="Edit light"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z" />
              <path d="M8 5.5v5M5.5 8h5" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-700 hover:text-red-400"
            title="Delete light"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
            </svg>
          </button>
          {/* Power toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdate({ on: !light.on });
            }}
            className={`relative ml-1 h-6 w-11 rounded-full transition-colors ${light.on ? "bg-blue-600" : "bg-gray-600"}`}
            title={light.on ? "Turn off" : "Turn on"}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                light.on ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Intensity slider */}
      <div className="mb-3">
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-[11px] font-medium text-gray-400">Intensity</label>
          <span className="font-mono text-[11px] tabular-nums text-gray-300">{intensityVal}%</span>
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
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Color mode toggle for RGB-capable lights */}
      {hasRgb && (
        <div className="mb-3 flex items-center gap-1">
          {colorModes.map(({ mode, label }) => (
            <button
              key={mode}
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({ colorMode: mode });
              }}
              className={`rounded-md px-2.5 py-1 text-[10px] font-semibold tracking-wide transition-colors ${
                light.colorMode === mode
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                  : "bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
          {(light.colorMode === "rgb" || light.colorMode === "hsi") && (
            <div
              className="ml-auto h-5 w-5 rounded-full border-2 border-white/20 shadow-sm"
              style={{ backgroundColor: `rgb(${light.red}, ${light.green}, ${light.blue})` }}
              title={`R:${light.red} G:${light.green} B:${light.blue}`}
            />
          )}
        </div>
      )}

      {/* CCT slider — shown in CCT mode or for non-RGB lights */}
      {(!hasRgb || light.colorMode === "cct") && (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[11px] font-medium text-gray-400">CCT</label>
            <span className="font-mono text-[11px] tabular-nums text-gray-300">{sliderVal("cct", light.cct)}K</span>
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
            onClick={(e) => e.stopPropagation()}
          />
          <div className="mt-0.5 flex justify-between text-[9px] text-gray-500">
            <span>{cctMin}K</span>
            <span>{cctMax}K</span>
          </div>

          {/* CCT quick presets */}
          <div className="mt-2 flex flex-wrap gap-1">
            {CCT_PRESETS.filter((p) => p.cct >= cctMin && p.cct <= cctMax).map((preset) => (
              <button
                key={preset.label}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate({ cct: preset.cct });
                }}
                className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] transition-colors ${
                  light.cct === preset.cct
                    ? "bg-gray-600 text-white"
                    : "bg-gray-700/40 text-gray-500 hover:bg-gray-700 hover:text-gray-300"
                }`}
                title={`${preset.cct}K`}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: preset.color }} />
                {preset.label}
              </button>
            ))}
          </div>

          {/* Gel presets (CTO/CTB) */}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {GEL_PRESETS.filter((g) => g.cct >= cctMin && g.cct <= cctMax).map((gel) => (
              <button
                key={gel.label}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate({ cct: gel.cct });
                }}
                className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] transition-colors ${
                  light.cct === gel.cct
                    ? "border-gray-500 bg-gray-600 text-white"
                    : "border-gray-700/50 bg-transparent text-gray-500 hover:border-gray-600 hover:text-gray-300"
                }`}
                title={`${gel.cct}K`}
              >
                <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: gel.color }} />
                {gel.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ±Green/Magenta tint — Infinimat Profile 2 Ch3 */}
      {hasGm && (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[11px] font-medium text-gray-400">G/M Tint</label>
            <div className="flex items-center gap-2">
              {light.gmTint !== null && (
                <span className="font-mono text-[11px] tabular-nums text-gray-300">
                  {(() => {
                    const v = sliderVal("gmTint", light.gmTint);
                    return v > 0 ? `+${v}` : v;
                  })()}
                  %
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate({ gmTint: light.gmTint === null ? 0 : null });
                }}
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                  light.gmTint === null ? "bg-gray-700/50 text-gray-400" : "bg-blue-600/30 text-blue-400"
                }`}
                title={light.gmTint === null ? "Enable G/M tint control" : "Set to No Effect (fixture internal)"}
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
                onClick={(e) => e.stopPropagation()}
              />
              <div className="mt-0.5 flex justify-between text-[9px] text-gray-500">
                <span>−G</span>
                <span>0</span>
                <span>+G</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* HSI color wheel — shown for RGB-capable lights in HSI mode */}
      {hasRgb && light.colorMode === "hsi" && (
        <div className="mt-3 flex justify-center" onClick={(e) => e.stopPropagation()}>
          <HueWheel
            hue={localHue ?? hsiHue}
            saturation={localSat ?? hsiSat}
            onChange={handleHsiChange}
            onChangeEnd={handleHsiChangeEnd}
            disabled={!light.on}
          />
        </div>
      )}

      {/* RGB sliders — shown only for RGB-capable lights in RGB mode */}
      {hasRgb && light.colorMode === "rgb" && (
        <div className="mt-1 space-y-2">
          {(["red", "green", "blue"] as const).map((channel) => {
            const colorMap = { red: "#ef4444", green: "#22c55e", blue: "#3b82f6" };
            const labelMap = { red: "R", green: "G", blue: "B" };
            const val = sliderVal(channel, light[channel]);
            return (
              <div key={channel}>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-[11px] font-medium" style={{ color: colorMap[channel] }}>
                    {labelMap[channel]}
                  </label>
                  <span className="font-mono text-[11px] tabular-nums text-gray-300">{val}</span>
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
                    background: `linear-gradient(to right, #1a1a1a 0%, ${colorMap[channel]} ${(val / 255) * 100}%, #374151 ${(val / 255) * 100}%, #374151 100%)`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Effects */}
      <div className="mt-3 border-t border-gray-700/40 pt-2.5">
        <div className="flex items-center gap-1">
          <span className="mr-1 text-[10px] font-medium text-gray-500">FX</span>
          {EFFECTS.map((fx) => {
            const isActive = light.effect?.type === fx.type;
            return (
              <button
                key={fx.type}
                onClick={(e) => {
                  e.stopPropagation();
                  onEffect(isActive ? null : { type: fx.type, speed: light.effect?.speed ?? 5 });
                }}
                className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  isActive
                    ? "bg-amber-600/30 text-amber-400 shadow-sm shadow-amber-600/20"
                    : "bg-gray-700/40 text-gray-500 hover:bg-gray-700 hover:text-gray-300"
                }`}
                title={isActive ? `Stop ${fx.label}` : fx.label}
              >
                {fx.label}
              </button>
            );
          })}
        </div>
        {light.effect && (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-[10px] text-gray-500">Speed</span>
            <input
              type="range"
              min="1"
              max="10"
              value={light.effect.speed}
              onChange={(e) => {
                e.stopPropagation();
                onEffect({ type: light.effect!.type, speed: Number(e.target.value) });
              }}
              className="light-slider flex-1"
              style={{
                background: `linear-gradient(to right, #d97706 0%, #f59e0b ${((light.effect.speed - 1) / 9) * 100}%, #374151 ${((light.effect.speed - 1) / 9) * 100}%, #374151 100%)`,
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="w-4 text-right font-mono text-[10px] tabular-nums text-gray-400">
              {light.effect.speed}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
