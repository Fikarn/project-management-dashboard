"use client";

import { useMemo } from "react";
import { Settings2, X } from "lucide-react";
import type { Light, LightValues, DmxStatus, LightEffect } from "@/lib/types";
import { TYPE_LABELS, cctToColor } from "@/lib/light-constants";
import { useLightControls } from "./hooks/useLightControls";
import LightControls from "./LightControls";

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
  const controls = useLightControls(light, onUpdate, onDmx);

  const glowColor = useMemo(() => {
    if (!light.on) return null;
    if (controls.hasRgb && (light.colorMode === "rgb" || light.colorMode === "hsi")) {
      return `${light.red}, ${light.green}, ${light.blue}`;
    }
    return cctToColor(light.cct);
  }, [light.on, light.cct, light.red, light.green, light.blue, light.colorMode, controls.hasRgb]);

  const glowOpacity = light.on ? Math.max(0.08, (light.intensity / 100) * 0.35) : 0;

  return (
    <div
      className={`light-card-glow relative cursor-pointer overflow-hidden rounded-card border p-3 transition-all ${
        isSelected ? "border-accent-cyan ring-1 ring-accent-cyan/20" : "border-studio-750 hover:border-studio-700"
      } ${light.on ? "bg-studio-850" : "bg-studio-900/80 opacity-75"}`}
      style={{
        boxShadow: glowColor
          ? `inset 0 1px 0 0 rgba(${glowColor}, ${glowOpacity}), 0 0 20px -4px rgba(${glowColor}, ${glowOpacity * 0.6})`
          : undefined,
      }}
      onClick={onSelect}
    >
      {/* Top color bar */}
      {light.on && glowColor && (
        <div
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{
            background: `linear-gradient(90deg, transparent 0%, rgba(${glowColor}, ${glowOpacity * 2}) 30%, rgba(${glowColor}, ${glowOpacity * 2.5}) 50%, rgba(${glowColor}, ${glowOpacity * 2}) 70%, transparent 100%)`,
          }}
        />
      )}

      {/* Header */}
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                dmxStatus.enabled && dmxStatus.reachable ? "bg-accent-green" : "bg-red-500"
              }`}
              title={!dmxStatus.enabled ? "DMX disabled" : dmxStatus.reachable ? "Connected" : "Bridge unreachable"}
            />
            <span className="truncate text-xs font-semibold text-studio-100">{light.name}</span>
            <span className="rounded-badge bg-studio-750/60 px-1.5 py-0.5 text-xxs font-medium text-studio-500">
              {TYPE_LABELS[light.type] ?? light.type}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xxs text-studio-500">
            <span>DMX {light.dmxStartAddress}</span>
            <span className="text-studio-700">•</span>
            <span>{light.colorMode.toUpperCase()}</span>
            <span className="text-studio-700">•</span>
            <span>{light.on ? `${light.intensity}%` : "Standby"}</span>
            {dmxStatus.enabled && !dmxStatus.reachable && (
              <>
                <span className="text-studio-700">•</span>
                <span className="rounded-badge bg-red-900/50 px-1.5 py-0.5 text-red-400">No Signal</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            aria-label={`Edit ${light.name}`}
            className="rounded-badge p-1 text-studio-500 transition-colors hover:bg-studio-750 hover:text-studio-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50"
          >
            <Settings2 size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label={`Delete ${light.name}`}
            className="rounded-badge p-1 text-studio-500 transition-colors hover:bg-studio-750 hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50"
          >
            <X size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={light.on}
            aria-label={`${light.name} power`}
            onClick={(e) => {
              e.stopPropagation();
              onUpdate({ on: !light.on });
            }}
            className={`relative ml-1 h-6 w-10 rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 ${
              light.on ? "bg-accent-blue" : "bg-studio-600"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200 ${
                light.on ? "left-[18px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      <LightControls light={light} controls={controls} onUpdate={onUpdate} onEffect={onEffect} />
    </div>
  );
}
