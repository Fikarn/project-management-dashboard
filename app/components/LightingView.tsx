"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ChevronDown, Pencil, X, Settings, Plus, LayoutGrid, List, Activity, Lightbulb, Settings2 } from "lucide-react";
import type { Light, LightGroup, LightScene, LightingSettings, LightEffect, ColorMode } from "@/lib/types";
import LightCard from "./LightCard";
import ScenePanel from "./ScenePanel";
import DmxMonitor from "./DmxMonitor";
import LightConfigModal from "./LightConfigModal";
import LightingSettingsModal from "./LightingSettingsModal";
import ConfirmDialog from "./ConfirmDialog";
import Modal from "./Modal";
import { useToast } from "./ToastContext";

interface DmxStatus {
  connected: boolean;
  reachable: boolean;
  enabled: boolean;
}

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
  | { type: "addGroup" }
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
  const [dmxStatus, setDmxStatus] = useState<DmxStatus>({ connected: false, reachable: false, enabled: false });
  const [showDmxHint, setShowDmxHint] = useState(false);
  const [gmLocal, setGmLocal] = useState<number | null>(null);
  const [compact, setCompact] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("lightingViewCompact") === "1";
    return false;
  });
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showDmxMonitor, setShowDmxMonitor] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupSaving, setGroupSaving] = useState(false);
  const gmRafRef = useRef<number | null>(null);
  const toast = useToast();
  const sorted = [...lights].sort((a, b) => a.order - b.order);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const gmValue = gmLocal ?? lightingSettings.grandMaster ?? 100;

  const handleGmDrag = useCallback((val: number) => {
    setGmLocal(val);
    if (gmRafRef.current) cancelAnimationFrame(gmRafRef.current);
    gmRafRef.current = requestAnimationFrame(() => {
      gmRafRef.current = null;
      fetch("/api/lights/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grandMaster: val }),
      }).catch(() => {});
    });
  }, []);

  const handleGmRelease = useCallback((val: number) => {
    setGmLocal(null);
    fetch("/api/lights/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grandMaster: val }),
    }).catch(() => {});
  }, []);

  const toggleCompact = useCallback(() => {
    setCompact((prev) => {
      const next = !prev;
      localStorage.setItem("lightingViewCompact", next ? "1" : "0");
      return next;
    });
  }, []);

  const toggleGroupCollapsed = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  // Show DMX status hint on first visit
  useEffect(() => {
    if (!localStorage.getItem("hasSeenLightingHint")) {
      setShowDmxHint(true);
      hintTimerRef.current = setTimeout(() => {
        setShowDmxHint(false);
        localStorage.setItem("hasSeenLightingHint", "1");
      }, 8000);
    }
    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  }, []);

  // Auto-initialize DMX sender and sync light values on mount
  useEffect(() => {
    const controller = new AbortController();
    async function initLights() {
      try {
        const res = await fetch("/api/lights/init", {
          method: "POST",
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const data = await res.json();
        if (controller.signal.aborted) return;
        setDmxStatus({ connected: data.initialized, reachable: data.reachable, enabled: data.enabled });
      } catch {
        // ignore — aborted or network error
      }
    }
    initLights();
    return () => controller.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const controller = new AbortController();

    async function fetchStatus() {
      try {
        const res = await fetch("/api/lights/status", { signal: controller.signal });
        if (controller.signal.aborted) return;
        const data = await res.json();
        if (controller.signal.aborted) return;
        setDmxStatus({ connected: data.connected, reachable: data.reachable, enabled: data.enabled });
      } catch {
        // ignore — aborted or network error
      }
    }
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 10000);
    return () => {
      controller.abort();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [lightingSettings.dmxEnabled, lightingSettings.apolloBridgeIp]);

  const handleSelect = useCallback(async (lightId: string) => {
    try {
      await fetch("/api/lights/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedLightId: lightId }),
      });
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
        await fetch(`/api/lights/${lightId}/value`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
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
        await fetch("/api/lights/dmx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lightId, ...values }),
        });
      } catch (err) {
        console.error("DMX send failed:", err);
      }
    },
    []
  );

  const handleEffect = useCallback(
    async (lightId: string, effect: LightEffect | null) => {
      try {
        await fetch(`/api/lights/${lightId}/effect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ effect }),
        });
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
      await fetch("/api/lights/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on: true }),
      });
    } catch {
      toast("error", "Failed to turn on all lights");
    }
    setAllLoading(false);
  }

  async function handleAllOff() {
    setAllLoading(true);
    try {
      await fetch("/api/lights/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on: false }),
      });
    } catch {
      toast("error", "Failed to turn off all lights");
    }
    setAllLoading(false);
  }

  async function handleDeleteLight(light: Light) {
    try {
      await fetch(`/api/lights/${light.id}`, { method: "DELETE" });
      toast("success", `Deleted "${light.name}"`);
    } catch {
      toast("error", "Failed to delete light");
    }
    setModal({ type: "none" });
  }

  // Group actions
  async function handleAddGroup() {
    const name = groupName.trim();
    if (!name) return;
    setGroupSaving(true);
    try {
      await fetch("/api/lights/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setGroupName("");
      toast("success", `Group "${name}" created`);
      onDataChange();
    } catch {
      toast("error", "Failed to create group");
    }
    setGroupSaving(false);
    setModal({ type: "none" });
  }

  async function handleRenameGroup(group: LightGroup) {
    const name = groupName.trim();
    if (!name) return;
    setGroupSaving(true);
    try {
      await fetch(`/api/lights/groups/${group.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
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
      await fetch(`/api/lights/groups/${group.id}`, { method: "DELETE" });
      toast("success", `Deleted group "${group.name}"`);
      onDataChange();
    } catch {
      toast("error", "Failed to delete group");
    }
    setModal({ type: "none" });
  }

  async function handleGroupPower(groupId: string, on: boolean) {
    try {
      await fetch(`/api/lights/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on }),
      });
    } catch {
      toast("error", "Failed to update group");
    }
  }

  // Organize lights by group
  const sortedGroups = [...lightGroups].sort((a, b) => a.order - b.order);
  const ungroupedLights = sorted.filter((l) => !l.groupId);
  const groupedLights = (groupId: string) => sorted.filter((l) => l.groupId === groupId);

  function renderLightCard(light: Light) {
    return compact ? (
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
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex items-center">
        {/* Left: Light controls */}
        <div className="flex items-center gap-3">
          {/* All On / All Off */}
          <div className="flex rounded-badge border border-studio-700 bg-studio-800">
            <button
              onClick={handleAllOn}
              disabled={allLoading}
              className="rounded-l-badge px-3 py-1.5 text-xs text-studio-300 transition-colors hover:text-studio-100 disabled:opacity-50"
            >
              All On
            </button>
            <div className="w-px bg-studio-700" />
            <button
              onClick={handleAllOff}
              disabled={allLoading}
              className="rounded-r-badge px-3 py-1.5 text-xs text-studio-300 transition-colors hover:text-studio-100 disabled:opacity-50"
            >
              All Off
            </button>
          </div>

          {/* Grand Master fader */}
          <div className="flex items-center gap-2 rounded-card border border-studio-700 bg-studio-800/80 px-4 py-2">
            <span className="text-micro font-bold uppercase tracking-widest text-studio-500">GM</span>
            <input
              type="range"
              min="0"
              max="100"
              value={gmValue}
              onChange={(e) => handleGmDrag(Number(e.target.value))}
              onMouseUp={(e) => handleGmRelease(Number((e.target as HTMLInputElement).value))}
              onTouchEnd={(e) => handleGmRelease(Number((e.target as HTMLInputElement).value))}
              className="light-slider w-28"
              style={{
                background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${gmValue}%, #242430 ${gmValue}%, #242430 100%)`,
              }}
            />
            <span
              className={`min-w-[2.2rem] text-right font-mono text-xs tabular-nums ${
                gmValue < 100 ? "text-accent-amber" : "text-studio-400"
              }`}
            >
              {gmValue}%
            </span>
          </div>

          {/* DMX status */}
          <div className="relative flex items-center gap-1.5 text-xs text-studio-500">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                !dmxStatus.enabled ? "bg-studio-600" : dmxStatus.reachable ? "bg-accent-green" : "bg-accent-red"
              }`}
            />
            {!dmxStatus.enabled ? "DMX Off" : dmxStatus.reachable ? "Bridge Connected" : "Bridge Unreachable"}
            {showDmxHint && (
              <button
                onClick={() => {
                  setShowDmxHint(false);
                  localStorage.setItem("hasSeenLightingHint", "1");
                }}
                className="absolute left-0 top-6 z-10 w-56 rounded-card border border-studio-600 bg-studio-800 p-2 text-left text-xs text-studio-300 shadow-modal"
              >
                <span className="font-medium text-studio-200">Status indicator:</span> Green = connected, Red =
                unreachable, Gray = disabled
                <span className="ml-1 text-studio-500">(click to dismiss)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main layout: lights grid + sidebar */}
      <div className="flex">
        {/* Lights grid */}
        <div className="flex-1">
          {sorted.length === 0 ? (
            <div className="py-12 text-center text-studio-500">
              <Lightbulb size={48} className="mx-auto mb-3 text-studio-700" />
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
                const groupLights = groupedLights(group.id);
                const isEmpty = groupLights.length === 0;
                const isCollapsed = collapsedGroups.has(group.id);
                const allOn = !isEmpty && groupLights.every((l) => l.on);
                const someOn = !isEmpty && groupLights.some((l) => l.on);

                return (
                  <div key={group.id}>
                    {/* Group header */}
                    <div className="mb-2 flex items-center gap-2">
                      <button
                        onClick={() => toggleGroupCollapsed(group.id)}
                        className="text-studio-400 transition-colors hover:text-studio-200"
                        title={isCollapsed ? "Expand group" : "Collapse group"}
                      >
                        <ChevronDown size={14} className={`transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                      </button>
                      <span className="text-xxs font-bold uppercase tracking-widest text-studio-400">{group.name}</span>
                      <span className="rounded-pill bg-studio-800 px-2 py-0.5 text-micro font-medium text-studio-500">
                        {groupLights.length}
                      </span>

                      {/* Group power toggle */}
                      {!isEmpty && (
                        <button
                          onClick={() => handleGroupPower(group.id, !allOn)}
                          className={`ml-1 rounded-badge px-1.5 py-0.5 text-xxs font-medium transition-colors ${
                            allOn
                              ? "bg-accent-blue/15 text-accent-blue"
                              : someOn
                                ? "bg-accent-amber/15 text-accent-amber"
                                : "bg-studio-750 text-studio-500"
                          }`}
                          title={allOn ? "Turn group off" : "Turn group on"}
                        >
                          {allOn ? "ON" : someOn ? "PARTIAL" : "OFF"}
                        </button>
                      )}
                    </div>

                    {/* Group lights or empty state */}
                    {!isCollapsed &&
                      (isEmpty ? (
                        <p className="mb-2 py-3 text-center text-xs text-studio-600">
                          No lights in this group. Assign lights via the edit button on each light card.
                        </p>
                      ) : compact ? (
                        <div className="space-y-1">{groupLights.map(renderLightCard)}</div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">{groupLights.map(renderLightCard)}</div>
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
                      <span className="rounded-pill bg-studio-800 px-2 py-0.5 text-micro font-medium text-studio-600">
                        {ungroupedLights.length}
                      </span>
                    </div>
                  )}
                  {compact ? (
                    <div className="space-y-1">{ungroupedLights.map(renderLightCard)}</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">{ungroupedLights.map(renderLightCard)}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-72 shrink-0 border-l border-studio-700 pl-4">
          {/* Controls header */}
          <div className="mb-4 space-y-3">
            <h3 className="text-micro font-bold uppercase tracking-widest text-studio-500">Controls</h3>

            {/* View toggles */}
            <div className="flex items-center rounded-badge border border-studio-700 bg-studio-800">
              <button
                onClick={toggleCompact}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-l-badge px-3 py-2 text-xs transition-colors ${
                  compact ? "bg-accent-cyan/15 text-accent-cyan" : "text-studio-500 hover:text-studio-200"
                }`}
                title={compact ? "Full view" : "Compact view"}
              >
                {compact ? <List size={14} /> : <LayoutGrid size={14} />}
                View
              </button>
              <div className="h-5 w-px bg-studio-700" />
              <button
                onClick={() => setShowDmxMonitor((v) => !v)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-r-badge px-3 py-2 text-xs transition-colors ${
                  showDmxMonitor ? "bg-accent-cyan/15 text-accent-cyan" : "text-studio-500 hover:text-studio-200"
                }`}
                title={showDmxMonitor ? "Hide DMX monitor" : "Show DMX monitor"}
              >
                <Activity size={14} />
                DMX
              </button>
            </div>

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

          {/* Scenes, Groups, DMX Monitor */}
          <div className="space-y-4">
            <ScenePanel scenes={lightScenes} selectedSceneId={lightingSettings.selectedSceneId} />

            {/* Groups panel */}
            <div className="rounded-card border border-studio-750 bg-studio-850 p-3">
              <h3 className="mb-3 text-micro font-bold uppercase tracking-widest text-studio-500">Groups</h3>

              <div className="mb-3 space-y-1.5">
                {sortedGroups.length === 0 && (
                  <p className="py-3 text-center text-xs text-studio-500">
                    No groups yet.
                    <br />
                    <span className="text-studio-600">Organize lights into groups.</span>
                  </p>
                )}
                {sortedGroups.map((group) => {
                  const count = groupedLights(group.id).length;
                  return (
                    <div
                      key={group.id}
                      className="group flex items-center justify-between rounded-badge border border-studio-750 bg-studio-900 px-2.5 py-2 transition-colors hover:border-studio-700"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-xs font-medium text-studio-200">{group.name}</span>
                        <span className="shrink-0 rounded-pill bg-studio-800 px-1.5 py-0.5 text-micro font-medium text-studio-500">
                          {count}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => {
                            setGroupName(group.name);
                            setModal({ type: "renameGroup", group });
                          }}
                          className="rounded-badge p-0.5 text-studio-500 transition-colors hover:text-studio-200"
                          title="Rename group"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          onClick={() => setModal({ type: "deleteGroup", group })}
                          className="rounded-badge p-0.5 text-studio-500 transition-colors hover:text-red-400"
                          title="Delete group"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add new group */}
              <div className="border-t border-studio-750/60 pt-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Group name"
                    className="min-w-0 flex-1 !px-2 !py-1.5 !text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && groupName.trim()) {
                        handleAddGroup();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddGroup}
                    disabled={groupSaving || !groupName.trim()}
                    className="rounded-badge bg-accent-blue px-3 py-1.5 text-xs font-medium text-studio-950 transition-colors hover:bg-accent-blue/80 disabled:opacity-50"
                  >
                    {groupSaving ? "..." : "Add"}
                  </button>
                </div>
              </div>
            </div>

            {showDmxMonitor && <DmxMonitor />}
          </div>
        </div>
      </div>

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

      {(modal.type === "addGroup" || modal.type === "renameGroup") && (
        <Modal
          onClose={() => setModal({ type: "none" })}
          ariaLabel={modal.type === "addGroup" ? "New Group" : "Rename Group"}
        >
          <div
            className="w-full max-w-xs animate-scale-in rounded-card border border-studio-700 bg-studio-850 p-4 shadow-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-sm font-semibold text-studio-100">
              {modal.type === "addGroup" ? "New Group" : "Rename Group"}
            </h3>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="mb-3"
              placeholder='e.g., "Key Lights"'
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (modal.type === "addGroup") handleAddGroup();
                  else handleRenameGroup(modal.group);
                }
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
                onClick={() => {
                  if (modal.type === "addGroup") handleAddGroup();
                  else handleRenameGroup(modal.group);
                }}
                disabled={groupSaving || !groupName.trim()}
                className="rounded-badge bg-accent-blue px-3 py-1.5 text-xs font-medium text-studio-950 transition-colors hover:bg-accent-blue/80 disabled:opacity-50"
              >
                {groupSaving ? "..." : modal.type === "addGroup" ? "Create" : "Rename"}
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

/** Compact single-row light display */
function CompactLightRow({
  light,
  isSelected,
  dmxStatus,
  onSelect,
  onUpdate,
  onEdit,
}: {
  light: Light;
  isSelected: boolean;
  dmxStatus: DmxStatus;
  onSelect: () => void;
  onUpdate: (values: { on?: boolean }) => void;
  onEdit: () => void;
}) {
  return (
    <div
      className={`flex cursor-pointer items-center gap-3 rounded-badge border px-3 py-2 transition-colors ${
        isSelected
          ? "border-accent-cyan/40 bg-studio-850"
          : "border-studio-750/50 bg-studio-850/60 hover:border-studio-700"
      }`}
      onClick={onSelect}
    >
      {/* Status dot */}
      <div
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          dmxStatus.enabled && dmxStatus.reachable ? "bg-accent-green" : "bg-accent-red"
        }`}
      />

      {/* Name */}
      <span className="min-w-0 flex-shrink truncate text-xs font-medium text-studio-100">{light.name}</span>

      {/* Mini intensity bar */}
      <div className="flex w-20 shrink-0 items-center gap-1.5">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-studio-750">
          <div
            className="h-full rounded-full bg-accent-amber transition-all"
            style={{ width: `${light.on ? light.intensity : 0}%` }}
          />
        </div>
        <span className="w-7 text-right font-mono text-xxs tabular-nums text-studio-500">
          {light.on ? `${light.intensity}%` : "Off"}
        </span>
      </div>

      {/* CCT or color indicator */}
      <span className="w-12 shrink-0 text-right font-mono text-xxs tabular-nums text-studio-500">
        {light.colorMode === "cct" || light.colorMode === undefined ? `${light.cct}K` : "RGB"}
      </span>

      {/* Edit */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="shrink-0 rounded-badge p-1 text-studio-600 transition-colors hover:text-studio-300"
        title="Edit"
      >
        <Settings2 size={12} />
      </button>

      {/* Power toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onUpdate({ on: !light.on });
        }}
        className={`relative h-6 w-10 shrink-0 rounded-full transition-all duration-200 ${light.on ? "bg-accent-blue" : "bg-studio-600"}`}
        title={light.on ? "Turn off" : "Turn on"}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200 ${
            light.on ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
