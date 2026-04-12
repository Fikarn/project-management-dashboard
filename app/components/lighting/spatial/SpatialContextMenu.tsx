"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Light } from "@/lib/types";

interface SpatialContextMenuProps {
  light: Light;
  x: number;
  y: number;
  onClose: () => void;
  onUpdate: (lightId: string, values: Record<string, unknown>) => void;
  onAllOff: (exceptId: string) => void;
}

const INTENSITY_PRESETS = [
  { label: "25%", value: 25 },
  { label: "50%", value: 50 },
  { label: "75%", value: 75 },
  { label: "100%", value: 100 },
];

const CCT_PRESETS = [
  { label: "Tungsten", value: 3200, color: "#ff9329" },
  { label: "Daylight", value: 5600, color: "#fff5e6" },
];

export default function SpatialContextMenu({ light, x, y, onClose, onUpdate, onAllOff }: SpatialContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("pointerdown", handleClickOutside);
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [handleClickOutside, onClose]);

  // Ensure the menu stays within viewport
  const style: React.CSSProperties = {
    position: "fixed",
    left: x,
    top: y,
    zIndex: 50,
  };

  const menuItem =
    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-studio-200 transition-colors hover:bg-studio-700/60 hover:text-studio-50";

  return (
    <div
      ref={menuRef}
      className="min-w-[160px] animate-fade-in overflow-hidden rounded-card border border-studio-700 bg-studio-850 py-1 shadow-xl"
      style={style}
    >
      {/* Power toggle */}
      <button
        className={menuItem}
        onClick={() => {
          onUpdate(light.id, { on: !light.on });
          onClose();
        }}
      >
        <span className={`h-2 w-2 rounded-full ${light.on ? "bg-accent-green" : "bg-studio-600"}`} />
        {light.on ? "Turn Off" : "Turn On"}
      </button>

      <div className="mx-2 my-1 border-t border-studio-750/50" />

      {/* Intensity presets */}
      <div className="px-3 py-1 text-xxs font-medium uppercase tracking-wider text-studio-500">Intensity</div>
      {INTENSITY_PRESETS.map((preset) => (
        <button
          key={preset.value}
          className={`${menuItem} ${light.intensity === preset.value ? "text-accent-cyan" : ""}`}
          onClick={() => {
            onUpdate(light.id, { intensity: preset.value, on: true });
            onClose();
          }}
        >
          {preset.label}
        </button>
      ))}

      <div className="mx-2 my-1 border-t border-studio-750/50" />

      {/* CCT presets */}
      <div className="px-3 py-1 text-xxs font-medium uppercase tracking-wider text-studio-500">CCT</div>
      {CCT_PRESETS.map((preset) => (
        <button
          key={preset.value}
          className={`${menuItem} ${light.cct === preset.value ? "text-accent-cyan" : ""}`}
          onClick={() => {
            onUpdate(light.id, { cct: preset.value });
            onClose();
          }}
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: preset.color }} />
          {preset.label}
        </button>
      ))}

      <div className="mx-2 my-1 border-t border-studio-750/50" />

      {/* Solo */}
      <button
        className={menuItem}
        onClick={() => {
          onAllOff(light.id);
          onClose();
        }}
      >
        Solo
      </button>
    </div>
  );
}
