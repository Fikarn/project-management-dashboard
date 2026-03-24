"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleAllOn}
            disabled={allLoading}
            className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-300 hover:text-white disabled:opacity-50"
          >
            All On
          </button>
          <button
            onClick={handleAllOff}
            disabled={allLoading}
            className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-300 hover:text-white disabled:opacity-50"
          >
            All Off
          </button>

          {/* Grand Master fader */}
          <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-1.5">
            <span className="text-[10px] font-semibold tracking-wide text-gray-400">GM</span>
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
                background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${gmValue}%, #374151 ${gmValue}%, #374151 100%)`,
              }}
            />
            <span
              className={`min-w-[2.2rem] text-right font-mono text-xs tabular-nums ${
                gmValue < 100 ? "text-amber-400" : "text-gray-400"
              }`}
            >
              {gmValue}%
            </span>
          </div>

          <div className="relative flex items-center gap-1.5 text-xs text-gray-500">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                !dmxStatus.enabled ? "bg-gray-600" : dmxStatus.reachable ? "bg-green-500" : "bg-red-500"
              }`}
            />
            {!dmxStatus.enabled ? "DMX Off" : dmxStatus.reachable ? "Bridge Connected" : "Bridge Unreachable"}
            {showDmxHint && (
              <button
                onClick={() => {
                  setShowDmxHint(false);
                  localStorage.setItem("hasSeenLightingHint", "1");
                }}
                className="absolute left-0 top-6 z-10 w-56 rounded border border-gray-600 bg-gray-800 p-2 text-left text-xs text-gray-300 shadow-lg"
              >
                <span className="font-medium text-gray-200">Status indicator:</span> Green = connected, Red =
                unreachable, Gray = disabled
                <span className="ml-1 text-gray-500">(click to dismiss)</span>
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Compact/Full toggle */}
          <button
            onClick={toggleCompact}
            className={`rounded border px-2 py-1 text-xs transition-colors ${
              compact
                ? "border-blue-500/50 bg-blue-600/20 text-blue-400"
                : "border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-200"
            }`}
            title={compact ? "Switch to full view" : "Switch to compact view"}
          >
            {compact ? "Compact" : "Full"}
          </button>
          <button
            onClick={() => setShowDmxMonitor((v) => !v)}
            className={`rounded border px-2 py-1 text-xs transition-colors ${
              showDmxMonitor
                ? "border-blue-500/50 bg-blue-600/20 text-blue-400"
                : "border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-200"
            }`}
            title={showDmxMonitor ? "Hide DMX monitor" : "Show DMX monitor"}
          >
            DMX
          </button>
          <button
            onClick={() => {
              setGroupName("");
              setModal({ type: "addGroup" });
            }}
            className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-400 hover:text-gray-200"
          >
            + Group
          </button>
          <button
            onClick={() => setModal({ type: "addLight" })}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500"
          >
            + Add Light
          </button>
          <button
            onClick={() => setModal({ type: "settings" })}
            className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-400 hover:text-gray-200"
            title="Lighting settings"
          >
            &#9881; Settings
          </button>
        </div>
      </div>

      {/* Main layout: lights grid + scenes sidebar */}
      <div className="flex gap-4">
        {/* Lights grid */}
        <div className="flex-1">
          {sorted.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <p className="mb-2 text-sm">No lights configured</p>
              <button
                onClick={() => setModal({ type: "addLight" })}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Add your first light
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Grouped lights */}
              {sortedGroups.map((group) => {
                const groupLights = groupedLights(group.id);
                if (groupLights.length === 0) return null;
                const isCollapsed = collapsedGroups.has(group.id);
                const allOn = groupLights.every((l) => l.on);
                const someOn = groupLights.some((l) => l.on);

                return (
                  <div key={group.id}>
                    {/* Group header */}
                    <div className="mb-2 flex items-center gap-2">
                      <button
                        onClick={() => toggleGroupCollapsed(group.id)}
                        className="text-gray-400 hover:text-white"
                        title={isCollapsed ? "Expand group" : "Collapse group"}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          className={`transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                        >
                          <path
                            d="M4 6l4 4 4-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{group.name}</span>
                      <span className="text-[10px] text-gray-600">{groupLights.length}</span>

                      {/* Group power toggle */}
                      <button
                        onClick={() => handleGroupPower(group.id, !allOn)}
                        className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                          allOn
                            ? "bg-blue-600/30 text-blue-400"
                            : someOn
                              ? "bg-yellow-600/20 text-yellow-400"
                              : "bg-gray-700/50 text-gray-500"
                        }`}
                        title={allOn ? "Turn group off" : "Turn group on"}
                      >
                        {allOn ? "ON" : someOn ? "PARTIAL" : "OFF"}
                      </button>

                      <div className="ml-auto flex items-center gap-1">
                        <button
                          onClick={() => {
                            setGroupName(group.name);
                            setModal({ type: "renameGroup", group });
                          }}
                          className="rounded p-0.5 text-gray-600 hover:text-gray-400"
                          title="Rename group"
                        >
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setModal({ type: "deleteGroup", group })}
                          className="rounded p-0.5 text-gray-600 hover:text-red-400"
                          title="Delete group"
                        >
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          >
                            <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Group lights */}
                    {!isCollapsed &&
                      (compact ? (
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
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Ungrouped</span>
                      <span className="text-[10px] text-gray-600">{ungroupedLights.length}</span>
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

        {/* Scenes sidebar */}
        <div className="w-64 shrink-0 space-y-4">
          <ScenePanel scenes={lightScenes} selectedSceneId={lightingSettings.selectedSceneId} />
          {showDmxMonitor && <DmxMonitor />}
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
            className="w-full max-w-xs rounded-lg border border-gray-700 bg-gray-800 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-sm font-semibold text-white">
              {modal.type === "addGroup" ? "New Group" : "Rename Group"}
            </h3>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="mb-3 w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
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
                className="rounded bg-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (modal.type === "addGroup") handleAddGroup();
                  else handleRenameGroup(modal.group);
                }}
                disabled={groupSaving || !groupName.trim()}
                className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-500 disabled:opacity-50"
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
      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
        isSelected ? "border-blue-500/50 bg-gray-800" : "border-gray-700/50 bg-gray-800/60 hover:border-gray-600"
      }`}
      onClick={onSelect}
    >
      {/* Status dot */}
      <div
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          dmxStatus.enabled && dmxStatus.reachable ? "bg-green-400" : "bg-red-500"
        }`}
      />

      {/* Name */}
      <span className="min-w-0 flex-shrink truncate text-xs font-medium text-white">{light.name}</span>

      {/* Mini intensity bar */}
      <div className="flex w-20 shrink-0 items-center gap-1.5">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-700">
          <div
            className="h-full rounded-full bg-amber-500 transition-all"
            style={{ width: `${light.on ? light.intensity : 0}%` }}
          />
        </div>
        <span className="w-7 text-right font-mono text-[10px] tabular-nums text-gray-500">
          {light.on ? `${light.intensity}%` : "Off"}
        </span>
      </div>

      {/* CCT or color indicator */}
      <span className="w-12 shrink-0 text-right font-mono text-[10px] tabular-nums text-gray-500">
        {light.colorMode === "cct" || light.colorMode === undefined ? `${light.cct}K` : "RGB"}
      </span>

      {/* Edit */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="shrink-0 rounded p-0.5 text-gray-600 hover:text-gray-400"
        title="Edit"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z" />
          <path d="M8 5.5v5M5.5 8h5" />
        </svg>
      </button>

      {/* Power toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onUpdate({ on: !light.on });
        }}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${light.on ? "bg-blue-600" : "bg-gray-600"}`}
        title={light.on ? "Turn off" : "Turn on"}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            light.on ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
