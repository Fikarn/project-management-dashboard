"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Lightbulb, Camera, User } from "lucide-react";
import type { Light, LightingSettings, SpatialMarker } from "@/lib/types";
import { getSpatialShape } from "@/lib/light-types";
import SpatialLightNode from "./SpatialLightNode";
import SpatialContextMenu from "./SpatialContextMenu";

interface DmxStatus {
  connected: boolean;
  reachable: boolean;
  enabled: boolean;
}

interface SpatialCanvasProps {
  lights: Light[];
  lightingSettings: LightingSettings;
  selectedIds: string[];
  dmxStatus: DmxStatus;
  onSelect: (lightId: string, additive: boolean) => void;
  onDeselect: () => void;
  onSelectAll: () => void;
  onMarqueeSelect: (ids: string[]) => void;
  onPositionChange: (lightId: string, x: number, y: number) => void;
  onIntensityChange: (lightId: string, intensity: number) => void;
  onRotationChange: (lightId: string, rotation: number) => void;
  onTogglePower: (lightId: string) => void;
  onUpdate: (lightId: string, values: Record<string, unknown>) => void;
  onAllOff: (exceptId: string) => void;
  onMarkerChange: (type: "camera" | "subject", marker: SpatialMarker | null) => void;
  onAddLight: () => void;
}

interface MarqueeRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

