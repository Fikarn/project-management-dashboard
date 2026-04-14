"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
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
    (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("pointerdown", handleClickOutside);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [handleClickOutside, onClose]);

  const position = useMemo(() => {
    const padding = 12;
    const estimatedWidth = 240;
    const estimatedHeight = 320;

    if (typeof window === "undefined") {
      return { x, y };
    }

    return {
      x: Math.max(padding, Math.min(x, window.innerWidth - estimatedWidth - padding)),
      y: Math.max(padding, Math.min(y, window.innerHeight - estimatedHeight - padding)),
    };
  }, [x, y]);

  const menuItem =
    "flex w-full items-center gap-2 rounded-badge px-2.5 py-1.5 text-left text-xs text-studio-200 transition-colors hover:bg-studio-700/70 hover:text-studio-50";

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Quick actions for ${light.name}`}
      data-testid="spatial-context-menu"
      className="bg-studio-900/98 min-w-[15rem] animate-fade-in overflow-hidden rounded-card border border-studio-700 shadow-modal backdrop-blur"
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: 50,
        maxHeight: "calc(100vh - 24px)",
        overflowY: "auto",
      }}
    >
      <div className="border-b border-studio-750/60 px-3 py-2.5">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-studio-500">Quick Actions</div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-studio-50">{light.name}</div>
            <div className="mt-0.5 text-xxs text-studio-500">DMX {light.dmxStartAddress}</div>
          </div>
          <span className="rounded-pill border border-studio-700 bg-studio-850 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-studio-300">
            {light.on ? `${light.intensity}%` : "Off"}
          </span>
        </div>
      </div>

      <div className="p-2">
        <button
          type="button"
          role="menuitem"
          className={menuItem}
          onClick={() => {
            onUpdate(light.id, { on: !light.on });
            onClose();
          }}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${light.on ? "bg-accent-green" : "bg-studio-600"}`} />
          {light.on ? "Turn Off" : "Turn On"}
        </button>

        <div className="mx-1 my-2 border-t border-studio-750/50" />

        <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-studio-500">Intensity</div>
        <div className="grid grid-cols-2 gap-1 px-1">
          {INTENSITY_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              role="menuitem"
              className={`rounded-badge px-2.5 py-1.5 text-left text-xs transition-colors ${
                light.intensity === preset.value
                  ? "bg-accent-cyan/12 text-accent-cyan"
                  : "bg-studio-850 text-studio-300 hover:bg-studio-700/70 hover:text-studio-50"
              }`}
              onClick={() => {
                onUpdate(light.id, { intensity: preset.value, on: true });
                onClose();
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="mx-1 my-2 border-t border-studio-750/50" />

        <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-studio-500">CCT</div>
        <div className="grid gap-1 px-1">
          {CCT_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              role="menuitem"
              className={`flex items-center gap-2 rounded-badge px-2.5 py-1.5 text-left text-xs transition-colors ${
                light.cct === preset.value
                  ? "bg-accent-cyan/12 text-accent-cyan"
                  : "bg-studio-850 text-studio-300 hover:bg-studio-700/70 hover:text-studio-50"
              }`}
              onClick={() => {
                onUpdate(light.id, { cct: preset.value });
                onClose();
              }}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: preset.color }} />
              {preset.label}
            </button>
          ))}
        </div>

        <div className="mx-1 my-2 border-t border-studio-750/50" />

        <button
          type="button"
          role="menuitem"
          className={`${menuItem} text-accent-amber hover:text-accent-amber`}
          onClick={() => {
            onAllOff(light.id);
            onClose();
          }}
        >
          Solo
        </button>
      </div>
    </div>,
    document.body
  );
}
