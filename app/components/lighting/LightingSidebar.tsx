"use client";

import { Activity, LayoutGrid, List, Map, Plus, Settings } from "lucide-react";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle, useDefaultLayout } from "react-resizable-panels";
import type { Light, LightGroup, LightScene, LightingSettings } from "@/lib/types";
import DmxMonitor from "./DmxMonitor";
import GroupManagementPanel from "./GroupManagementPanel";
import ScenePanel from "./ScenePanel";
import SpatialLightPanel from "./spatial/SpatialLightPanel";
import SpatialMultiPanel from "./spatial/SpatialMultiPanel";
import type { LightingViewMode, LightValueUpdate } from "./types";

interface LightingSidebarProps {
  lights: Light[];
  lightScenes: LightScene[];
  lightingSettings: LightingSettings;
  sortedGroups: LightGroup[];
  viewMode: LightingViewMode;
  showDmxMonitor: boolean;
  groupSaving: boolean;
  spatialSelectedIds: string[];
  onSwitchViewMode: (mode: LightingViewMode) => void;
  onToggleDmxMonitor: () => void;
  onAddLight: () => void;
  onOpenSettings: () => void;
  onUpdate: (lightId: string, values: LightValueUpdate) => void;
  onDmx: (lightId: string, values: LightValueUpdate) => void;
  onEffect: (lightId: string, effect: Light["effect"]) => void;
  onEditLight: (light: Light) => void;
  onDeleteLight: (light: Light) => void;
  onDeselectSpatial: () => void;
  onRequestRenameGroup: (group: LightGroup) => void;
  onRequestDeleteGroup: (group: LightGroup) => void;
  onAddGroup: (name: string) => void;
  getLightCount: (groupId: string) => number;
}

