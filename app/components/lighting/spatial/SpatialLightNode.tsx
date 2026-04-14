"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { DmxStatus, Light } from "@/lib/types";
import { cctToColor } from "@/lib/light-constants";
import { getBeamAngle, getSpatialShape, supportsRgb } from "@/lib/light-types";

interface SpatialLightNodeProps {
  light: Light;
  position: { x: number; y: number };
  zoom: number;
  snapToGrid: boolean;
  isSuggestedPosition: boolean;
  isSelected: boolean;
  dmxStatus: DmxStatus;
  containerRect: DOMRect | null;
  onSelect: () => void;
  onSelectWithModifier: (additive: boolean) => void;
  onPositionChange: (x: number, y: number) => void;
  onIntensityPreview: (intensity: number) => void;
  onIntensityCommit: (intensity: number) => void;
  onRotationChange: (rotation: number) => void;
  onContextMenu: (x: number, y: number) => void;
}

const TYPE_LABELS: Record<string, string> = {
  "astra-bicolor": "AST",
  infinimat: "MAT",
  "infinibar-pb12": "BAR",
};

const DRAG_THRESHOLD = 5;
const GRID_STEP = 0.025;

function snapValue(value: number, enabled: boolean): number {
  if (!enabled) return Math.min(Math.max(value, 0), 1);
  return Math.min(Math.max(Math.round(value / GRID_STEP) * GRID_STEP, 0), 1);
}

