"use client";

import { Settings2, X, ChevronLeft } from "lucide-react";
import type { Light, LightValues, LightEffect } from "@/lib/types";
import { TYPE_LABELS } from "@/lib/light-constants";
import { useLightControls } from "../hooks/useLightControls";
import LightControls from "../LightControls";

interface SpatialLightPanelProps {
  light: Light;
  onUpdate: (values: LightValues) => void;
  onDmx: (values: LightValues) => void;
  onEdit: () => void;
  onDelete: () => void;
  onEffect: (effect: LightEffect | null) => void;
  onDeselect: () => void;
}

export default function SpatialLightPanel({
  light,
  onUpdate,
  onDmx,
  onEdit,
  onDelete,
  onEffect,
  onDeselect,
}: SpatialLightPanelProps) {
  const controls = useLightControls(light, onUpdate, onDmx);

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

      <LightControls light={light} controls={controls} onUpdate={onUpdate} onEffect={onEffect} />
    </div>
  );
}