export default function LightingSidebar({
  lights,
  lightScenes,
  lightingSettings,
  sortedGroups,
  viewMode,
  showDmxMonitor,
  groupSaving,
  spatialSelectedIds,
  onSwitchViewMode,
  onToggleDmxMonitor,
  onAddLight,
  onOpenSettings,
  onUpdate,
  onDmx,
  onEffect,
  onEditLight,
  onDeleteLight,
  onDeselectSpatial,
  onRequestRenameGroup,
  onRequestDeleteGroup,
  onAddGroup,
  getLightCount,
}: LightingSidebarProps) {
  const sidebarLayout = useDefaultLayout({
    id: "lighting-sidebar",
    panelIds: ["controls", "scenes", "groups"],
    storage: typeof window !== "undefined" ? localStorage : undefined,
  });

  const selectedLights = lights.filter((light) => spatialSelectedIds.includes(light.id));

  return (
    <Panel id="sidebar" defaultSize="25%" minSize="15%" maxSize="40%">
      <PanelGroup
        orientation="vertical"
        defaultLayout={sidebarLayout.defaultLayout}
        onLayoutChanged={sidebarLayout.onLayoutChanged}
        className="h-full border-l border-studio-700 pl-4"
      >
        <Panel id="controls" defaultSize="30%" minSize="10%">
          <div className="h-full overflow-y-auto pb-2">
            <div className="space-y-3">
              <h3 className="text-xxs font-bold uppercase tracking-widest text-studio-500">Controls</h3>

              <div
                role="tablist"
                aria-label="Lighting layout"
                className="flex items-center rounded-badge border border-studio-700 bg-studio-800"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "expanded"}
                  aria-label="Grid view"
                  onClick={() => onSwitchViewMode("expanded")}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-l-badge px-2 py-2 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 ${
                    viewMode === "expanded"
                      ? "bg-accent-cyan/15 text-accent-cyan"
                      : "text-studio-500 hover:text-studio-200"
                  }`}
                >
                  <LayoutGrid size={13} aria-hidden="true" />
                  Grid
                </button>
                <div className="h-5 w-px bg-studio-700" aria-hidden="true" />
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "compact"}
                  aria-label="List view"
                  onClick={() => onSwitchViewMode("compact")}
                  className={`flex flex-1 items-center justify-center gap-1 px-2 py-2 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 ${
                    viewMode === "compact"
                      ? "bg-accent-cyan/15 text-accent-cyan"
                      : "text-studio-500 hover:text-studio-200"
                  }`}
                >
                  <List size={13} aria-hidden="true" />
                  List
                </button>
                <div className="h-5 w-px bg-studio-700" aria-hidden="true" />
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "spatial"}
                  aria-label="Studio layout view"
                  onClick={() => onSwitchViewMode("spatial")}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-r-badge px-2 py-2 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 ${
                    viewMode === "spatial"
                      ? "bg-accent-cyan/15 text-accent-cyan"
                      : "text-studio-500 hover:text-studio-200"
                  }`}
                >
                  <Map size={13} aria-hidden="true" />
                  Studio
                </button>
              </div>

              <button
                type="button"
                onClick={onToggleDmxMonitor}
                className={`flex w-full items-center justify-center gap-1.5 rounded-badge border px-3 py-2 text-xs transition-colors ${
                  showDmxMonitor
                    ? "border-accent-cyan/30 bg-accent-cyan/15 text-accent-cyan"
                    : "border-studio-700 bg-studio-800 text-studio-500 hover:text-studio-200"
                }`}
                title={showDmxMonitor ? "Hide DMX monitor" : "Show DMX monitor"}
              >
                <Activity size={14} aria-hidden="true" />
                DMX Monitor
              </button>

              <button
                type="button"
                onClick={onAddLight}
                className="flex w-full items-center justify-center gap-1.5 rounded-badge bg-accent-blue/10 px-3 py-2 text-xs font-medium text-accent-blue transition-colors hover:bg-accent-blue/20"
              >
                <Plus size={12} aria-hidden="true" />
                Add Light
              </button>

              <button
                type="button"
                onClick={onOpenSettings}
                className="flex w-full items-center justify-center gap-1.5 rounded-badge border border-studio-700 bg-studio-800 px-3 py-2 text-xs text-studio-400 transition-colors hover:text-studio-200"
                title="Lighting settings"
              >
                <Settings size={14} aria-hidden="true" />
                Settings
              </button>
            </div>

            {viewMode === "spatial" && selectedLights.length > 0 && (
              <div className="mb-4">
                {selectedLights.length > 1 ? (
                  <SpatialMultiPanel
                    lights={selectedLights}
                    onUpdate={(values) => {
                      selectedLights.forEach((light) => onUpdate(light.id, values));
                    }}
                    onDmx={(values) => {
                      selectedLights.forEach((light) => onDmx(light.id, values));
                    }}
                    onDeselect={onDeselectSpatial}
                  />
                ) : (
                  <SpatialLightPanel
                    light={selectedLights[0]}
                    onUpdate={(values) => onUpdate(selectedLights[0].id, values)}
                    onDmx={(values) => onDmx(selectedLights[0].id, values)}
                    onEdit={() => onEditLight(selectedLights[0])}
                    onDelete={() => onDeleteLight(selectedLights[0])}
                    onEffect={(effect) => onEffect(selectedLights[0].id, effect)}
                    onDeselect={onDeselectSpatial}
                  />
                )}
              </div>
            )}
          </div>
        </Panel>

        <PanelResizeHandle className="lighting-resize-handle-v" style={{ flexBasis: 8 }} />

        <Panel id="scenes" defaultSize="35%" minSize="10%">
          <div className="h-full overflow-y-auto py-1">
            <ScenePanel scenes={lightScenes} selectedSceneId={lightingSettings.selectedSceneId} />
          </div>
        </Panel>

        <PanelResizeHandle className="lighting-resize-handle-v" style={{ flexBasis: 8 }} />

        <Panel id="groups" defaultSize="35%" minSize="10%">
          <div className="h-full space-y-4 overflow-y-auto py-1">
            <GroupManagementPanel
              groups={sortedGroups}
              getLightCount={getLightCount}
              onRenameGroup={onRequestRenameGroup}
              onDeleteGroup={onRequestDeleteGroup}
              onAddGroup={onAddGroup}
              saving={groupSaving}
            />
            {showDmxMonitor && <DmxMonitor />}
          </div>
        </Panel>
      </PanelGroup>
    </Panel>
  );
}