export default function SpatialLightNode({
  light,
  position,
  zoom,
  snapToGrid,
  isSuggestedPosition,
  isSelected,
  dmxStatus,
  containerRect,
  onSelect,
  onSelectWithModifier,
  onPositionChange,
  onIntensityPreview,
  onIntensityCommit,
  onRotationChange,
  onContextMenu: onContextMenuProp,
}: SpatialLightNodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [localRotation, setLocalRotation] = useState<number | null>(null);
  const [localIntensity, setLocalIntensity] = useState<number | null>(null);
  const [wheelTooltip, setWheelTooltip] = useState<number | null>(null);
  const dragStartRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const isDraggingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const shiftKeyRef = useRef(false);
  const isRotatingRef = useRef(false);
  const rotationStartRef = useRef<{ angle: number; startRotation: number } | null>(null);
  const wheelTooltipRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelCommitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelFallbackClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const posX = dragPos?.x ?? position.x;
  const posY = dragPos?.y ?? position.y;
  const rotation = localRotation ?? light.spatialRotation;
  const displayIntensity = localIntensity ?? light.intensity;

  const hasRgb = supportsRgb(light.type);
  const isRgbMode = hasRgb && (light.colorMode === "rgb" || light.colorMode === "hsi");
  const shape = getSpatialShape(light.type);
  const beamAngle = getBeamAngle(light.type);
  const halfAngle = beamAngle / 2;

  const colorRgb = light.on
    ? isRgbMode
      ? `${light.red}, ${light.green}, ${light.blue}`
      : cctToColor(light.cct)
    : "100, 100, 110";

  const glowOpacity = light.on ? Math.max(0.15, (displayIntensity / 100) * 0.6) : 0;
  const coneLength = 82 + (displayIntensity / 100) * 42;

  useEffect(() => {
    if (localIntensity !== null && light.intensity === localIntensity) {
      setLocalIntensity(null);
    }
  }, [light.intensity, localIntensity]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (!containerRect || !nodeRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      pointerIdRef.current = event.pointerId;
      shiftKeyRef.current = event.shiftKey;
      nodeRef.current.setPointerCapture(event.pointerId);

      if (event.altKey) {
        isRotatingRef.current = true;
        const rect = nodeRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const angle = Math.atan2(event.clientY - cy, event.clientX - cx) * (180 / Math.PI);
        rotationStartRef.current = { angle, startRotation: light.spatialRotation };
      } else {
        isRotatingRef.current = false;
        dragStartRef.current = { px: event.clientX, py: event.clientY, ox: posX, oy: posY };
      }
      isDraggingRef.current = false;
    },
    [containerRect, light.spatialRotation, posX, posY]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (isRotatingRef.current && rotationStartRef.current && nodeRef.current) {
        const rect = nodeRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const angle = Math.atan2(event.clientY - cy, event.clientX - cx) * (180 / Math.PI);
        const delta = angle - rotationStartRef.current.angle;
        const nextRotation = (((rotationStartRef.current.startRotation + delta) % 360) + 360) % 360;
        isDraggingRef.current = true;
        setLocalRotation(nextRotation);
        return;
      }

      if (!dragStartRef.current || !containerRect) return;
      const dx = event.clientX - dragStartRef.current.px;
      const dy = event.clientY - dragStartRef.current.py;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (!isDraggingRef.current && distance < DRAG_THRESHOLD) return;
      isDraggingRef.current = true;
      setDragPos({
        x: snapValue(dragStartRef.current.ox + dx / (containerRect.width * zoom), snapToGrid),
        y: snapValue(dragStartRef.current.oy + dy / (containerRect.height * zoom), snapToGrid),
      });
    },
    [containerRect, snapToGrid, zoom]
  );

  const handlePointerUp = useCallback(() => {
    if (nodeRef.current && pointerIdRef.current !== null) {
      nodeRef.current.releasePointerCapture(pointerIdRef.current);
    }
    pointerIdRef.current = null;

    if (isRotatingRef.current) {
      if (isDraggingRef.current && localRotation !== null) onRotationChange(Math.round(localRotation));
      isRotatingRef.current = false;
      rotationStartRef.current = null;
      isDraggingRef.current = false;
      setLocalRotation(null);
      return;
    }

    if (isDraggingRef.current && dragPos) {
      onPositionChange(dragPos.x, dragPos.y);
    } else {
      onSelectWithModifier(shiftKeyRef.current);
    }

    dragStartRef.current = null;
    isDraggingRef.current = false;
    setDragPos(null);
  }, [dragPos, localRotation, onPositionChange, onRotationChange, onSelectWithModifier]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const step = snapToGrid ? GRID_STEP : 0.02;
      let nextX = position.x;
      let nextY = position.y;

      switch (event.key) {
        case "ArrowLeft":
          nextX = Math.max(0, nextX - step);
          break;
        case "ArrowRight":
          nextX = Math.min(1, nextX + step);
          break;
        case "ArrowUp":
          nextY = Math.max(0, nextY - step);
          break;
        case "ArrowDown":
          nextY = Math.min(1, nextY + step);
          break;
        case "r":
        case "R":
          onRotationChange(((light.spatialRotation ?? 0) + 15) % 360);
          event.preventDefault();
          return;
        case "Enter":
        case " ":
          event.preventDefault();
          if (event.shiftKey) {
            onSelectWithModifier(true);
          } else {
            onSelect();
          }
          return;
        default:
          return;
      }

      event.preventDefault();
      onPositionChange(snapValue(nextX, snapToGrid), snapValue(nextY, snapToGrid));
    },
    [
      light.spatialRotation,
      onPositionChange,
      onRotationChange,
      onSelect,
      onSelectWithModifier,
      position.x,
      position.y,
      snapToGrid,
    ]
  );

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const baseIntensity = localIntensity ?? light.intensity;
      const step = event.shiftKey ? 1 : 5;
      const direction = event.deltaY < 0 ? 1 : -1;
      const nextIntensity = Math.max(0, Math.min(100, baseIntensity + step * direction));
      if (nextIntensity === baseIntensity) return;

      setLocalIntensity(nextIntensity);
      setWheelTooltip(nextIntensity);
      onIntensityPreview(nextIntensity);

      if (wheelTooltipRef.current) clearTimeout(wheelTooltipRef.current);
      if (wheelCommitRef.current) clearTimeout(wheelCommitRef.current);
      if (wheelFallbackClearRef.current) clearTimeout(wheelFallbackClearRef.current);

      wheelTooltipRef.current = setTimeout(() => setWheelTooltip(null), 700);
      wheelCommitRef.current = setTimeout(() => {
        onIntensityCommit(nextIntensity);
        wheelFallbackClearRef.current = setTimeout(() => setLocalIntensity(null), 1200);
      }, 220);
    },
    [light.intensity, localIntensity, onIntensityCommit, onIntensityPreview]
  );

  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onContextMenuProp(event.clientX, event.clientY);
    },
    [onContextMenuProp]
  );

  useEffect(() => {
    return () => {
      if (wheelTooltipRef.current) clearTimeout(wheelTooltipRef.current);
      if (wheelCommitRef.current) clearTimeout(wheelCommitRef.current);
      if (wheelFallbackClearRef.current) clearTimeout(wheelFallbackClearRef.current);
    };
  }, []);

  const dmxOk = dmxStatus.enabled && dmxStatus.reachable;

  return (
    <div
      ref={nodeRef}
      className="group absolute touch-none"
      style={{
        left: `${posX * 100}%`,
        top: `${posY * 100}%`,
        transform: `translate(-50%, -50%)${isDraggingRef.current && dragPos ? " scale(1.06)" : ""}`,
        zIndex: isSelected || (isDraggingRef.current && dragPos) ? 20 : 10,
        cursor: isDraggingRef.current && dragPos ? "grabbing" : "grab",
        transition: dragPos ? "none" : "left 0.15s ease, top 0.15s ease",
      }}
      role="button"
      tabIndex={0}
      aria-label={`${light.name} — ${light.on ? `${displayIntensity}%` : "Off"}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
    >
      {(() => {
        const svgSize = coneLength * 2 + 24;
        const cx = svgSize / 2;
        const cy = svgSize / 2;
        const rotationRadians = ((rotation - 90) * Math.PI) / 180;
        const leftRadians = rotationRadians - (halfAngle * Math.PI) / 180;
        const rightRadians = rotationRadians + (halfAngle * Math.PI) / 180;
        const lx = cx + coneLength * Math.cos(leftRadians);
        const ly = cy + coneLength * Math.sin(leftRadians);
        const rx = cx + coneLength * Math.cos(rightRadians);
        const ry = cy + coneLength * Math.sin(rightRadians);
        const largeArc = beamAngle > 180 ? 1 : 0;
        const conePath = `M ${cx} ${cy} L ${lx} ${ly} A ${coneLength} ${coneLength} 0 ${largeArc} 1 ${rx} ${ry} Z`;
        const handleLength = Math.max(shape.width, shape.height) / 2 + 18;
        const handleRadians = (rotation * Math.PI) / 180;
        const hx = cx + handleLength * Math.sin(handleRadians);
        const hy = cy - handleLength * Math.cos(handleRadians);

        return (
          <svg
            className="pointer-events-none absolute"
            width={svgSize}
            height={svgSize}
            style={{
              left: `${-svgSize / 2 + shape.width / 2}px`,
              top: `${-svgSize / 2 + shape.height / 2}px`,
              overflow: "visible",
              transition: localRotation !== null ? "none" : "all 0.15s ease",
            }}
          >
            {light.on && (
              <path
                d={conePath}
                fill={`rgba(${colorRgb}, ${glowOpacity * 0.14})`}
                stroke={`rgba(${colorRgb}, ${glowOpacity * 0.24})`}
                strokeWidth="1"
              />
            )}
            {isSelected && (
              <>
                <line x1={cx} y1={cy} x2={hx} y2={hy} stroke="rgba(34, 211, 238, 0.55)" strokeWidth="2" />
                <circle cx={hx} cy={hy} r="4" fill="rgba(34, 211, 238, 0.78)" />
              </>
            )}
          </svg>
        );
      })()}

      {wheelTooltip !== null && (
        <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-badge border border-accent-amber/30 bg-studio-950/95 px-2 py-0.5 text-xxs font-bold tabular-nums text-accent-amber shadow-lg">
          {wheelTooltip}%
        </div>
      )}

      {isSuggestedPosition && (
        <div className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2">
          <span className="rounded-pill border border-accent-amber/30 bg-accent-amber/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-accent-amber">
            Place
          </span>
        </div>
      )}

      <div
        className={`relative flex select-none items-center justify-center border-2 transition-colors ${
          isSelected
            ? "border-accent-cyan shadow-[0_0_0_2px_rgba(34,211,238,0.18)]"
            : isSuggestedPosition
              ? "border-dashed border-accent-amber/45"
              : "border-studio-600 hover:border-studio-400"
        } ${!light.on ? "opacity-70" : ""}`}
        style={{
          width: `${shape.width}px`,
          height: `${shape.height}px`,
          borderRadius: `${shape.borderRadius}px`,
          backgroundColor: `rgba(${colorRgb}, ${light.on ? 0.28 + (displayIntensity / 100) * 0.42 : 0.14})`,
          boxShadow: light.on
            ? `0 0 ${12 + (displayIntensity / 100) * 18}px rgba(${colorRgb}, ${glowOpacity}), inset 0 0 10px rgba(${colorRgb}, 0.15)`
            : "none",
        }}
      >
        <span
          className={`text-white/78 font-bold tracking-[0.08em] ${shape.width < 24 ? "text-micro" : "text-[10px]"}`}
        >
          {TYPE_LABELS[light.type] ?? "FX"}
        </span>

        <span
          className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-studio-900 ${
            dmxOk ? "bg-accent-green" : dmxStatus.enabled ? "bg-accent-red" : "bg-studio-600"
          }`}
        />

        {!light.on && (
          <span className="absolute bottom-0.5 rounded-pill bg-studio-950/80 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-studio-400">
            Off
          </span>
        )}
      </div>

      <div className="mt-1 text-center" style={{ maxWidth: `${Math.max(shape.width + 10, 64)}px` }}>
        <span className="block truncate text-[11px] font-semibold leading-tight text-studio-200">{light.name}</span>
        <span className="mt-0.5 block text-[9px] uppercase tracking-[0.16em] text-studio-500">
          {TYPE_LABELS[light.type] ?? light.type}
          {light.on ? ` • ${displayIntensity}%` : " • standby"}
        </span>
      </div>
    </div>
  );
}
