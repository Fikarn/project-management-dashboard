"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Lightbulb } from "lucide-react";
import type { Light, LightingSettings, LightEffect } from "@/lib/types";
import SpatialLightNode from "./SpatialLightNode";

interface DmxStatus {
  connected: boolean;
  reachable: boolean;
  enabled: boolean;
}

interface SpatialCanvasProps {
  lights: Light[];
  lightingSettings: LightingSettings;
  dmxStatus: DmxStatus;
  onSelect: (lightId: string) => void;
  onDeselect: () => void;
  onPositionChange: (lightId: string, x: number, y: number) => void;
  onAddLight: () => void;
}

export default function SpatialCanvas({
  lights,
  lightingSettings,
  dmxStatus,
  onSelect,
  onDeselect,
  onPositionChange,
  onAddLight,
}: SpatialCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

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

  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === containerRef.current) {
        onDeselect();
      }
    },
    [onDeselect]
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
      onClick={handleBackgroundClick}
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
        Drag to arrange &middot; Click to control
      </span>

      {/* Light nodes */}
      {lights.map((light) => (
        <SpatialLightNode
          key={light.id}
          light={light}
          isSelected={light.id === lightingSettings.selectedLightId}
          dmxStatus={dmxStatus}
          containerRect={containerRect}
          onSelect={() => onSelect(light.id)}
          onPositionChange={(x, y) => onPositionChange(light.id, x, y)}
        />
      ))}
    </div>
  );
}
