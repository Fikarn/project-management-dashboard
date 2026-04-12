"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { ChevronDown, Settings, Plus, LayoutGrid, List, Activity, Lightbulb, Map } from "lucide-react";
import type { Light, LightGroup, LightScene, LightingSettings, LightEffect, ColorMode } from "@/lib/types";
import LightCard from "./LightCard";
import CompactLightRow from "./CompactLightRow";
import ScenePanel from "./ScenePanel";
import DmxMonitor from "./DmxMonitor";
import LightConfigModal from "./LightConfigModal";
import LightingSettingsModal from "./LightingSettingsModal";
import LightingToolbar from "./LightingToolbar";
import GroupManagementPanel from "./GroupManagementPanel";
import ConfirmDialog from "../shared/ConfirmDialog";
import Modal from "../shared/Modal";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle, useDefaultLayout } from "react-resizable-panels";
import SpatialCanvas from "./spatial/SpatialCanvas";
import SpatialLightPanel from "./spatial/SpatialLightPanel";
import SpatialMultiPanel from "./spatial/SpatialMultiPanel";
import { useToast } from "../shared/ToastContext";
import { lightsApi, groupsApi } from "@/lib/client-api";
import { useDmxPolling } from "./hooks/useDmxPolling";

interface LightingViewProps {
  lights: Light[];
  lightGroups: LightGroup[];
  lightScenes: LightScene[];
  lightingSettings: LightingSettings;
  onDataChange: () => void;
}

type ModalState =
  | { type: "none" }
  | { type: "addLight" }
  | { type: "editLight"; light: Light }
  | { type: "deleteLight"; light: Light }
  | { type: "settings" }
  | { type: "renameGroup"; group: LightGroup }
  | { type: "deleteGroup"; group: LightGroup };

