"use client";

import type { CSSProperties, RefObject } from "react";
import { ChevronDown, Lightbulb } from "lucide-react";
import type { DmxStatus, Light, LightingSettings } from "@/lib/types";
import CompactLightRow from "./CompactLightRow";
import LightCard from "./LightCard";
import SpatialCanvas from "./spatial/SpatialCanvas";
import type { LightingViewMode, LightValueUpdate } from "./types";

interface LightingContentPanelProps {
  contentRef: RefObject<HTMLDivElement>;
  viewMode: LightingViewMode;
  lights: Light[];
  lightingSettings: LightingSettings;
  selectedLightId: string | null;
  selectedIds: string[];
  dmxStatus: DmxStatus | null;
  gridStyle: CSSProperties;
  sortedGroups: { id: string; name: string }[];
  ungroupedLights: Light[];
  collapsedGroups: Set<string>;
  getGroupedLights: (groupId: string) => Light[];
  onToggleGroupCollapsed: (groupId: string) => void;
  onGroupPower: (groupId: string, on: boolean) => void;
  onSelect: (lightId: string) => void;
  onUpdate: (lightId: string, values: LightValueUpdate) => void;
  onDmx: (lightId: string, values: LightValueUpdate) => void;
  onEffect: (lightId: string, effect: Light["effect"]) => void;
  onEditLight: (light: Light) => void;
  onDeleteLight: (light: Light) => void;
  onAddLight: () => void;
  onSpatialSelect: (lightId: string, additive: boolean) => void;
  onSpatialDeselect: () => void;
  onSpatialSelectAll: () => void;
  onMarqueeSelect: (ids: string[]) => void;
  onPositionChange: (lightId: string, x: number, y: number) => void;
  onRotationChange: (lightId: string, rotation: number) => void;
  onMarkerChange: (type: "camera" | "subject", marker: LightingSettings["cameraMarker"]) => void;
}

