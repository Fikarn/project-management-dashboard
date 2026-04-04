"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { Light } from "@/lib/types";
import { supportsRgb, getSpatialShape, getBeamAngle } from "@/lib/light-types";

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
  onSelectWithModifier: (additive: boolean) => void;
  onPositionChange: (x: number, y: number) => void;
  onIntensityChange: (intensity: number) => void;
  onTogglePower: () => void;
  onRotationChange: (rotation: number) => void;
  onContextMenu: (x: number, y: number) => void;
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
  onSelectWithModifier,
  onPositionChange,
  onIntensityChange,
  onTogglePower,
  onRotationChange,
  onContextMenu: onContextMenuProp,
}: SpatialLightNodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const isDraggingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const shiftKeyRef = useRef(false);

  // Scroll-to-dim tooltip
  const [wheelTooltip, setWheelTooltip] = useState<number | null>(null);
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Double-click detection
  const lastClickRef = useRef(0);

  // Alt+drag rotation
  const isRotatingRef = useRef(false);
  const [localRotation, setLocalRotation] = useState<number | null>(null);
  const rotationStartRef = useRef<{ angle: number; startRotation: number } | null>(null);

  const posX = dragPos?.x ?? light.spatialX ?? 0.5;
  const posY = dragPos?.y ?? light.spatialY ?? 0.5;

  const hasRgb = supportsRgb(light.type);
  const isRgbMode = hasRgb && (light.colorMode === "rgb" || light.colorMode === "hsi");
  const shape = getSpatialShape(light.type);

  // Compute the node's color
  const colorRgb = light.on
    ? isRgbMode
      ? `${light.red}, ${light.green}, ${light.blue}`
      : cctToColor(light.cct)
    : "100, 100, 110";

  const glowOpacity = light.on ? Math.max(0.15, (light.intensity / 100) * 0.6) : 0;
  const beamAngle = getBeamAngle(light.type);
  const rotation = localRotation ?? light.spatialRotation;

  // Cone geometry: a CSS clip-path triangle pointing in the rotation direction
  const coneLength = 80 + (light.intensity / 100) * 40; // 80-120px based on intensity
  const halfAngle = beamAngle / 2;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!containerRect || !nodeRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      pointerIdRef.current = e.pointerId;
      shiftKeyRef.current = e.shiftKey;
      nodeRef.current.setPointerCapture(e.pointerId);

      if (e.altKey) {
        // Alt+drag = rotate
        isRotatingRef.current = true;
        const rect = nodeRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
        rotationStartRef.current = { angle, startRotation: light.spatialRotation };
      } else {
        isRotatingRef.current = false;
        dragStartRef.current = { px: e.clientX, py: e.clientY, ox: posX, oy: posY };
      }
      isDraggingRef.current = false;
    },
    [containerRect, posX, posY, light.spatialRotation]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isRotatingRef.current && rotationStartRef.current && nodeRef.current) {
        // Alt+drag rotation
        const rect = nodeRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
        const delta = angle - rotationStartRef.current.angle;
        // +90 offset: atan2 returns 0 for "right", but our 0° means "up"
        const newRot = (((rotationStartRef.current.startRotation + delta) % 360) + 360) % 360;
        isDraggingRef.current = true;
        setLocalRotation(newRot);
        return;
      }

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

    if (isRotatingRef.current) {
      // Finish rotation
      if (isDraggingRef.current && localRotation !== null) {
        onRotationChange(Math.round(localRotation));
      }
      isRotatingRef.current = false;
      rotationStartRef.current = null;
      isDraggingRef.current = false;
      setLocalRotation(null);
      return;
    }

    if (isDraggingRef.current && dragPos) {
      onPositionChange(dragPos.x, dragPos.y);
    } else {
      // Double-click detection
      const now = Date.now();
      if (now - lastClickRef.current < 300) {
        onTogglePower();
        lastClickRef.current = 0;
      } else {
        lastClickRef.current = now;
        onSelectWithModifier(shiftKeyRef.current);
      }
    }
    dragStartRef.current = null;
    isDraggingRef.current = false;
    setDragPos(null);
  }, [dragPos, localRotation, onPositionChange, onRotationChange, onSelectWithModifier, onTogglePower]);

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
        case "r":
        case "R":
          onRotationChange(((light.spatialRotation ?? 0) + 15) % 360);
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
    [light.spatialX, light.spatialY, light.spatialRotation, onSelect, onPositionChange, onRotationChange]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const step = e.shiftKey ? 1 : 5;
      const direction = e.deltaY < 0 ? 1 : -1;
      const newIntensity = Math.max(0, Math.min(100, light.intensity + step * direction));
      if (newIntensity !== light.intensity) {
        onIntensityChange(newIntensity);
        setWheelTooltip(newIntensity);
        if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
        wheelTimeoutRef.current = setTimeout(() => setWheelTooltip(null), 800);
      }
    },
    [light.intensity, onIntensityChange]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenuProp(e.clientX, e.clientY);
    },
    [onContextMenuProp]
  );

  useEffect(() => {
    return () => {
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
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
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
    >
      {/* Light direction cone + rotation handle (SVG overlay) */}
      {(() => {
        const svgSize = coneLength * 2 + 20;
        const cx = svgSize / 2;
        const cy = svgSize / 2;
        // Cone points: center, then arc edge left and right
        const rotRad = ((rotation - 90) * Math.PI) / 180;
        const leftRad = rotRad - (halfAngle * Math.PI) / 180;
        const rightRad = rotRad + (halfAngle * Math.PI) / 180;
        const lx = cx + coneLength * Math.cos(leftRad);
        const ly = cy + coneLength * Math.sin(leftRad);
        const rx = cx + coneLength * Math.cos(rightRad);
        const ry = cy + coneLength * Math.sin(rightRad);
        // Large arc flag: use 1 if beam angle > 180
        const largeArc = beamAngle > 180 ? 1 : 0;
        const conePath = `M ${cx} ${cy} L ${lx} ${ly} A ${coneLength} ${coneLength} 0 ${largeArc} 1 ${rx} ${ry} Z`;

        // Rotation handle endpoint
        const handleLen = Math.max(shape.width, shape.height) / 2 + 16;
        const handleRad = (rotation * Math.PI) / 180;
        const hx = cx + handleLen * Math.sin(handleRad);
        const hy = cy - handleLen * Math.cos(handleRad);

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
            {/* Beam cone */}
            {light.on && (
              <path
                d={conePath}
                fill={`rgba(${colorRgb}, ${glowOpacity * 0.1})`}
                stroke={`rgba(${colorRgb}, ${glowOpacity * 0.15})`}
                strokeWidth="0.5"
              />
            )}
            {/* Rotation handle — shown when selected */}
            {isSelected && (
              <>
                <line x1={cx} y1={cy} x2={hx} y2={hy} stroke="rgba(34, 211, 238, 0.5)" strokeWidth="2" />
                <circle cx={hx} cy={hy} r="3.5" fill="rgba(34, 211, 238, 0.7)" />
              </>
            )}
          </svg>
        );
      })()}

      {/* Scroll-to-dim tooltip */}
      {wheelTooltip !== null && (
        <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-badge bg-studio-800 px-2 py-0.5 text-micro font-bold tabular-nums text-studio-100 shadow-lg">
          {wheelTooltip}%
        </div>
      )}

      {/* Node */}
      <div
        className={`relative flex select-none items-center justify-center border-2 transition-colors ${
          isSelected
            ? "border-accent-cyan shadow-[0_0_0_2px_rgba(34,211,238,0.2)]"
            : "border-studio-600 hover:border-studio-400"
        } ${!light.on ? "opacity-60" : ""}`}
        style={{
          width: `${shape.width}px`,
          height: `${shape.height}px`,
          borderRadius: `${shape.borderRadius}px`,
          backgroundColor: `rgba(${colorRgb}, ${light.on ? 0.3 + (light.intensity / 100) * 0.4 : 0.15})`,
          boxShadow: light.on
            ? `0 0 ${12 + (light.intensity / 100) * 20}px rgba(${colorRgb}, ${glowOpacity}), inset 0 0 8px rgba(${colorRgb}, 0.1)`
            : "none",
        }}
      >
        {/* Type indicator */}
        <span className={`font-bold text-white/70 ${shape.width < 24 ? "text-micro" : "text-xs"}`}>
          {TYPE_LABELS[light.type] ?? "?"}
        </span>

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
      <div className="mt-1 text-center" style={{ maxWidth: `${Math.max(shape.width, 48)}px` }}>
        <span className="block truncate text-[10px] font-medium leading-tight text-studio-300">{light.name}</span>
        {light.on && <span className="text-[9px] tabular-nums text-studio-500">{light.intensity}%</span>}
      </div>
    </div>
  );
}
