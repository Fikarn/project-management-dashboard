"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { Camera, Lightbulb, Move, ScanLine, User, ZoomIn, ZoomOut } from "lucide-react";
import type { DmxStatus, Light, LightingSettings, SpatialMarker } from "@/lib/types";
import { getSpatialShape } from "@/lib/light-types";
import SpatialContextMenu from "./SpatialContextMenu";
import SpatialLightNode from "./SpatialLightNode";

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
  onIntensityPreview: (lightId: string, intensity: number) => void;
  onIntensityCommit: (lightId: string, intensity: number) => void;
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

interface PlotPosition {
  x: number;
  y: number;
}

type CameraFrame = "wide" | "medium" | "tight";

const STORAGE_KEY = "lighting-spatial-viewport-v1";
const GRID_STEP = 0.025;
const MIN_ZOOM = 0.85;
const MAX_ZOOM = 2.4;
const CAMERA_FOV: Record<CameraFrame, number> = {
  wide: 84,
  medium: 60,
  tight: 40,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function snapValue(value: number, enabled: boolean): number {
  if (!enabled) return clamp(value, 0, 1);
  return clamp(Math.round(value / GRID_STEP) * GRID_STEP, 0, 1);
}

function clampPan(pan: PlotPosition, zoom: number, rect: DOMRect): PlotPosition {
  if (zoom <= 1) {
    return {
      x: (rect.width - rect.width * zoom) / 2,
      y: (rect.height - rect.height * zoom) / 2,
    };
  }

  const margin = 80;
  return {
    x: clamp(pan.x, rect.width - rect.width * zoom - margin, margin),
    y: clamp(pan.y, rect.height - rect.height * zoom - margin, margin),
  };
}

function getStagePoint(clientX: number, clientY: number, rect: DOMRect, zoom: number, pan: PlotPosition): PlotPosition {
  return {
    x: clamp((clientX - rect.left - pan.x) / zoom, 0, rect.width),
    y: clamp((clientY - rect.top - pan.y) / zoom, 0, rect.height),
  };
}

function DraggableMarker({
  marker,
  type,
  cameraFov,
  containerRect,
  zoom,
  snapToGrid,
  onPositionChange,
  onRotationChange,
}: {
  marker: SpatialMarker;
  type: "camera" | "subject";
  cameraFov: number;
  containerRect: DOMRect | null;
  zoom: number;
  snapToGrid: boolean;
  onPositionChange: (x: number, y: number) => void;
  onRotationChange: (rotation: number) => void;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [dragPos, setDragPos] = useState<PlotPosition | null>(null);
  const [localRotation, setLocalRotation] = useState<number | null>(null);
  const dragStartRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const isDraggingRef = useRef(false);
  const isRotatingRef = useRef(false);
  const rotationStartRef = useRef<{ angle: number; startRotation: number } | null>(null);

  const isCamera = type === "camera";
  const posX = dragPos?.x ?? marker.x;
  const posY = dragPos?.y ?? marker.y;
  const rotation = localRotation ?? marker.rotation;

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (!containerRect || !nodeRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      nodeRef.current.setPointerCapture(event.pointerId);

      if (isCamera && event.altKey) {
        isRotatingRef.current = true;
        const rect = nodeRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const angle = Math.atan2(event.clientY - cy, event.clientX - cx) * (180 / Math.PI);
        rotationStartRef.current = { angle, startRotation: marker.rotation };
      } else {
        isRotatingRef.current = false;
        dragStartRef.current = { px: event.clientX, py: event.clientY, ox: posX, oy: posY };
      }
      isDraggingRef.current = false;
    },
    [containerRect, isCamera, marker.rotation, posX, posY]
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
      if (!isDraggingRef.current && Math.sqrt(dx * dx + dy * dy) < 5) return;
      isDraggingRef.current = true;
      setDragPos({
        x: snapValue(dragStartRef.current.ox + dx / (containerRect.width * zoom), snapToGrid),
        y: snapValue(dragStartRef.current.oy + dy / (containerRect.height * zoom), snapToGrid),
      });
    },
    [containerRect, snapToGrid, zoom]
  );

  const handlePointerUp = useCallback(() => {
    if (isRotatingRef.current) {
      if (isDraggingRef.current && localRotation !== null) onRotationChange(Math.round(localRotation));
      isRotatingRef.current = false;
      rotationStartRef.current = null;
      isDraggingRef.current = false;
      setLocalRotation(null);
      return;
    }

    if (isDraggingRef.current && dragPos) onPositionChange(dragPos.x, dragPos.y);
    dragStartRef.current = null;
    isDraggingRef.current = false;
    setDragPos(null);
  }, [dragPos, localRotation, onPositionChange, onRotationChange]);

  const halfFov = cameraFov / 2;

  return (
    <div
      ref={nodeRef}
      className="group absolute z-[8] touch-none"
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
      {isCamera &&
        (() => {
          const coneLength = 86;
          const svgSize = coneLength * 2 + 28;
          const cx = svgSize / 2;
          const cy = svgSize / 2;
          const rotationRadians = ((rotation - 90) * Math.PI) / 180;
          const leftRadians = rotationRadians - (halfFov * Math.PI) / 180;
          const rightRadians = rotationRadians + (halfFov * Math.PI) / 180;
          const lx = cx + coneLength * Math.cos(leftRadians);
          const ly = cy + coneLength * Math.sin(leftRadians);
          const rx = cx + coneLength * Math.cos(rightRadians);
          const ry = cy + coneLength * Math.sin(rightRadians);
          const conePath = `M ${cx} ${cy} L ${lx} ${ly} A ${coneLength} ${coneLength} 0 0 1 ${rx} ${ry} Z`;
          return (
            <svg
              className="pointer-events-none absolute"
              width={svgSize}
              height={svgSize}
              style={{
                left: `${-svgSize / 2 + 18}px`,
                top: `${-svgSize / 2 + 18}px`,
                overflow: "visible",
              }}
            >
              <path d={conePath} fill="rgba(88, 124, 189, 0.08)" stroke="rgba(88, 124, 189, 0.18)" strokeWidth="1" />
            </svg>
          );
        })()}

      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-lg ${
          isCamera
            ? "border-accent-blue/40 bg-accent-blue/10 text-accent-blue"
            : "border-accent-amber/40 bg-accent-amber/10 text-accent-amber"
        }`}
      >
        {isCamera ? <Camera size={15} /> : <User size={15} />}
      </div>
      <div className="mt-1 text-center">
        <span className="rounded-pill border border-studio-700/70 bg-studio-950/80 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-studio-300">
          {isCamera ? "Camera" : "Talent"}
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
  onIntensityPreview,
  onIntensityCommit,
  onRotationChange,
  onTogglePower,
  onUpdate,
  onAllOff,
  onMarkerChange,
  onAddLight,
}: SpatialCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const [contextMenu, setContextMenu] = useState<{ light: Light; x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<PlotPosition>({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [panMode, setPanMode] = useState(false);
  const [cameraFrame, setCameraFrame] = useState<CameraFrame>("medium");
  const marqueeStartRef = useRef<PlotPosition | null>(null);
  const isMarqueeRef = useRef(false);
  const panStartRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<{
        showGrid: boolean;
        snapToGrid: boolean;
        cameraFrame: CameraFrame;
      }>;
      if (typeof parsed.showGrid === "boolean") setShowGrid(parsed.showGrid);
      if (typeof parsed.snapToGrid === "boolean") setSnapToGrid(parsed.snapToGrid);
      if (parsed.cameraFrame === "wide" || parsed.cameraFrame === "medium" || parsed.cameraFrame === "tight") {
        setCameraFrame(parsed.cameraFrame);
      }
    } catch {
      // ignore corrupted local UI state
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        showGrid,
        snapToGrid,
        cameraFrame,
      })
    );
  }, [cameraFrame, showGrid, snapToGrid]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateRect = () => setContainerRect(element.getBoundingClientRect());
    updateRect();

    const observer = new ResizeObserver(updateRect);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const unpositionedLights = useMemo(
    () => lights.filter((light) => light.spatialX === null || light.spatialY === null),
    [lights]
  );

  const suggestedPositions = useMemo(() => {
    const positions = new Map<string, PlotPosition>();
    if (unpositionedLights.length === 0) return positions;

    const columns = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(unpositionedLights.length))));
    const rows = Math.ceil(unpositionedLights.length / columns);

    unpositionedLights.forEach((light, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = columns === 1 ? 0.5 : 0.18 + (column / Math.max(columns - 1, 1)) * 0.64;
      const y = rows === 1 ? 0.52 : 0.28 + (row / Math.max(rows - 1, 1)) * 0.34;
      positions.set(light.id, { x, y });
    });

    return positions;
  }, [unpositionedLights]);

  const resolvedPositions = useMemo(() => {
    const positions = new Map<string, PlotPosition>();
    lights.forEach((light) => {
      positions.set(light.id, {
        x: light.spatialX ?? suggestedPositions.get(light.id)?.x ?? 0.5,
        y: light.spatialY ?? suggestedPositions.get(light.id)?.y ?? 0.5,
      });
    });
    return positions;
  }, [lights, suggestedPositions]);

  const selectedLights = useMemo(() => lights.filter((light) => selectedIds.includes(light.id)), [lights, selectedIds]);

  const primarySelectedLight = selectedLights[0] ?? null;
  const markerCount = Number(Boolean(lightingSettings.cameraMarker)) + Number(Boolean(lightingSettings.subjectMarker));
  const cameraFov = CAMERA_FOV[cameraFrame];

  const persistSuggestedLayout = useCallback(() => {
    unpositionedLights.forEach((light) => {
      const position = suggestedPositions.get(light.id);
      if (position) onPositionChange(light.id, snapValue(position.x, snapToGrid), snapValue(position.y, snapToGrid));
    });
  }, [onPositionChange, snapToGrid, suggestedPositions, unpositionedLights]);

  const resetView = useCallback(() => {
    if (!containerRect) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    setZoom(1);
    setPan(clampPan({ x: 0, y: 0 }, 1, containerRect));
  }, [containerRect]);

  const applyZoom = useCallback(
    (nextZoom: number, anchorX?: number, anchorY?: number) => {
      if (!containerRect) return;
      const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
      const targetX = anchorX ?? containerRect.width / 2;
      const targetY = anchorY ?? containerRect.height / 2;
      const stageX = (targetX - pan.x) / zoom;
      const stageY = (targetY - pan.y) / zoom;
      const nextPan = clampPan(
        {
          x: targetX - stageX * clampedZoom,
          y: targetY - stageY * clampedZoom,
        },
        clampedZoom,
        containerRect
      );
      setZoom(clampedZoom);
      setPan(nextPan);
    },
    [containerRect, pan.x, pan.y, zoom]
  );

  const fitView = useCallback(
    (targetIds?: string[]) => {
      if (!containerRect) return;
      const targetLights =
        targetIds && targetIds.length > 0 ? lights.filter((light) => targetIds.includes(light.id)) : lights;
      if (targetLights.length === 0) return;

      const extents = targetLights.reduce(
        (acc, light) => {
          const position = resolvedPositions.get(light.id) ?? { x: 0.5, y: 0.5 };
          const shape = getSpatialShape(light.type);
          const centerX = position.x * containerRect.width;
          const centerY = position.y * containerRect.height;
          return {
            minX: Math.min(acc.minX, centerX - shape.width / 2),
            maxX: Math.max(acc.maxX, centerX + shape.width / 2),
            minY: Math.min(acc.minY, centerY - shape.height / 2),
            maxY: Math.max(acc.maxY, centerY + shape.height / 2),
          };
        },
        {
          minX: Number.POSITIVE_INFINITY,
          maxX: Number.NEGATIVE_INFINITY,
          minY: Number.POSITIVE_INFINITY,
          maxY: Number.NEGATIVE_INFINITY,
        }
      );

      const paddingX = 120;
      const paddingY = 120;
      const width = Math.max(180, extents.maxX - extents.minX);
      const height = Math.max(180, extents.maxY - extents.minY);
      const nextZoom = clamp(
        Math.min((containerRect.width - paddingX * 2) / width, (containerRect.height - paddingY * 2) / height),
        MIN_ZOOM,
        MAX_ZOOM
      );
      const centerX = (extents.minX + extents.maxX) / 2;
      const centerY = (extents.minY + extents.maxY) / 2;

      setZoom(nextZoom);
      setPan(
        clampPan(
          {
            x: containerRect.width / 2 - centerX * nextZoom,
            y: containerRect.height / 2 - centerY * nextZoom,
          },
          nextZoom,
          containerRect
        )
      );
    },
    [containerRect, lights, resolvedPositions]
  );

  const openSelectionMenu = useCallback(() => {
    if (!primarySelectedLight) return;
    setContextMenu({
      light: primarySelectedLight,
      x: Math.max(24, window.innerWidth - 260),
      y: Math.max(24, window.innerHeight - 260),
    });
  }, [primarySelectedLight]);

  const handleCanvasKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        onSelectAll();
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onDeselect();
      }

      if (event.key === "=" || event.key === "+") {
        event.preventDefault();
        applyZoom(zoom + 0.15);
      }

      if (event.key === "-") {
        event.preventDefault();
        applyZoom(zoom - 0.15);
      }

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        fitView(selectedIds.length > 0 ? selectedIds : undefined);
      }
    },
    [applyZoom, fitView, onDeselect, onSelectAll, selectedIds, zoom]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!containerRect || event.target !== event.currentTarget) return;
      containerRef.current?.focus();

      if (panMode || zoom > 1.05) {
        panStartRef.current = {
          px: event.clientX,
          py: event.clientY,
          ox: pan.x,
          oy: pan.y,
        };
        isMarqueeRef.current = false;
        return;
      }

      const stagePoint = getStagePoint(event.clientX, event.clientY, containerRect, zoom, pan);
      marqueeStartRef.current = stagePoint;
      isMarqueeRef.current = false;
    },
    [containerRect, pan, panMode, zoom]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!containerRect) return;

      if (panStartRef.current) {
        setPan(
          clampPan(
            {
              x: panStartRef.current.ox + (event.clientX - panStartRef.current.px),
              y: panStartRef.current.oy + (event.clientY - panStartRef.current.py),
            },
            zoom,
            containerRect
          )
        );
        return;
      }

      if (!marqueeStartRef.current) return;
      const stagePoint = getStagePoint(event.clientX, event.clientY, containerRect, zoom, pan);
      const dx = stagePoint.x - marqueeStartRef.current.x;
      const dy = stagePoint.y - marqueeStartRef.current.y;

      if (!isMarqueeRef.current && Math.sqrt(dx * dx + dy * dy) < 5) return;
      isMarqueeRef.current = true;

      setMarquee({
        startX: marqueeStartRef.current.x,
        startY: marqueeStartRef.current.y,
        currentX: stagePoint.x,
        currentY: stagePoint.y,
      });
    },
    [containerRect, pan, zoom]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (panStartRef.current) {
        panStartRef.current = null;
        return;
      }

      if (isMarqueeRef.current && marquee && containerRect) {
        const x1 = Math.min(marquee.startX, marquee.currentX) / containerRect.width;
        const x2 = Math.max(marquee.startX, marquee.currentX) / containerRect.width;
        const y1 = Math.min(marquee.startY, marquee.currentY) / containerRect.height;
        const y2 = Math.max(marquee.startY, marquee.currentY) / containerRect.height;

        const enclosed = lights.filter((light) => {
          const position = resolvedPositions.get(light.id) ?? { x: 0.5, y: 0.5 };
          const shape = getSpatialShape(light.type);
          const halfWidth = shape.width / 2 / containerRect.width;
          const halfHeight = shape.height / 2 / containerRect.height;
          return (
            position.x + halfWidth > x1 &&
            position.x - halfWidth < x2 &&
            position.y + halfHeight > y1 &&
            position.y - halfHeight < y2
          );
        });

        if (enclosed.length > 0) onMarqueeSelect(enclosed.map((light) => light.id));
      } else if (!isMarqueeRef.current && event.target === event.currentTarget) {
        onDeselect();
      }

      marqueeStartRef.current = null;
      isMarqueeRef.current = false;
      setMarquee(null);
    },
    [containerRect, lights, marquee, onDeselect, onMarqueeSelect, resolvedPositions]
  );

  if (lights.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center text-studio-500">
        <div className="text-center">
          <Lightbulb size={48} className="mx-auto mb-3 text-studio-500" aria-hidden="true" />
          <p className="mb-2 text-sm">No lights configured</p>
          <button type="button" onClick={onAddLight} className="text-sm text-accent-blue hover:text-accent-blue/80">
            Add your first light
          </button>
        </div>
      </div>
    );
  }

  const marqueeStyle =
    marquee && containerRect
      ? {
          left: marquee.startX * zoom + pan.x,
          top: marquee.startY * zoom + pan.y,
          width: (marquee.currentX - marquee.startX) * zoom,
          height: (marquee.currentY - marquee.startY) * zoom,
        }
      : null;

  const normalizedZoom = Math.round(zoom * 100);

  return (
    <div
      ref={containerRef}
      data-testid="spatial-canvas"
      aria-label="Spatial studio plot"
      tabIndex={0}
      className="relative h-full min-h-[560px] overflow-hidden rounded-card border border-studio-750 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 22%, rgba(0,0,0,0) 55%), #0d0d12",
      }}
      onKeyDown={handleCanvasKeyDown}
    >
      <div className="bg-studio-950/88 absolute left-3 top-3 z-30 max-w-[32rem] rounded-card border border-studio-700/80 p-3 shadow-modal backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-studio-400">Studio Plot</div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xxs text-studio-400">
              <span>{lights.length} fixtures</span>
              <span className="text-studio-700">•</span>
              <span>{selectedIds.length} selected</span>
              <span className="text-studio-700">•</span>
              <span>{markerCount} markers</span>
              {unpositionedLights.length > 0 && (
                <>
                  <span className="text-studio-700">•</span>
                  <span className="text-accent-amber">{unpositionedLights.length} awaiting placement</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={onSelectAll}
              className="rounded-badge border border-studio-700 bg-studio-850 px-2.5 py-1 text-xxs font-medium text-studio-300 transition-colors hover:border-studio-600 hover:text-studio-50"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={onDeselect}
              className="rounded-badge border border-studio-700 bg-studio-850 px-2.5 py-1 text-xxs font-medium text-studio-300 transition-colors hover:border-studio-600 hover:text-studio-50"
            >
              Clear
            </button>
            {unpositionedLights.length > 0 && (
              <button
                type="button"
                onClick={persistSuggestedLayout}
                className="rounded-badge border border-accent-amber/30 bg-accent-amber/10 px-2.5 py-1 text-xxs font-medium text-accent-amber transition-colors hover:bg-accent-amber/20"
              >
                Arrange Missing
              </button>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5 text-xxs text-studio-400">
          {[
            "Drag to move",
            "Option+Drag to rotate",
            "Wheel to dim",
            "Shift+Click multi-select",
            "Right-click quick actions",
            "F to fit selection",
          ].map((hint) => (
            <span key={hint} className="rounded-pill border border-studio-700/70 bg-studio-900/70 px-2 py-0.5">
              {hint}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-studio-950/88 absolute right-3 top-3 z-30 w-[18rem] rounded-card border border-studio-700/80 p-3 shadow-modal backdrop-blur">
        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-studio-400">Viewport</div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => applyZoom(zoom - 0.15)}
              className="rounded-badge border border-studio-700 bg-studio-850 p-1.5 text-studio-300 transition-colors hover:border-studio-600 hover:text-studio-50"
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => applyZoom(zoom + 0.15)}
              className="rounded-badge border border-studio-700 bg-studio-850 p-1.5 text-studio-300 transition-colors hover:border-studio-600 hover:text-studio-50"
            >
              <ZoomIn size={14} />
            </button>
          </div>
          <span className="rounded-pill border border-studio-700 bg-studio-850 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-studio-300">
            {normalizedZoom}%
          </span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fitView()}
            className="rounded-badge border border-studio-700 bg-studio-850 px-2.5 py-2 text-xxs font-medium text-studio-300 transition-colors hover:border-studio-600 hover:text-studio-50"
          >
            Fit All
          </button>
          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={() => fitView(selectedIds)}
            className="rounded-badge border border-studio-700 bg-studio-850 px-2.5 py-2 text-xxs font-medium text-studio-300 transition-colors hover:border-studio-600 hover:text-studio-50 disabled:opacity-50"
          >
            Fit Selection
          </button>
          <button
            type="button"
            onClick={resetView}
            className="rounded-badge border border-studio-700 bg-studio-850 px-2.5 py-2 text-xxs font-medium text-studio-300 transition-colors hover:border-studio-600 hover:text-studio-50"
          >
            Reset View
          </button>
          <button
            type="button"
            onClick={() => setPanMode((current) => !current)}
            className={`flex items-center justify-center gap-1.5 rounded-badge border px-2.5 py-2 text-xxs font-medium transition-colors ${
              panMode
                ? "bg-accent-cyan/12 border-accent-cyan/30 text-accent-cyan"
                : "border-studio-700 bg-studio-850 text-studio-300 hover:border-studio-600 hover:text-studio-50"
            }`}
          >
            <Move size={12} />
            Pan Mode
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setShowGrid((current) => !current)}
            className={`rounded-badge border px-2.5 py-2 text-xxs font-medium transition-colors ${
              showGrid
                ? "bg-accent-blue/12 border-accent-blue/30 text-accent-blue"
                : "border-studio-700 bg-studio-850 text-studio-300 hover:border-studio-600 hover:text-studio-50"
            }`}
          >
            {showGrid ? "Grid On" : "Grid Off"}
          </button>
          <button
            type="button"
            onClick={() => setSnapToGrid((current) => !current)}
            className={`rounded-badge border px-2.5 py-2 text-xxs font-medium transition-colors ${
              snapToGrid
                ? "bg-accent-amber/12 border-accent-amber/30 text-accent-amber"
                : "border-studio-700 bg-studio-850 text-studio-300 hover:border-studio-600 hover:text-studio-50"
            }`}
          >
            {snapToGrid ? "Snap On" : "Snap Off"}
          </button>
        </div>
      </div>

      <div className="bg-studio-950/92 absolute bottom-3 left-3 z-30 w-[21rem] rounded-card border border-studio-700/80 p-3 shadow-modal backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-studio-400">Reference Markers</div>
          <span className="rounded-pill border border-studio-700 bg-studio-850 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-studio-300">
            {cameraFrame}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onMarkerChange("camera", lightingSettings.cameraMarker ? null : { x: 0.5, y: 0.84, rotation: 0 });
            }}
            className={`flex items-center justify-center gap-1.5 rounded-badge border px-2.5 py-2 text-xxs font-medium transition-colors ${
              lightingSettings.cameraMarker
                ? "bg-accent-blue/12 border-accent-blue/30 text-accent-blue"
                : "border-studio-700 bg-studio-850 text-studio-300 hover:border-studio-600"
            }`}
          >
            <Camera size={13} />
            Camera
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onMarkerChange("subject", lightingSettings.subjectMarker ? null : { x: 0.5, y: 0.46, rotation: 0 });
            }}
            className={`flex items-center justify-center gap-1.5 rounded-badge border px-2.5 py-2 text-xxs font-medium transition-colors ${
              lightingSettings.subjectMarker
                ? "bg-accent-amber/12 border-accent-amber/30 text-accent-amber"
                : "border-studio-700 bg-studio-850 text-studio-300 hover:border-studio-600"
            }`}
          >
            <User size={13} />
            Talent
          </button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1">
          {(["wide", "medium", "tight"] as const).map((frame) => (
            <button
              key={frame}
              type="button"
              onClick={() => setCameraFrame(frame)}
              className={`rounded-badge px-2 py-1.5 text-xxs font-medium uppercase transition-colors ${
                cameraFrame === frame
                  ? "bg-accent-cyan/14 text-accent-cyan"
                  : "bg-studio-850 text-studio-400 hover:text-studio-200"
              }`}
            >
              {frame}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xxs leading-relaxed text-studio-500">
          Grid visibility and snap help fixture spacing. Pan mode or zoomed drag lets you inspect crowded areas without
          leaving the fixed console layout.
        </p>
      </div>

      <div className="bg-studio-950/88 absolute bottom-3 right-3 z-20 rounded-card border border-studio-700/80 px-3 py-2 shadow-lg backdrop-blur">
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-studio-400">
          <ScanLine size={12} />
          Controls
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xxs text-studio-400">
          <span>Drag: move</span>
          <span>Esc: clear</span>
          <span>Option+Drag: rotate</span>
          <span>F: fit current view</span>
          <span>Wheel: dim preview</span>
          <span>Cmd/Ctrl+A: select all</span>
        </div>
      </div>

      <div
        ref={stageRef}
        data-testid="spatial-stage"
        className="absolute inset-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "top left",
          cursor: panStartRef.current ? "grabbing" : panMode ? "grab" : "default",
          backgroundImage: showGrid
            ? "radial-gradient(circle, rgba(100, 100, 120, 0.18) 1px, transparent 1px)"
            : undefined,
          backgroundSize: showGrid ? "40px 40px" : undefined,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-10 top-14 h-[18%] rounded-[32px] border border-studio-800/60 bg-studio-950/35" />
          <div className="absolute left-[18%] top-[26%] h-[36%] w-[64%] rounded-[36px] border border-dashed border-accent-cyan/20 bg-accent-cyan/[0.03]" />
          <div className="absolute inset-x-12 bottom-10 h-[18%] rounded-[36px] border border-studio-800/60 bg-studio-950/30" />
        </div>

        <div
          className="pointer-events-none absolute left-1/2 top-0 h-full w-px"
          style={{ background: "rgba(100, 100, 120, 0.1)" }}
        />
        <div
          className="pointer-events-none absolute left-0 top-1/2 h-px w-full"
          style={{ background: "rgba(100, 100, 120, 0.1)" }}
        />

        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
          <span className="rounded-pill border border-studio-700/80 bg-studio-950/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-studio-300">
            Back Wall / Key Side
          </span>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <span className="rounded-pill border border-studio-700/80 bg-studio-950/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-studio-300">
            Camera Line / Operator Side
          </span>
        </div>
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 -rotate-90">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-studio-500">Stage Left</span>
        </div>
        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rotate-90">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-studio-500">Stage Right</span>
        </div>
        <div className="pointer-events-none absolute left-1/2 top-[43%] -translate-x-1/2">
          <span className="rounded-pill border border-accent-cyan/20 bg-studio-950/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-studio-300">
            Subject Zone
          </span>
        </div>

        {lightingSettings.cameraMarker && (
          <DraggableMarker
            marker={lightingSettings.cameraMarker}
            type="camera"
            cameraFov={cameraFov}
            containerRect={containerRect}
            zoom={zoom}
            snapToGrid={snapToGrid}
            onPositionChange={(x, y) => onMarkerChange("camera", { ...lightingSettings.cameraMarker!, x, y })}
            onRotationChange={(rotation) => onMarkerChange("camera", { ...lightingSettings.cameraMarker!, rotation })}
          />
        )}
        {lightingSettings.subjectMarker && (
          <DraggableMarker
            marker={lightingSettings.subjectMarker}
            type="subject"
            cameraFov={cameraFov}
            containerRect={containerRect}
            zoom={zoom}
            snapToGrid={snapToGrid}
            onPositionChange={(x, y) => onMarkerChange("subject", { ...lightingSettings.subjectMarker!, x, y })}
            onRotationChange={() => {}}
          />
        )}

        {lights.map((light) => {
          const position = resolvedPositions.get(light.id) ?? { x: 0.5, y: 0.5 };
          return (
            <SpatialLightNode
              key={light.id}
              light={light}
              position={position}
              zoom={zoom}
              snapToGrid={snapToGrid}
              isSuggestedPosition={light.spatialX === null || light.spatialY === null}
              isSelected={selectedIds.includes(light.id)}
              dmxStatus={dmxStatus}
              containerRect={containerRect}
              onSelect={() => onSelect(light.id, false)}
              onSelectWithModifier={(additive) => onSelect(light.id, additive)}
              onPositionChange={(x, y) => onPositionChange(light.id, x, y)}
              onIntensityPreview={(intensity) => onIntensityPreview(light.id, intensity)}
              onIntensityCommit={(intensity) => onIntensityCommit(light.id, intensity)}
              onRotationChange={(rotation) => onRotationChange(light.id, rotation)}
              onContextMenu={(x, y) => setContextMenu({ light, x, y })}
            />
          );
        })}
      </div>

      {marqueeStyle && (
        <div
          className="pointer-events-none absolute border border-accent-cyan/50 bg-accent-cyan/10"
          style={{
            left: Math.min(marqueeStyle.left, marqueeStyle.left + marqueeStyle.width),
            top: Math.min(marqueeStyle.top, marqueeStyle.top + marqueeStyle.height),
            width: Math.abs(marqueeStyle.width),
            height: Math.abs(marqueeStyle.height),
          }}
        />
      )}

      {selectedLights.length > 0 && (
        <div className="bg-studio-950/92 absolute bottom-3 left-[23rem] z-30 w-[20rem] rounded-card border border-studio-700/80 p-3 shadow-modal backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-cyan">Selection</div>
              <div className="mt-1 truncate text-xs font-semibold text-studio-50">
                {selectedLights.length === 1
                  ? primarySelectedLight?.name
                  : `${selectedLights.length} fixtures selected`}
              </div>
              <div className="mt-0.5 text-xxs text-studio-400">
                {selectedLights.length === 1 && primarySelectedLight
                  ? `DMX ${primarySelectedLight.dmxStartAddress} • ${primarySelectedLight.on ? `${primarySelectedLight.intensity}%` : "Standby"}`
                  : "Use fit selection or quick actions to refine the current plot focus."}
              </div>
            </div>
            <button
              type="button"
              onClick={onDeselect}
              className="rounded-badge border border-studio-700 bg-studio-850 px-2 py-1 text-xxs font-medium text-studio-300 transition-colors hover:border-studio-600 hover:text-studio-50"
            >
              Clear
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={selectedIds.length === 0}
              onClick={() => fitView(selectedIds)}
              className="rounded-badge border border-studio-700 bg-studio-850 px-2.5 py-1 text-xxs font-medium text-studio-300 transition-colors hover:border-studio-600 hover:text-studio-50 disabled:opacity-50"
            >
              Focus Selection
            </button>
            {primarySelectedLight && selectedLights.length === 1 && (
              <>
                <button
                  type="button"
                  onClick={() => onTogglePower(primarySelectedLight.id)}
                  className={`rounded-badge border px-2.5 py-1 text-xxs font-medium transition-colors ${
                    primarySelectedLight.on
                      ? "bg-accent-blue/12 border-accent-blue/30 text-accent-blue"
                      : "border-studio-700 bg-studio-850 text-studio-300 hover:border-studio-600"
                  }`}
                >
                  {primarySelectedLight.on ? "Power Off" : "Power On"}
                </button>
                <button
                  type="button"
                  onClick={() => onAllOff(primarySelectedLight.id)}
                  className="hover:bg-accent-amber/18 rounded-badge border border-accent-amber/30 bg-accent-amber/10 px-2.5 py-1 text-xxs font-medium text-accent-amber transition-colors"
                >
                  Solo
                </button>
                <button
                  type="button"
                  onClick={openSelectionMenu}
                  className="rounded-badge border border-studio-700 bg-studio-850 px-2.5 py-1 text-xxs font-medium text-studio-300 transition-colors hover:border-studio-600 hover:text-studio-50"
                >
                  Quick Actions
                </button>
              </>
            )}
          </div>
        </div>
      )}

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