export default function LightingContentPanel({
  contentRef,
  viewMode,
  lights,
  lightingSettings,
  selectedLightId,
  selectedIds,
  dmxStatus,
  gridStyle,
  sortedGroups,
  ungroupedLights,
  collapsedGroups,
  getGroupedLights,
  onToggleGroupCollapsed,
  onGroupPower,
  onSelect,
  onUpdate,
  onDmx,
  onEffect,
  onEditLight,
  onDeleteLight,
  onAddLight,
  onSpatialSelect,
  onSpatialDeselect,
  onSpatialSelectAll,
  onMarqueeSelect,
  onPositionChange,
  onRotationChange,
  onMarkerChange,
}: LightingContentPanelProps) {
  const effectiveDmxStatus = dmxStatus ?? { connected: false, reachable: false, enabled: false };

  function renderLightCard(light: Light) {
    return viewMode === "compact" ? (
      <CompactLightRow
        key={light.id}
        light={light}
        isSelected={light.id === selectedLightId}
        dmxStatus={effectiveDmxStatus}
        onSelect={() => onSelect(light.id)}
        onUpdate={(values) => onUpdate(light.id, values)}
        onEdit={() => onEditLight(light)}
      />
    ) : (
      <LightCard
        key={light.id}
        light={light}
        isSelected={light.id === selectedLightId}
        dmxStatus={effectiveDmxStatus}
        onSelect={() => onSelect(light.id)}
        onUpdate={(values) => onUpdate(light.id, values)}
        onDmx={(values) => onDmx(light.id, values)}
        onEdit={() => onEditLight(light)}
        onEffect={(effect) => onEffect(light.id, effect)}
        onDelete={() => onDeleteLight(light)}
      />
    );
  }

  if (viewMode === "spatial") {
    return (
      <div ref={contentRef} className="h-full overflow-y-auto pr-1">
        <SpatialCanvas
          lights={lights}
          lightingSettings={lightingSettings}
          selectedIds={selectedIds}
          dmxStatus={effectiveDmxStatus}
          onSelect={onSpatialSelect}
          onDeselect={onSpatialDeselect}
          onSelectAll={onSpatialSelectAll}
          onMarqueeSelect={onMarqueeSelect}
          onPositionChange={onPositionChange}
          onIntensityPreview={(lightId, intensity) => onDmx(lightId, { intensity })}
          onIntensityCommit={(lightId, intensity) => onUpdate(lightId, { intensity })}
          onRotationChange={onRotationChange}
          onTogglePower={(lightId) => {
            const light = lights.find((entry) => entry.id === lightId);
            if (light) onUpdate(lightId, { on: !light.on });
          }}
          onUpdate={onUpdate}
          onAllOff={(exceptId) => {
            lights.forEach((light) => {
              if (light.id !== exceptId && light.on) onUpdate(light.id, { on: false });
            });
            const target = lights.find((light) => light.id === exceptId);
            if (target && !target.on) onUpdate(exceptId, { on: true });
          }}
          onMarkerChange={onMarkerChange}
          onAddLight={onAddLight}
        />
      </div>
    );
  }

  return (
    <div ref={contentRef} className="h-full overflow-y-auto pr-1">
      {lights.length === 0 ? (
        <div className="py-12 text-center text-studio-500">
          <Lightbulb size={48} className="mx-auto mb-3 text-studio-500" aria-hidden="true" />
          <p className="mb-2 text-sm">No lights configured</p>
          <button type="button" onClick={onAddLight} className="text-sm text-accent-blue hover:text-accent-blue/80">
            Add your first light
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedGroups.map((group) => {
            const groupedLights = getGroupedLights(group.id);
            const isEmpty = groupedLights.length === 0;
            const isCollapsed = collapsedGroups.has(group.id);
            const allOn = !isEmpty && groupedLights.every((light) => light.on);
            const someOn = !isEmpty && groupedLights.some((light) => light.on);
            const liveCount = groupedLights.filter((light) => light.on).length;

            return (
              <div key={group.id} className="rounded-card border border-studio-750/50 bg-studio-900/30 p-2.5">
                <div className="mb-2.5 flex items-center gap-2 rounded-badge border border-studio-750/60 bg-studio-950/55 px-2.5 py-1.5">
                  <button
                    type="button"
                    onClick={() => onToggleGroupCollapsed(group.id)}
                    aria-expanded={!isCollapsed}
                    aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${group.name} group`}
                    className="rounded-full bg-studio-800/80 p-0.5 text-studio-400 transition-colors hover:text-studio-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50"
                  >
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                  <span className="min-w-0 truncate text-xxs font-bold uppercase tracking-[0.18em] text-studio-400">
                    {group.name}
                  </span>
                  <span
                    className="rounded-pill bg-studio-800 px-2 py-0.5 text-xxs font-medium text-studio-500"
                    aria-label={`${groupedLights.length} lights`}
                  >
                    {groupedLights.length}
                  </span>
                  {!isEmpty && (
                    <span className="rounded-pill bg-studio-800/80 px-2 py-0.5 text-xxs font-medium text-studio-500">
                      {liveCount} live
                    </span>
                  )}
                  {!isEmpty && (
                    <button
                      type="button"
                      onClick={() => onGroupPower(group.id, !allOn)}
                      aria-label={`Toggle ${group.name} power — currently ${allOn ? "on" : someOn ? "partially on" : "off"}`}
                      className={`ml-auto rounded-badge px-1.5 py-0.5 text-xxs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 ${
                        allOn
                          ? "bg-accent-blue/15 text-accent-blue"
                          : someOn
                            ? "bg-accent-amber/15 text-accent-amber"
                            : "bg-studio-750 text-studio-500"
                      }`}
                    >
                      {allOn ? "ON" : someOn ? "PARTIAL" : "OFF"}
                    </button>
                  )}
                </div>

                {!isCollapsed &&
                  (isEmpty ? (
                    <p className="rounded-badge border border-dashed border-studio-750/60 py-3 text-center text-xs text-studio-500">
                      No lights in this group. Assign lights via the edit button on each light card.
                    </p>
                  ) : viewMode === "compact" ? (
                    <div className="space-y-1">{groupedLights.map(renderLightCard)}</div>
                  ) : (
                    <div className="grid gap-2.5" style={gridStyle}>
                      {groupedLights.map(renderLightCard)}
                    </div>
                  ))}
              </div>
            );
          })}

          {ungroupedLights.length > 0 && (
            <div
              className={
                sortedGroups.length > 0 && ungroupedLights.length < lights.length
                  ? "rounded-card border border-studio-750/50 bg-studio-900/30 p-2.5"
                  : undefined
              }
            >
              {sortedGroups.length > 0 && ungroupedLights.length < lights.length && (
                <div className="mb-2.5 flex items-center gap-2 rounded-badge border border-studio-750/60 bg-studio-950/55 px-2.5 py-1.5">
                  <span className="text-xxs font-bold uppercase tracking-[0.18em] text-studio-500">Ungrouped</span>
                  <span className="rounded-pill bg-studio-800 px-2 py-0.5 text-xxs font-medium text-studio-500">
                    {ungroupedLights.length}
                  </span>
                  <span className="rounded-pill bg-studio-800/80 px-2 py-0.5 text-xxs font-medium text-studio-500">
                    {ungroupedLights.filter((light) => light.on).length} live
                  </span>
                </div>
              )}
              {viewMode === "compact" ? (
                <div className="space-y-1">{ungroupedLights.map(renderLightCard)}</div>
              ) : (
                <div className="grid gap-2.5" style={gridStyle}>
                  {ungroupedLights.map(renderLightCard)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
