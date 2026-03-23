"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Light, LightScene, LightingSettings, ColorMode } from "@/lib/types";
import LightCard from "./LightCard";
import ScenePanel from "./ScenePanel";
import LightConfigModal from "./LightConfigModal";
import LightingSettingsModal from "./LightingSettingsModal";
import ConfirmDialog from "./ConfirmDialog";
import { useToast } from "./ToastContext";

interface DmxStatus {
  connected: boolean;
  reachable: boolean;
  enabled: boolean;
}

interface LightingViewProps {
  lights: Light[];
  lightScenes: LightScene[];
  lightingSettings: LightingSettings;
  onDataChange: () => void;
}

type ModalState =
  | { type: "none" }
  | { type: "addLight" }
  | { type: "editLight"; light: Light }
  | { type: "deleteLight"; light: Light }
  | { type: "settings" };

export default function LightingView({ lights, lightScenes, lightingSettings, onDataChange }: LightingViewProps) {
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [dmxStatus, setDmxStatus] = useState<DmxStatus>({ connected: false, reachable: false, enabled: false });
  const [showDmxHint, setShowDmxHint] = useState(false);
  const toast = useToast();
  const sorted = [...lights].sort((a, b) => a.order - b.order);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
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
          <div className="relative ml-2 flex items-center gap-1.5 text-xs text-gray-500">
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
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
              {sorted.map((light) => (
                <LightCard
                  key={light.id}
                  light={light}
                  isSelected={light.id === lightingSettings.selectedLightId}
                  dmxStatus={dmxStatus}
                  onSelect={() => handleSelect(light.id)}
                  onUpdate={(values) => handleUpdate(light.id, values)}
                  onDmx={(values) => handleDmx(light.id, values)}
                  onEdit={() => setModal({ type: "editLight", light })}
                />
              ))}
            </div>
          )}
        </div>

        {/* Scenes sidebar */}
        <div className="w-64 shrink-0">
          <ScenePanel scenes={lightScenes} selectedSceneId={lightingSettings.selectedSceneId} />
        </div>
      </div>

      {/* Modals */}
      {(modal.type === "addLight" || modal.type === "editLight") && (
        <LightConfigModal
          light={modal.type === "editLight" ? modal.light : undefined}
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
