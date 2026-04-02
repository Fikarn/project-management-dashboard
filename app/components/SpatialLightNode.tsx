"use client";

import { useRef, useState, useCallback } from "react";
import type { Light } from "@/lib/types";
import { supportsRgb } from "@/lib/light-types";

interface DmxStatus {
  connected: boolean;
  reachable: boolean;
  enabled: boolean;
}

interface SpatialLightNodeProps {
  light: Light;
  isSelected: boolean;
  dmxStatus: DmxStatus;
  containerRect: DOMRect | null;
  onSelect: () => void;
  onPositionChange: (x: number, y: number) => void;
}

/** Map CCT (Kelvin) to an approximate RGB color string. */
function cctToColor(cct: number): string {
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

const TYPE_LABELS: Record<string, string> = {
  "astra-bicolor": "A",
  infinimat: "I",
  "infinibar-pb12": "B",
};

const DRAG_THRESHOLD = 5;

export default function SpatialLightNode({
  light,
  isSelected,
  dmxStatus,
  containerRect,
  onSelect,
  onPositionChange,
}: SpatialLightNodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const isDraggingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);

  const posX = dragPos?.x ?? light.spatialX ?? 0.5;
  const posY = dragPos?.y ?? light.spatialY ?? 0.5;

  const hasRgb = supportsRgb(light.type);
  const isRgbMode = hasRgb && (light.colorMode === "rgb" || light.colorMode === "hsi");

  // Compute the node's color
  const colorRgb = light.on
    ? isRgbMode
      ? `${light.red}, ${light.green}, ${light.blue}`
      : cctToColor(light.cct)
    : "100, 100, 110";

  const glowOpacity = light.on ? Math.max(0.15, (light.intensity / 100) * 0.6) : 0;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!containerRect || !nodeRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      pointerIdRef.current = e.pointerId;
      nodeRef.current.setPointerCapture(e.pointerId);
      dragStartRef.current = { px: e.clientX, py: e.clientY, ox: posX, oy: posY };
      isDraggingRef.current = false;
    },
    [containerRect, posX, posY]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStartRef.current || !containerRect) return;
      const dx = e.clientX - dragStartRef.current.px;
      const dy = e.clientY - dragStartRef.current.py;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (!isDraggingRef.current && dist < DRAG_THRESHOLD) return;
      isDraggingRef.current = true;

      const newX = Math.max(0, Math.min(1, dragStartRef.current.ox + dx / containerRect.width));
      const newY = Math.max(0, Math.min(1, dragStartRef.current.oy + dy / containerRect.height));
      setDragPos({ x: newX, y: newY });
    },
    [containerRect]
  );

  const handlePointerUp = useCallback(() => {
    if (nodeRef.current && pointerIdRef.current !== null) {
      nodeRef.current.releasePointerCapture(pointerIdRef.current);
    }
    pointerIdRef.current = null;
    if (isDraggingRef.current && dragPos) {
      onPositionChange(dragPos.x, dragPos.y);
    } else {
      onSelect();
    }
    dragStartRef.current = null;
    isDraggingRef.current = false;
    setDragPos(null);
  }, [dragPos, onPositionChange, onSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = 0.02;
      let newX = light.spatialX ?? 0.5;
      let newY = light.spatialY ?? 0.5;
      switch (e.key) {
        case "ArrowLeft":
          newX = Math.max(0, newX - step);
          break;
        case "ArrowRight":
          newX = Math.min(1, newX + step);
          break;
        case "ArrowUp":
          newY = Math.max(0, newY - step);
          break;
        case "ArrowDown":
          newY = Math.min(1, newY + step);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          onSelect();
          return;
        default:
          return;
      }
      e.preventDefault();
      onPositionChange(newX, newY);
    },
    [light.spatialX, light.spatialY, onSelect, onPositionChange]
  );

  const dmxOk = dmxStatus.enabled && dmxStatus.reachable;

  return (
    <div
      ref={nodeRef}
      className="group absolute touch-none"
      style={{
        left: `${posX * 100}%`,
        top: `${posY * 100}%`,
        transform: `translate(-50%, -50%)${isDraggingRef.current && dragPos ? " scale(1.1)" : ""}`,
        zIndex: isSelected || (isDraggingRef.current && dragPos) ? 20 : 10,
        cursor: isDraggingRef.current && dragPos ? "grabbing" : "grab",
        transition: dragPos ? "none" : "left 0.15s ease, top 0.15s ease",
      }}
      role="button"
      tabIndex={0}
      aria-label={`${light.name} — ${light.on ? `${light.intensity}%` : "Off"}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={handleKeyDown}
    >
      {/* Node */}
      <div
        className={`relative flex h-12 w-12 select-none items-center justify-center rounded-lg border-2 transition-colors ${
          isSelected
            ? "border-accent-cyan shadow-[0_0_0_2px_rgba(34,211,238,0.2)]"
            : "border-studio-600 hover:border-studio-400"
        } ${!light.on ? "opacity-60" : ""}`}
        style={{
          backgroundColor: `rgba(${colorRgb}, ${light.on ? 0.3 + (light.intensity / 100) * 0.4 : 0.15})`,
          boxShadow: light.on
            ? `0 0 ${12 + (light.intensity / 100) * 20}px rgba(${colorRgb}, ${glowOpacity}), inset 0 0 8px rgba(${colorRgb}, 0.1)`
            : "none",
        }}
      >
        {/* Type indicator */}
        <span className="text-xs font-bold text-white/70">{TYPE_LABELS[light.type] ?? "?"}</span>

        {/* DMX status dot */}
        <span
          className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-studio-900 ${
            dmxOk ? "bg-accent-green" : dmxStatus.enabled ? "bg-accent-red" : "bg-studio-600"
          }`}
        />

        {/* Power indicator */}
        {!light.on && <span className="absolute bottom-0.5 text-micro font-medium text-studio-400">OFF</span>}
      </div>

      {/* Label */}
      <div className="mt-1 max-w-16 text-center">
        <span className="block truncate text-[10px] font-medium leading-tight text-studio-300">{light.name}</span>
        {light.on && <span className="text-[9px] tabular-nums text-studio-500">{light.intensity}%</span>}
      </div>
    </div>
  );
}
