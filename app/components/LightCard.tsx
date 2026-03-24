"use client";

import { useRef, useCallback, useState } from "react";
import type { Light, ColorMode } from "@/lib/types";
import { getCctRange, supportsRgb, supportsGm } from "@/lib/light-types";

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
}

const TYPE_LABELS: Record<string, string> = {
  "astra-bicolor": "Astra",
  infinimat: "Infinimat",
  "infinibar-pb12": "Infinibar",
};

export default function LightCard({
  light,
  isSelected,
  dmxStatus,
  onSelect,
  onUpdate,
  onDmx,
  onEdit,
  onDelete,
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

  // Generate CCT gradient based on the light's actual range
  const cctGradient =
    cctMin >= 3000
      ? "linear-gradient(to right, #ff9329, #fff5e6, #a8c4e0)"
      : "linear-gradient(to right, #ff6b00, #ff9329, #fff5e6, #a8c4e0, #8db4d9)";

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
          <div
            className={`h-2 w-2 rounded-full ${
              dmxStatus.enabled && dmxStatus.reachable ? "bg-green-400" : "bg-red-500"
            }`}
            title={!dmxStatus.enabled ? "DMX disabled" : dmxStatus.reachable ? "Connected" : "Bridge unreachable"}
          />
          <span className="text-sm font-medium text-white">{light.name}</span>
          <span className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-400">
            {TYPE_LABELS[light.type] ?? light.type}
          </span>
          {dmxStatus.enabled && !dmxStatus.reachable && (
            <span className="rounded bg-red-900/50 px-1.5 py-0.5 text-[10px] text-red-400">No Signal</span>
          )}
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
              onDelete();
            }}
            className="text-xs text-gray-500 hover:text-red-400"
            title="Delete light"
          >
            &#x2715;
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
          <span className="font-mono text-[11px] text-gray-300">{sliderVal("intensity", light.intensity)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={sliderVal("intensity", light.intensity)}
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
          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-700 accent-yellow-400"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Color mode toggle for RGB-capable lights */}
      {hasRgb && (
        <div className="mb-3 flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdate({ colorMode: "cct" });
            }}
            className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
              light.colorMode === "cct" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-400 hover:text-gray-200"
            }`}
          >
            CCT
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdate({ colorMode: "rgb" });
            }}
            className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
              light.colorMode === "rgb" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-400 hover:text-gray-200"
            }`}
          >
            RGB
          </button>
          {light.colorMode === "rgb" && (
            <div
              className="ml-auto h-4 w-4 rounded border border-gray-600"
              style={{ backgroundColor: `rgb(${light.red}, ${light.green}, ${light.blue})` }}
              title={`R:${light.red} G:${light.green} B:${light.blue}`}
            />
          )}
        </div>
      )}

      {/* CCT slider — shown in CCT mode or for non-RGB lights */}
      {(!hasRgb || light.colorMode === "cct") && (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-[11px] text-gray-400">CCT</label>
            <span className="font-mono text-[11px] text-gray-300">{sliderVal("cct", light.cct)}K</span>
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
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg"
            style={{ background: cctGradient }}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="mt-0.5 flex justify-between text-[9px] text-gray-500">
            <span>{cctMin}K</span>
            <span>{cctMax}K</span>
          </div>
        </div>
      )}

      {/* ±Green/Magenta tint — Infinimat Profile 2 Ch3 */}
      {hasGm && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-[11px] text-gray-400">G/M Tint</label>
            <div className="flex items-center gap-2">
              {light.gmTint !== null && (
                <span className="font-mono text-[11px] text-gray-300">
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
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                  light.gmTint === null ? "bg-gray-700 text-gray-400" : "bg-blue-600/30 text-blue-400"
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
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg"
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

      {/* RGB sliders — shown only for RGB-capable lights in RGB mode */}
      {hasRgb && light.colorMode === "rgb" && (
        <div className="space-y-2">
          {/* Red */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[11px] text-red-400">Red</label>
              <span className="font-mono text-[11px] text-gray-300">{sliderVal("red", light.red)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="255"
              value={sliderVal("red", light.red)}
              onChange={(e) => {
                const v = Number(e.target.value);
                startDrag("red", v);
                throttledDmx({ red: v });
              }}
              onMouseUp={(e) => {
                const v = Number((e.target as HTMLInputElement).value);
                endDrag("red");
                onUpdate({ red: v });
              }}
              onTouchEnd={(e) => {
                const v = Number((e.target as HTMLInputElement).value);
                endDrag("red");
                onUpdate({ red: v });
              }}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg"
              style={{ background: "linear-gradient(to right, #1a1a1a, #ff0000)" }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {/* Green */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[11px] text-green-400">Green</label>
              <span className="font-mono text-[11px] text-gray-300">{sliderVal("green", light.green)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="255"
              value={sliderVal("green", light.green)}
              onChange={(e) => {
                const v = Number(e.target.value);
                startDrag("green", v);
                throttledDmx({ green: v });
              }}
              onMouseUp={(e) => {
                const v = Number((e.target as HTMLInputElement).value);
                endDrag("green");
                onUpdate({ green: v });
              }}
              onTouchEnd={(e) => {
                const v = Number((e.target as HTMLInputElement).value);
                endDrag("green");
                onUpdate({ green: v });
              }}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg"
              style={{ background: "linear-gradient(to right, #1a1a1a, #00ff00)" }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {/* Blue */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[11px] text-blue-400">Blue</label>
              <span className="font-mono text-[11px] text-gray-300">{sliderVal("blue", light.blue)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="255"
              value={sliderVal("blue", light.blue)}
              onChange={(e) => {
                const v = Number(e.target.value);
                startDrag("blue", v);
                throttledDmx({ blue: v });
              }}
              onMouseUp={(e) => {
                const v = Number((e.target as HTMLInputElement).value);
                endDrag("blue");
                onUpdate({ blue: v });
              }}
              onTouchEnd={(e) => {
                const v = Number((e.target as HTMLInputElement).value);
                endDrag("blue");
                onUpdate({ blue: v });
              }}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg"
              style={{ background: "linear-gradient(to right, #1a1a1a, #0000ff)" }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