function DraggableMarker({
  marker,
  type,
  containerRect,
  onPositionChange,
  onRotationChange,
}: {
  marker: SpatialMarker;
  type: "camera" | "subject";
  containerRect: DOMRect | null;
  onPositionChange: (x: number, y: number) => void;
  onRotationChange: (rotation: number) => void;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const isDraggingRef = useRef(false);
  const isRotatingRef = useRef(false);
  const rotationStartRef = useRef<{ angle: number; startRotation: number } | null>(null);
  const [localRotation, setLocalRotation] = useState<number | null>(null);

  const posX = dragPos?.x ?? marker.x;
  const posY = dragPos?.y ?? marker.y;
  const rotation = localRotation ?? marker.rotation;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!containerRect || !nodeRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      nodeRef.current.setPointerCapture(e.pointerId);

      if (e.altKey) {
        isRotatingRef.current = true;
        const rect = nodeRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
        rotationStartRef.current = { angle, startRotation: marker.rotation };
      } else {
        isRotatingRef.current = false;
        dragStartRef.current = { px: e.clientX, py: e.clientY, ox: posX, oy: posY };
      }
      isDraggingRef.current = false;
    },
    [containerRect, posX, posY, marker.rotation]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isRotatingRef.current && rotationStartRef.current && nodeRef.current) {
        const rect = nodeRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
        const delta = angle - rotationStartRef.current.angle;
        const newRot = (((rotationStartRef.current.startRotation + delta) % 360) + 360) % 360;
        isDraggingRef.current = true;
        setLocalRotation(newRot);
        return;
      }

      if (!dragStartRef.current || !containerRect) return;
      const dx = e.clientX - dragStartRef.current.px;
      const dy = e.clientY - dragStartRef.current.py;
      if (!isDraggingRef.current && Math.sqrt(dx * dx + dy * dy) < 5) return;
      isDraggingRef.current = true;
      const newX = Math.max(0, Math.min(1, dragStartRef.current.ox + dx / containerRect.width));
      const newY = Math.max(0, Math.min(1, dragStartRef.current.oy + dy / containerRect.height));
      setDragPos({ x: newX, y: newY });
    },
    [containerRect]
  );

  const handlePointerUp = useCallback(() => {
    if (isRotatingRef.current) {
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
    }
    dragStartRef.current = null;
    isDraggingRef.current = false;
    setDragPos(null);
  }, [dragPos, localRotation, onPositionChange, onRotationChange]);

  const isCamera = type === "camera";
  const CAMERA_FOV = 60; // approximate field of view angle
  const halfFov = CAMERA_FOV / 2;

  return (
    <div
      ref={nodeRef}
      className="group absolute z-[5] touch-none"
      style={{
        left: `${posX * 100}%`,
        top: `${posY * 100}%`,
        transform: "translate(-50%, -50%)",
        cursor: isDraggingRef.current && dragPos ? "grabbing" : "grab",
        transition: dragPos ? "none" : "left 0.15s ease, top 0.15s ease",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Camera view cone + direction (SVG) */}
      {isCamera &&
        (() => {
          const coneLen = 80;
          const svgSize = coneLen * 2 + 20;
          const cx = svgSize / 2;
          const cy = svgSize / 2;
          const rotRad = ((rotation - 90) * Math.PI) / 180;
          const leftRad = rotRad - (halfFov * Math.PI) / 180;
          const rightRad = rotRad + (halfFov * Math.PI) / 180;
          const lx = cx + coneLen * Math.cos(leftRad);
          const ly = cy + coneLen * Math.sin(leftRad);
          const rx = cx + coneLen * Math.cos(rightRad);
          const ry = cy + coneLen * Math.sin(rightRad);
          const conePath = `M ${cx} ${cy} L ${lx} ${ly} A ${coneLen} ${coneLen} 0 0 1 ${rx} ${ry} Z`;
          // Direction arrow tip
          const arrowLen = 30;
          const ax = cx + arrowLen * Math.cos(rotRad);
          const ay = cy + arrowLen * Math.sin(rotRad);
          return (
            <svg
              className="pointer-events-none absolute"
              width={svgSize}
              height={svgSize}
              style={{
                left: `${-svgSize / 2 + 16}px`,
                top: `${-svgSize / 2 + 16}px`,
                overflow: "visible",
              }}
            >
              <path
                d={conePath}
                fill="rgba(150, 160, 180, 0.06)"
                stroke="rgba(150, 160, 180, 0.12)"
                strokeWidth="0.5"
              />
              <line x1={cx} y1={cy} x2={ax} y2={ay} stroke="rgba(150, 160, 180, 0.4)" strokeWidth="2" />
              <circle cx={ax} cy={ay} r="3" fill="rgba(150, 160, 180, 0.5)" />
            </svg>
          );
        })()}

      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed ${
          isCamera ? "border-studio-500/60 bg-studio-800/80" : "border-studio-500/60 bg-studio-800/80"
        }`}
      >
        {isCamera ? <Camera size={14} className="text-studio-400" /> : <User size={14} className="text-studio-400" />}
      </div>
      <div className="mt-0.5 text-center">
        <span className="text-[9px] font-medium uppercase tracking-wider text-studio-600">
          {isCamera ? "Cam" : "Talent"}
        </span>
      </div>
    </div>
  );
}

export default function SpatialCanvas({
  lights,
  lightingSettings,
  selectedIds,
  dmxStatus,
  onSelect,
  onDeselect,
  onSelectAll,
  onMarqueeSelect,
  onPositionChange,
  onIntensityChange,
  onRotationChange,
  onTogglePower,
  onUpdate,
  onAllOff,
  onMarkerChange,
  onAddLight,
}: SpatialCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);
  const isMarqueeRef = useRef(false);
  const [contextMenu, setContextMenu] = useState<{ light: Light; x: number; y: number } | null>(null);

  // Track container dimensions for drag calculations
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateRect = () => setContainerRect(el.getBoundingClientRect());
    updateRect();

    const observer = new ResizeObserver(updateRect);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Auto-arrange lights that don't have positions yet
  useEffect(() => {
    const unpositioned = lights.filter((l) => l.spatialX === null || l.spatialY === null);
    if (unpositioned.length === 0) return;

    const count = unpositioned.length;
    unpositioned.forEach((light, i) => {
      const x = count === 1 ? 0.5 : 0.15 + (i / (count - 1)) * 0.7;
      onPositionChange(light.id, x, 0.5);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- only on mount

  // Cmd/Ctrl+A to select all
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        e.preventDefault();
        onSelectAll();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSelectAll]);

  // Marquee selection: start on background pointerdown
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only start marquee on direct background clicks (not on light nodes)
    if (e.target !== containerRef.current) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    marqueeStartRef.current = { x, y };
    isMarqueeRef.current = false;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!marqueeStartRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - marqueeStartRef.current.x;
    const dy = y - marqueeStartRef.current.y;

    // Only start marquee after 5px of movement
    if (!isMarqueeRef.current && Math.sqrt(dx * dx + dy * dy) < 5) return;
    isMarqueeRef.current = true;

    setMarquee({
      startX: marqueeStartRef.current.x,
      startY: marqueeStartRef.current.y,
      currentX: x,
      currentY: y,
    });
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isMarqueeRef.current && marquee && containerRef.current) {
        // Calculate marquee bounds as normalized 0-1
        const rect = containerRef.current.getBoundingClientRect();
        const x1 = Math.min(marquee.startX, marquee.currentX) / rect.width;
        const x2 = Math.max(marquee.startX, marquee.currentX) / rect.width;
        const y1 = Math.min(marquee.startY, marquee.currentY) / rect.height;
        const y2 = Math.max(marquee.startY, marquee.currentY) / rect.height;

        // Find lights within marquee, accounting for node shape sizes
        const enclosed = lights.filter((l) => {
          const lx = l.spatialX ?? 0.5;
          const ly = l.spatialY ?? 0.5;
          const shape = getSpatialShape(l.type);
          // Account for node size in pixels → normalized offset
          const halfW = shape.width / 2 / rect.width;
          const halfH = shape.height / 2 / rect.height;
          // Light is "in" marquee if any part of the node overlaps
          return lx + halfW > x1 && lx - halfW < x2 && ly + halfH > y1 && ly - halfH < y2;
        });

        if (enclosed.length > 0) {
          onMarqueeSelect(enclosed.map((l) => l.id));
        }
      } else if (!isMarqueeRef.current && e.target === containerRef.current) {
        // Plain background click — deselect
        onDeselect();
      }

      marqueeStartRef.current = null;
      isMarqueeRef.current = false;
      setMarquee(null);
    },
    [marquee, lights, onMarqueeSelect, onDeselect]
  );

  if (lights.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center text-studio-500">
        <div className="text-center">
          <Lightbulb size={48} className="mx-auto mb-3 text-studio-700" />
          <p className="mb-2 text-sm">No lights configured</p>
          <button onClick={onAddLight} className="text-sm text-accent-blue hover:text-accent-blue/80">
            Add your first light
          </button>
        </div>
      </div>
    );
  }

  // Compute marquee rectangle for rendering
  const marqueeStyle = marquee
    ? {
        left: Math.min(marquee.startX, marquee.currentX),
        top: Math.min(marquee.startY, marquee.currentY),
        width: Math.abs(marquee.currentX - marquee.startX),
        height: Math.abs(marquee.currentY - marquee.startY),
      }
    : null;

  return (
    <div
      ref={containerRef}
      className="relative min-h-[500px] overflow-hidden rounded-card border border-studio-750"
      style={{
        background: `
          radial-gradient(circle, rgba(100, 100, 120, 0.15) 1px, transparent 1px),
          #0d0d12
        `,
        backgroundSize: "40px 40px",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Center crosshair reference lines */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-full w-px"
        style={{ background: "rgba(100, 100, 120, 0.1)" }}
      />
      <div
        className="pointer-events-none absolute left-0 top-1/2 h-px w-full"
        style={{ background: "rgba(100, 100, 120, 0.1)" }}
      />

      {/* "STUDIO" label */}
      <span className="pointer-events-none absolute left-3 top-2 text-micro font-bold uppercase tracking-[0.2em] text-studio-700">
        Studio Layout
      </span>

      {/* Hint text */}
      <span className="pointer-events-none absolute bottom-2 right-3 text-micro text-studio-700">
        Drag to move &middot; Alt+drag to rotate &middot; Shift+click multi-select
      </span>

      {/* Marker toggle buttons */}
      <div className="absolute right-3 top-2 z-30 flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkerChange("camera", lightingSettings.cameraMarker ? null : { x: 0.5, y: 0.85, rotation: 0 });
          }}
          className={`flex items-center gap-1 rounded-badge px-1.5 py-0.5 text-micro font-medium transition-colors ${
            lightingSettings.cameraMarker
              ? "bg-studio-700/60 text-studio-300"
              : "bg-studio-800/40 text-studio-600 hover:text-studio-400"
          }`}
          title={lightingSettings.cameraMarker ? "Hide camera marker" : "Show camera marker"}
        >
          <Camera size={10} />
          Cam
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkerChange("subject", lightingSettings.subjectMarker ? null : { x: 0.5, y: 0.45, rotation: 0 });
          }}
          className={`flex items-center gap-1 rounded-badge px-1.5 py-0.5 text-micro font-medium transition-colors ${
            lightingSettings.subjectMarker
              ? "bg-studio-700/60 text-studio-300"
              : "bg-studio-800/40 text-studio-600 hover:text-studio-400"
          }`}
          title={lightingSettings.subjectMarker ? "Hide talent marker" : "Show talent marker"}
        >
          <User size={10} />
          Talent
        </button>
      </div>

      {/* Camera & Subject markers */}
      {lightingSettings.cameraMarker && (
        <DraggableMarker
          marker={lightingSettings.cameraMarker}
          type="camera"
          containerRect={containerRect}
          onPositionChange={(x, y) => onMarkerChange("camera", { ...lightingSettings.cameraMarker!, x, y })}
          onRotationChange={(rot) => onMarkerChange("camera", { ...lightingSettings.cameraMarker!, rotation: rot })}
        />
      )}
      {lightingSettings.subjectMarker && (
        <DraggableMarker
          marker={lightingSettings.subjectMarker}
          type="subject"
          containerRect={containerRect}
          onPositionChange={(x, y) => onMarkerChange("subject", { ...lightingSettings.subjectMarker!, x, y })}
          onRotationChange={() => {}}
        />
      )}

      {/* Marquee selection rectangle */}
      {marqueeStyle && (
        <div
          className="pointer-events-none absolute border border-accent-cyan/50 bg-accent-cyan/10"
          style={{
            left: marqueeStyle.left,
            top: marqueeStyle.top,
            width: marqueeStyle.width,
            height: marqueeStyle.height,
          }}
        />
      )}

      {/* Light nodes */}
      {lights.map((light) => (
        <SpatialLightNode
          key={light.id}
          light={light}
          isSelected={selectedIds.includes(light.id)}
          dmxStatus={dmxStatus}
          containerRect={containerRect}
          onSelect={() => {}}
          onSelectWithModifier={(additive) => onSelect(light.id, additive)}
          onPositionChange={(x, y) => onPositionChange(light.id, x, y)}
          onIntensityChange={(intensity) => onIntensityChange(light.id, intensity)}
          onRotationChange={(rotation) => onRotationChange(light.id, rotation)}
          onTogglePower={() => onTogglePower(light.id)}
          onContextMenu={(x, y) => setContextMenu({ light, x, y })}
        />
      ))}

      {/* Context menu */}
      {contextMenu && (
        <SpatialContextMenu
          light={contextMenu.light}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onUpdate={onUpdate}
          onAllOff={onAllOff}
        />
      )}
    </div>
  );
}