export default function LightingView({
  lights,
  lightGroups,
  lightScenes,
  lightingSettings,
  onDataChange,
}: LightingViewProps) {
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [gmLocal, setGmLocal] = useState<number | null>(null);
  type LightingViewMode = "expanded" | "compact" | "spatial";
  const [viewMode, setViewMode] = useState<LightingViewMode>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("lightingViewMode");
      if (stored === "compact" || stored === "spatial") return stored;
      if (localStorage.getItem("lightingViewCompact") === "1") return "compact";
    }
    return "expanded";
  });
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showDmxMonitor, setShowDmxMonitor] = useState(false);
  const [groupSaving, setGroupSaving] = useState(false);
  const [renameGroupName, setRenameGroupName] = useState("");
  const [spatialSelectedIds, setSpatialSelectedIds] = useState<string[]>([]);
  const gmRafRef = useRef<number | null>(null);
  const dmxErrorToastRef = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(800);
  const toast = useToast();
  const sorted = [...lights].sort((a, b) => a.order - b.order);

  const { dmxStatus, showDmxHint, dismissHint } = useDmxPolling({
    dmxEnabled: lightingSettings.dmxEnabled,
    apolloBridgeIp: lightingSettings.apolloBridgeIp,
  });

  const gmValue = gmLocal ?? lightingSettings.grandMaster ?? 100;

  // One-time cleanup of stale panel layouts from pixel-based sizing bug
  useEffect(() => {
    const key = "lighting-panels-v2";
    if (typeof window !== "undefined" && !localStorage.getItem(key)) {
      localStorage.removeItem("react-resizable-panels:lighting-layout");
      localStorage.removeItem("react-resizable-panels:lighting-sidebar");
      localStorage.setItem(key, "1");
    }
  }, []);

  const horizontalLayout = useDefaultLayout({
    id: "lighting-layout",
    panelIds: ["content", "sidebar"],
    storage: typeof window !== "undefined" ? localStorage : undefined,
  });

  const sidebarLayout = useDefaultLayout({
    id: "lighting-sidebar",
    panelIds: ["controls", "scenes", "groups"],
    storage: typeof window !== "undefined" ? localStorage : undefined,
  });

  const handleGmDrag = useCallback((val: number) => {
    setGmLocal(val);
    if (gmRafRef.current) cancelAnimationFrame(gmRafRef.current);
    gmRafRef.current = requestAnimationFrame(() => {
      gmRafRef.current = null;
      lightsApi.updateSettings({ grandMaster: val }).catch(() => {});
    });
  }, []);

  const handleGmRelease = useCallback(
    (val: number) => {
      setGmLocal(null);
      lightsApi.updateSettings({ grandMaster: val }).catch(() => toast("error", "Failed to save grand master"));
    },
    [toast]
  );

  const switchViewMode = useCallback((mode: LightingViewMode) => {
    setViewMode(mode);
    localStorage.setItem("lightingViewMode", mode);
  }, []);

  const toggleGroupCollapsed = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  // Track content panel width for dynamic grid columns
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setContentWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const gridCols = useMemo(() => (contentWidth >= 900 ? 3 : contentWidth >= 550 ? 2 : 1), [contentWidth]);
  const gridStyle = useMemo(() => ({ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }), [gridCols]);

  // ── Light action handlers ──────────────────────────────
  const handleSelect = useCallback(async (lightId: string) => {
    try {
      await lightsApi.updateSettings({ selectedLightId: lightId });
    } catch {
      // Non-critical — selection is cosmetic
    }
  }, []);

  const handleUpdate = useCallback(
    async (
      lightId: string,
      values: {
        intensity?: number;
        cct?: number;
        on?: boolean;
        red?: number;
        green?: number;
        blue?: number;
        colorMode?: ColorMode;
        gmTint?: number | null;
      }
    ) => {
      try {
        await lightsApi.updateValue(lightId, values);
      } catch {
        toast("error", "Failed to save light value");
      }
    },
    [toast]
  );

  const handleDmx = useCallback(
    async (
      lightId: string,
      values: {
        intensity?: number;
        cct?: number;
        on?: boolean;
        red?: number;
        green?: number;
        blue?: number;
        colorMode?: ColorMode;
        gmTint?: number | null;
      }
    ) => {
      try {
        await lightsApi.sendDmx({ lightId, ...values });
      } catch (err) {
        console.error("DMX send failed:", err);
        if (!dmxErrorToastRef.current) {
          toast("error", "DMX send failed \u2014 check lighting settings");
          dmxErrorToastRef.current = true;
          setTimeout(() => {
            dmxErrorToastRef.current = false;
          }, 5000);
        }
      }
    },
    [toast]
  );

  const handleEffect = useCallback(
    async (lightId: string, effect: LightEffect | null) => {
      try {
        await lightsApi.setEffect(lightId, effect);
      } catch {
        toast("error", "Failed to set effect");
      }
    },
    [toast]
  );

  const [allLoading, setAllLoading] = useState(false);

  async function handleAllOn() {
    setAllLoading(true);
    try {
      await lightsApi.setAll(true);
    } catch {
      toast("error", "Failed to turn on all lights");
    }
    setAllLoading(false);
  }

  async function handleAllOff() {
    setAllLoading(true);
    try {
      await lightsApi.setAll(false);
    } catch {
      toast("error", "Failed to turn off all lights");
    }
    setAllLoading(false);
  }

  async function handleDeleteLight(light: Light) {
    try {
      await lightsApi.delete(light.id);
      toast("success", `Deleted "${light.name}"`);
    } catch {
      toast("error", "Failed to delete light");
    }
    setModal({ type: "none" });
  }

  // ── Group handlers ──────────────────────────────
  async function handleAddGroup(name: string) {
    setGroupSaving(true);
    try {
      await groupsApi.create(name);
      toast("success", `Group "${name}" created`);
      onDataChange();
    } catch {
      toast("error", "Failed to create group");
    }
    setGroupSaving(false);
  }

  async function handleRenameGroup(group: LightGroup) {
    const name = renameGroupName.trim();
    if (!name) return;
    setGroupSaving(true);
    try {
      await groupsApi.rename(group.id, name);
      toast("success", `Renamed to "${name}"`);
      onDataChange();
    } catch {
      toast("error", "Failed to rename group");
    }
    setGroupSaving(false);
    setModal({ type: "none" });
  }

  async function handleDeleteGroup(group: LightGroup) {
    try {
      await groupsApi.delete(group.id);
      toast("success", `Deleted group "${group.name}"`);
      onDataChange();
    } catch {
      toast("error", "Failed to delete group");
    }
    setModal({ type: "none" });
  }

  async function handleGroupPower(groupId: string, on: boolean) {
    try {
      await groupsApi.setPower(groupId, on);
    } catch {
      toast("error", "Failed to update group");
    }
  }

  const handlePositionChange = useCallback(
    async (lightId: string, x: number, y: number) => {
      try {
        await lightsApi.update(lightId, { spatialX: x, spatialY: y });
      } catch {
        toast("error", "Failed to save position");
      }
    },
    [toast]
  );

  const handleDeselect = useCallback(async () => {
    try {
      await lightsApi.updateSettings({ selectedLightId: null });
    } catch {
      // Non-critical
    }
  }, []);

  // ── Spatial multi-select ──────────────────────────────
  const handleSpatialSelect = useCallback(
    async (lightId: string, additive: boolean) => {
      if (additive) {
        setSpatialSelectedIds((prev) =>
          prev.includes(lightId) ? prev.filter((id) => id !== lightId) : [...prev, lightId]
        );
      } else {
        setSpatialSelectedIds([lightId]);
      }
      handleSelect(lightId);
    },
    [handleSelect]
  );

  const handleSpatialDeselect = useCallback(async () => {
    setSpatialSelectedIds([]);
    handleDeselect();
  }, [handleDeselect]);

  const handleSpatialSelectAll = useCallback(() => {
    setSpatialSelectedIds(sorted.map((l) => l.id));
  }, [sorted]);

  // ── Organize lights by group ──────────────────────────────
  const sortedGroups = [...lightGroups].sort((a, b) => a.order - b.order);
  const ungroupedLights = sorted.filter((l) => !l.groupId);
  const groupedLights = (groupId: string) => sorted.filter((l) => l.groupId === groupId);

  function renderLightCard(light: Light) {
    return viewMode === "compact" ? (
      <CompactLightRow
        key={light.id}
        light={light}
        isSelected={light.id === lightingSettings.selectedLightId}
        dmxStatus={dmxStatus}
        onSelect={() => handleSelect(light.id)}
        onUpdate={(values) => handleUpdate(light.id, values)}
        onEdit={() => setModal({ type: "editLight", light })}
      />
    ) : (
      <LightCard
        key={light.id}
        light={light}
        isSelected={light.id === lightingSettings.selectedLightId}
        dmxStatus={dmxStatus}
        onSelect={() => handleSelect(light.id)}
        onUpdate={(values) => handleUpdate(light.id, values)}
        onDmx={(values) => handleDmx(light.id, values)}
        onEdit={() => setModal({ type: "editLight", light })}
        onEffect={(effect) => handleEffect(light.id, effect)}
        onDelete={() => setModal({ type: "deleteLight", light })}
      />
    );
  }

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col">
      <LightingToolbar
        allLoading={allLoading}
        onAllOn={handleAllOn}
        onAllOff={handleAllOff}
        gmValue={gmValue}
        onGmDrag={handleGmDrag}
        onGmRelease={handleGmRelease}
        dmxStatus={dmxStatus}
        showDmxHint={showDmxHint}
        onDismissHint={dismissHint}
      />

      {/* Main layout: lights grid + sidebar */}
      <PanelGroup
        orientation="horizontal"
        defaultLayout={horizontalLayout.defaultLayout}
        onLayoutChanged={horizontalLayout.onLayoutChanged}
        className="min-h-0 flex-1"
      >
        {/* Content area */}
        <Panel id="content" defaultSize="75%" minSize="40%">
          <div ref={contentRef} className="h-full overflow-y-auto pr-2">
            {viewMode === "spatial" ? (
              <SpatialCanvas
                lights={sorted}
                lightingSettings={lightingSettings}
                selectedIds={spatialSelectedIds}
                dmxStatus={dmxStatus}
                onSelect={handleSpatialSelect}
                onDeselect={handleSpatialDeselect}
                onSelectAll={handleSpatialSelectAll}
                onMarqueeSelect={(ids) => setSpatialSelectedIds(ids)}
                onPositionChange={handlePositionChange}
                onIntensityChange={(lightId, intensity) => {
                  handleDmx(lightId, { intensity });
                  handleUpdate(lightId, { intensity });
                }}
                onRotationChange={(lightId, rotation) => {
                  lightsApi
                    .update(lightId, { spatialRotation: rotation })
                    .catch(() => toast("error", "Failed to save rotation"));
                }}
                onTogglePower={(lightId) => {
                  const light = lights.find((l) => l.id === lightId);
                  if (light) handleUpdate(lightId, { on: !light.on });
                }}
                onUpdate={(lightId, values) => handleUpdate(lightId, values)}
                onAllOff={(exceptId) => {
                  lights.forEach((l) => {
                    if (l.id !== exceptId && l.on) handleUpdate(l.id, { on: false });
                  });
                  const target = lights.find((l) => l.id === exceptId);
                  if (target && !target.on) handleUpdate(exceptId, { on: true });
                }}
                onMarkerChange={(type, marker) => {
                  const key = type === "camera" ? "cameraMarker" : "subjectMarker";
                  lightsApi
                    .updateSettings({ [key]: marker })
                    .catch(() => toast("error", "Failed to save marker position"));
                }}
                onAddLight={() => setModal({ type: "addLight" })}
              />
            ) : sorted.length === 0 ? (
              <div className="py-12 text-center text-studio-500">
                <Lightbulb size={48} className="mx-auto mb-3 text-studio-500" aria-hidden="true" />
                <p className="mb-2 text-sm">No lights configured</p>
                <button
                  onClick={() => setModal({ type: "addLight" })}
                  className="text-sm text-accent-blue hover:text-accent-blue/80"
                >
                  Add your first light
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Grouped lights */}
                {sortedGroups.map((group) => {
                  const gl = groupedLights(group.id);
                  const isEmpty = gl.length === 0;
                  const isCollapsed = collapsedGroups.has(group.id);
                  const allOn = !isEmpty && gl.every((l) => l.on);
                  const someOn = !isEmpty && gl.some((l) => l.on);

                  return (
                    <div key={group.id}>
                      <div className="mb-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleGroupCollapsed(group.id)}
                          aria-expanded={!isCollapsed}
                          aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${group.name} group`}
                          className="text-studio-400 transition-colors hover:text-studio-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50"
                        >
                          <ChevronDown
                            size={14}
                            className={`transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                            aria-hidden="true"
                          />
                        </button>
                        <span className="text-xxs font-bold uppercase tracking-widest text-studio-400">
                          {group.name}
                        </span>
                        <span
                          className="rounded-pill bg-studio-800 px-2 py-0.5 text-xxs font-medium text-studio-500"
                          aria-label={`${gl.length} lights`}
                        >
                          {gl.length}
                        </span>
                        {!isEmpty && (
                          <button
                            type="button"
                            onClick={() => handleGroupPower(group.id, !allOn)}
                            aria-label={`Toggle ${group.name} power — currently ${allOn ? "on" : someOn ? "partially on" : "off"}`}
                            className={`ml-1 rounded-badge px-1.5 py-0.5 text-xxs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 ${
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
                          <p className="mb-2 py-3 text-center text-xs text-studio-500">
                            No lights in this group. Assign lights via the edit button on each light card.
                          </p>
                        ) : viewMode === "compact" ? (
                          <div className="space-y-1">{gl.map(renderLightCard)}</div>
                        ) : (
                          <div className="grid gap-3" style={gridStyle}>
                            {gl.map(renderLightCard)}
                          </div>
                        ))}
                    </div>
                  );
                })}

                {/* Ungrouped lights */}
                {ungroupedLights.length > 0 && (
                  <div>
                    {sortedGroups.length > 0 && ungroupedLights.length < sorted.length && (
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-xxs font-bold uppercase tracking-widest text-studio-500">Ungrouped</span>
                        <span className="rounded-pill bg-studio-800 px-2 py-0.5 text-xxs font-medium text-studio-500">
                          {ungroupedLights.length}
                        </span>
                      </div>
                    )}
                    {viewMode === "compact" ? (
                      <div className="space-y-1">{ungroupedLights.map(renderLightCard)}</div>
                    ) : (
                      <div className="grid gap-3" style={gridStyle}>
                        {ungroupedLights.map(renderLightCard)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </Panel>

        <PanelResizeHandle className="lighting-resize-handle-h" style={{ flexBasis: 8 }} />

        {/* Sidebar */}
        <Panel id="sidebar" defaultSize="25%" minSize="15%" maxSize="40%">
          <PanelGroup
            orientation="vertical"
            defaultLayout={sidebarLayout.defaultLayout}
            onLayoutChanged={sidebarLayout.onLayoutChanged}
            className="h-full border-l border-studio-700 pl-4"
          >
            {/* Controls panel */}
            <Panel id="controls" defaultSize="30%" minSize="10%">
              <div className="h-full overflow-y-auto pb-2">
                <div className="space-y-3">
                  <h3 className="text-xxs font-bold uppercase tracking-widest text-studio-500">Controls</h3>

                  {/* View toggles */}
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
                      onClick={() => switchViewMode("expanded")}
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
                      onClick={() => switchViewMode("compact")}
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
                      onClick={() => switchViewMode("spatial")}
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

                  {/* DMX monitor toggle */}
                  <button
                    onClick={() => setShowDmxMonitor((v) => !v)}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-badge border px-3 py-2 text-xs transition-colors ${
                      showDmxMonitor
                        ? "border-accent-cyan/30 bg-accent-cyan/15 text-accent-cyan"
                        : "border-studio-700 bg-studio-800 text-studio-500 hover:text-studio-200"
                    }`}
                    title={showDmxMonitor ? "Hide DMX monitor" : "Show DMX monitor"}
                  >
                    <Activity size={14} />
                    DMX Monitor
                  </button>

                  {/* Add Light */}
                  <button
                    onClick={() => setModal({ type: "addLight" })}
                    className="flex w-full items-center justify-center gap-1.5 rounded-badge bg-accent-blue/10 px-3 py-2 text-xs font-medium text-accent-blue transition-colors hover:bg-accent-blue/20"
                  >
                    <Plus size={12} />
                    Add Light
                  </button>

                  {/* Settings */}
                  <button
                    onClick={() => setModal({ type: "settings" })}
                    className="flex w-full items-center justify-center gap-1.5 rounded-badge border border-studio-700 bg-studio-800 px-3 py-2 text-xs text-studio-400 transition-colors hover:text-studio-200"
                    title="Lighting settings"
                  >
                    <Settings size={14} />
                    Settings
                  </button>
                </div>

                {/* Spatial light controls */}
                {viewMode === "spatial" &&
                  spatialSelectedIds.length > 0 &&
                  (() => {
                    const selectedLights = lights.filter((l) => spatialSelectedIds.includes(l.id));
                    if (selectedLights.length === 0) return null;

                    if (selectedLights.length > 1) {
                      return (
                        <div className="mb-4">
                          <SpatialMultiPanel
                            lights={selectedLights}
                            onUpdate={(values) => {
                              selectedLights.forEach((l) => handleUpdate(l.id, values));
                            }}
                            onDmx={(values) => {
                              selectedLights.forEach((l) => handleDmx(l.id, values));
                            }}
                            onDeselect={handleSpatialDeselect}
                          />
                        </div>
                      );
                    }

                    const selectedLight = selectedLights[0];
                    return (
                      <div className="mb-4">
                        <SpatialLightPanel
                          light={selectedLight}
                          onUpdate={(values) => handleUpdate(selectedLight.id, values)}
                          onDmx={(values) => handleDmx(selectedLight.id, values)}
                          onEdit={() => setModal({ type: "editLight", light: selectedLight })}
                          onDelete={() => setModal({ type: "deleteLight", light: selectedLight })}
                          onEffect={(effect) => handleEffect(selectedLight.id, effect)}
                          onDeselect={handleSpatialDeselect}
                        />
                      </div>
                    );
                  })()}
              </div>
            </Panel>

            <PanelResizeHandle className="lighting-resize-handle-v" style={{ flexBasis: 8 }} />

            {/* Scenes panel */}
            <Panel id="scenes" defaultSize="35%" minSize="10%">
              <div className="h-full overflow-y-auto py-1">
                <ScenePanel scenes={lightScenes} selectedSceneId={lightingSettings.selectedSceneId} />
              </div>
            </Panel>

            <PanelResizeHandle className="lighting-resize-handle-v" style={{ flexBasis: 8 }} />

            {/* Groups + DMX Monitor panel */}
            <Panel id="groups" defaultSize="35%" minSize="10%">
              <div className="h-full space-y-4 overflow-y-auto py-1">
                <GroupManagementPanel
                  groups={sortedGroups}
                  getLightCount={(groupId) => groupedLights(groupId).length}
                  onRenameGroup={(group) => {
                    setRenameGroupName(group.name);
                    setModal({ type: "renameGroup", group });
                  }}
                  onDeleteGroup={(group) => setModal({ type: "deleteGroup", group })}
                  onAddGroup={handleAddGroup}
                  saving={groupSaving}
                />
                {showDmxMonitor && <DmxMonitor />}
              </div>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>

      {/* Modals */}
      {(modal.type === "addLight" || modal.type === "editLight") && (
        <LightConfigModal
          light={modal.type === "editLight" ? modal.light : undefined}
          groups={lightGroups}
          onClose={() => setModal({ type: "none" })}
          onSaved={onDataChange}
        />
      )}

      {modal.type === "deleteLight" && (
        <ConfirmDialog
          title="Delete Light"
          message={`Delete "${modal.light.name}"? This cannot be undone.`}
          onConfirm={() => handleDeleteLight(modal.light)}
          onCancel={() => setModal({ type: "none" })}
        />
      )}

      {modal.type === "deleteGroup" && (
        <ConfirmDialog
          title="Delete Group"
          message={`Delete group "${modal.group.name}"? Lights will be moved to ungrouped.`}
          onConfirm={() => handleDeleteGroup(modal.group)}
          onCancel={() => setModal({ type: "none" })}
        />
      )}

      {modal.type === "renameGroup" && (
        <Modal onClose={() => setModal({ type: "none" })} ariaLabel="Rename Group">
          <div
            className="w-full max-w-xs animate-scale-in rounded-card border border-studio-700 bg-studio-850 p-4 shadow-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-sm font-semibold text-studio-100">Rename Group</h3>
            <input
              type="text"
              value={renameGroupName}
              onChange={(e) => setRenameGroupName(e.target.value)}
              className="mb-3"
              placeholder='e.g., "Key Lights"'
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameGroup(modal.group);
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModal({ type: "none" })}
                className="rounded-badge bg-studio-700 px-3 py-1.5 text-xs text-studio-300 transition-colors hover:bg-studio-600"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRenameGroup(modal.group)}
                disabled={groupSaving || !renameGroupName.trim()}
                className="rounded-badge bg-accent-blue px-3 py-1.5 text-xs font-medium text-studio-950 transition-colors hover:bg-accent-blue/80 disabled:opacity-50"
              >
                {groupSaving ? "..." : "Rename"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal.type === "settings" && (
        <LightingSettingsModal
          lightingSettings={lightingSettings}
          lights={lights}
          onClose={() => setModal({ type: "none" })}
        />
      )}
    </div>
  );
}
