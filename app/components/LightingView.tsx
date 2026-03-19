"use client";

import { useState, useCallback } from "react";
import type { Light, LightScene, LightingSettings } from "@/lib/types";
import LightCard from "./LightCard";
import ScenePanel from "./ScenePanel";
import LightConfigModal from "./LightConfigModal";
import LightingSettingsModal from "./LightingSettingsModal";
import ConfirmDialog from "./ConfirmDialog";
import { useToast } from "./ToastContext";

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

export default function LightingView({
  lights,
  lightScenes,
  lightingSettings,
  onDataChange,
}: LightingViewProps) {
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const toast = useToast();
  const sorted = [...lights].sort((a, b) => a.order - b.order);

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

  const handleUpdate = useCallback(async (lightId: string, values: { intensity?: number; cct?: number; on?: boolean }) => {
    try {
      await fetch(`/api/lights/${lightId}/value`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
    } catch {
      toast("error", "Failed to save light value");
    }
  }, [toast]);

  const handleDmx = useCallback(async (lightId: string, values: { intensity?: number; cct?: number; on?: boolean }) => {
    try {
      await fetch("/api/lights/dmx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lightId, ...values }),
      });
    } catch (err) {
      console.error("DMX send failed:", err);
    }
  }, []);

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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleAllOn}
            disabled={allLoading}
            className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-300 hover:text-white border border-gray-700 disabled:opacity-50"
          >
            All On
          </button>
          <button
            onClick={handleAllOff}
            disabled={allLoading}
            className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-300 hover:text-white border border-gray-700 disabled:opacity-50"
          >
            All Off
          </button>
          <div className="flex items-center gap-1.5 ml-2 text-xs text-gray-500">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                lightingSettings.dmxEnabled ? "bg-green-500" : "bg-gray-600"
              }`}
            />
            {lightingSettings.dmxEnabled ? "DMX Active" : "DMX Off"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lights.length < 5 && (
            <button
              onClick={() => setModal({ type: "addLight" })}
              className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-500"
            >
              + Add Light
            </button>
          )}
          <button
            onClick={() => setModal({ type: "settings" })}
            className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700"
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
            <div className="text-center py-12 text-gray-500">
              <p className="text-sm mb-2">No lights configured</p>
              <button
                onClick={() => setModal({ type: "addLight" })}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Add your first light
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {sorted.map((light) => (
                <LightCard
                  key={light.id}
                  light={light}
                  isSelected={light.id === lightingSettings.selectedLightId}
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
          <ScenePanel
            scenes={lightScenes}
            selectedSceneId={lightingSettings.selectedSceneId}
          />
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
