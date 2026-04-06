"use client";

import type { Light, LightValues, LightEffect } from "@/lib/types";
import { CCT_PRESETS, GEL_PRESETS, EFFECTS } from "@/lib/light-constants";
import HueWheel from "./HueWheel";
import type { useLightControls } from "./hooks/useLightControls";

interface LightControlsProps {
  light: Light;
  controls: ReturnType<typeof useLightControls>;
  onUpdate: (values: LightValues) => void;
  onEffect: (effect: LightEffect | null) => void;
}

const stop = (e: React.MouseEvent) => e.stopPropagation();

export default function LightControls({ light, controls, onUpdate, onEffect }: LightControlsProps) {
  const {
    throttledDmx,
    sliderVal,
    startDrag,
    endDrag,
    cctMin,
    cctMax,
    hasRgb,
    hasGm,
    intensityVal,
    intensityGradient,
    cctGradient,
    hsiHue,
    hsiSat,
    localHue,
    localSat,
    handleHsiChange,
    handleHsiChangeEnd,
    colorModes,
  } = controls;

  return (
    <>
      {/* Intensity slider */}
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
          onClick={stop}
        />
      </div>

      {/* Color mode toggle */}
      {hasRgb && (
        <div className="mb-3 flex items-center gap-1">
          {colorModes.map(({ mode, label }) => (
            <button
              key={mode}
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({ colorMode: mode });
              }}
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

      {/* CCT slider + presets */}
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
            onClick={stop}
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
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate({ cct: preset.cct });
                }}
                className={`flex items-center gap-1 rounded-badge px-1.5 py-0.5 text-micro transition-colors ${
                  light.cct === preset.cct
                    ? "bg-studio-600 text-studio-100"
                    : "bg-studio-750/40 text-studio-500 hover:bg-studio-750 hover:text-studio-300"
                }`}
                title={`${preset.cct}K`}
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
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate({ cct: gel.cct });
                }}
                className={`flex items-center gap-1 rounded-badge border px-1.5 py-0.5 text-micro transition-colors ${
                  light.cct === gel.cct
                    ? "border-studio-500 bg-studio-600 text-studio-100"
                    : "border-studio-750/50 bg-transparent text-studio-500 hover:border-studio-600 hover:text-studio-300"
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
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate({ gmTint: light.gmTint === null ? 0 : null });
                }}
                className={`rounded-badge px-1.5 py-0.5 text-micro font-semibold transition-colors ${
                  light.gmTint === null ? "bg-studio-750/50 text-studio-400" : "bg-accent-cyan/15 text-accent-cyan"
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
                onClick={stop}
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
        <div className="mb-3 flex justify-center" onClick={stop}>
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
                  onClick={stop}
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
                onClick={(e) => {
                  e.stopPropagation();
                  onEffect(isActive ? null : { type: fx.type, speed: light.effect?.speed ?? 5 });
                }}
                className={`rounded-badge px-2 py-0.5 text-micro font-medium transition-colors ${
                  isActive
                    ? "border border-amber-500/20 bg-amber-500/15 text-amber-400"
                    : "bg-studio-750/40 text-studio-500 hover:bg-studio-750 hover:text-studio-300"
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
            <span className="text-micro text-studio-500">Speed</span>
            <input
              type="range"
              min="1"
              max="10"
              value={light.effect.speed}
              onChange={(e) => onEffect({ type: light.effect!.type, speed: Number(e.target.value) })}
              className="light-slider flex-1"
              style={{
                background: `linear-gradient(to right, #d97706 0%, #f59e0b ${((light.effect.speed - 1) / 9) * 100}%, #242430 ${((light.effect.speed - 1) / 9) * 100}%, #242430 100%)`,
              }}
              onClick={stop}
            />
            <span className="w-4 text-right font-mono text-micro tabular-nums text-studio-400">
              {light.effect.speed}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
