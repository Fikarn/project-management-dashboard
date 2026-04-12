"use client";

import { useState, useRef } from "react";
import { X } from "lucide-react";
import type { LightScene, LightSceneEntry } from "@/lib/types";
import { scenesApi } from "@/lib/client-api";
import { useToast } from "../shared/ToastContext";
import ConfirmDialog from "../shared/ConfirmDialog";

interface ScenePanelProps {
  scenes: LightScene[];
  selectedSceneId: string | null;
}

/** Map CCT (Kelvin) to an approximate RGB string for swatches. */
function cctToRgb(cct: number): string {
  const t = cct / 100;
  let r: number, g: number, b: number;
  if (t <= 66) {
    r = 255;
    g = Math.min(255, Math.max(0, 99.47 * Math.log(t) - 161.12));
    b = t <= 19 ? 0 : Math.min(255, Math.max(0, 138.52 * Math.log(t - 10) - 305.04));
  } else {
    r = Math.min(255, Math.max(0, 329.7 * Math.pow(t - 60, -0.133)));
    g = Math.min(255, Math.max(0, 288.12 * Math.pow(t - 60, -0.0755)));
    b = 255;
  }
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

/** Get display color for a scene light state entry. */
function stateColor(s: LightSceneEntry): string {
  if (!s.on) return "#242430"; // studio-750 for off
  if (s.colorMode === "rgb" || s.colorMode === "hsi") {
    return `rgb(${s.red}, ${s.green}, ${s.blue})`;
  }
  return cctToRgb(s.cct);
}

export default function ScenePanel({ scenes, selectedSceneId }: ScenePanelProps) {
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [recallingId, setRecallingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deleteScene, setDeleteScene] = useState<LightScene | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [fadeDuration, setFadeDuration] = useState(0); // seconds: 0 = instant
  const editInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const FADE_OPTIONS = [
    { label: "Instant", value: 0 },
    { label: "1s", value: 1 },
    { label: "2s", value: 2 },
    { label: "3s", value: 3 },
    { label: "5s", value: 5 },
  ];

  async function handleSave() {
    const name = saveName.trim() || `Scene ${scenes.length + 1}`;
    setSaving(true);
    try {
      await scenesApi.create(name);
      setSaveName("");
      toast("success", `Saved "${name}"`);
    } catch {
      toast("error", "Failed to save scene");
    }
    setSaving(false);
  }

  async function handleRecall(id: string) {
    setRecallingId(id);
    try {
      await scenesApi.recall(id, { fadeDuration });
    } catch {
      toast("error", "Failed to recall scene");
    }
    setRecallingId(null);
  }

  async function handleUpdate(scene: LightScene) {
    setUpdatingId(scene.id);
    try {
      await scenesApi.update(scene.id, { updateStates: true });
      toast("success", `Updated "${scene.name}"`);
    } catch {
      toast("error", "Failed to update scene");
    }
    setUpdatingId(null);
  }

  async function handleDelete(scene: LightScene) {
    try {
      await scenesApi.delete(scene.id);
      toast("success", `Deleted "${scene.name}"`);
    } catch {
      toast("error", "Failed to delete scene");
    }
    setDeleteScene(null);
  }

  function startRename(scene: LightScene) {
    setEditingId(scene.id);
    setEditName(scene.name);
    setTimeout(() => editInputRef.current?.select(), 0);
  }

  async function commitRename(sceneId: string) {
    const name = editName.trim();
    setEditingId(null);
    if (!name) return;
    try {
      await scenesApi.update(sceneId, { name });
    } catch {
      toast("error", "Failed to rename scene");
    }
  }

  return (
    <div className="rounded-card border border-studio-750 bg-studio-850 p-3">
      <h3 className="mb-3 text-xxs font-bold uppercase tracking-widest text-studio-500">Scenes</h3>

      {/* Scene list */}
      <div className="mb-4 space-y-2">
        {scenes.length === 0 && (
          <p className="py-4 text-center text-xs text-studio-500">
            No scenes saved yet.
            <br />
            <span className="text-studio-500">Set your lights, then save.</span>
          </p>
        )}
        {scenes.map((scene) => {
          const isActive = scene.id === selectedSceneId;
          const isRecalling = recallingId === scene.id;
          const isUpdating = updatingId === scene.id;

          return (
            <div
              key={scene.id}
              className={`group rounded-badge border p-2.5 transition-all ${
                isActive
                  ? "border-accent-blue/40 bg-accent-blue/5"
                  : "border-studio-750 bg-studio-900 hover:border-studio-700"
              }`}
            >
              {/* Scene name — click to rename */}
              <div className="mb-1.5 flex items-center justify-between gap-1.5">
                {editingId === scene.id ? (
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => commitRename(scene.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(scene.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="min-w-0 flex-1 !px-1.5 !py-0.5 !text-xs"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => startRename(scene)}
                    className="min-w-0 truncate text-left text-xs font-medium text-studio-100 transition-colors hover:text-accent-blue"
                    title="Click to rename"
                  >
                    {scene.name}
                  </button>
                )}
                {isActive && editingId !== scene.id && (
                  <span className="ml-1.5 shrink-0 rounded-badge bg-accent-blue/15 px-1.5 py-0.5 text-xxs font-semibold text-accent-blue">
                    ACTIVE
                  </span>
                )}
              </div>

              {/* Color swatches — mini preview of scene colors */}
              <div className="mb-2 flex gap-0.5">
                {scene.lightStates.slice(0, 12).map((ls) => (
                  <div
                    key={ls.lightId}
                    className="h-3 flex-1 rounded-sm first:rounded-l last:rounded-r"
                    style={{ backgroundColor: stateColor(ls) }}
                    title={ls.on ? (ls.colorMode === "cct" ? `${ls.cct}K` : `RGB`) : "Off"}
                  />
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleRecall(scene.id)}
                  disabled={isRecalling}
                  className="flex-1 rounded-badge bg-studio-750 py-1 text-xxs font-medium text-studio-300 transition-colors hover:bg-studio-700 hover:text-studio-100 disabled:opacity-50"
                >
                  {isRecalling ? "..." : "Recall"}
                </button>
                <button
                  onClick={() => handleUpdate(scene)}
                  disabled={isUpdating}
                  className="rounded-badge bg-studio-750 px-2 py-1 text-xxs text-studio-400 transition-colors hover:bg-studio-700 hover:text-studio-100 disabled:opacity-50"
                  title="Overwrite with current light values"
                >
                  {isUpdating ? "..." : "Update"}
                </button>
                <button
                  onClick={() => setDeleteScene(scene)}
                  className="rounded-badge bg-studio-750 px-1.5 py-1 text-studio-500 transition-colors hover:bg-red-500/15 hover:text-red-400"
                  title="Delete scene"
                >
                  <X size={10} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fade duration selector */}
      {scenes.length > 0 && (
        <div className="mb-3 border-t border-studio-750/60 pt-3">
          <div
            id="scene-fade-label"
            className="mb-1.5 block text-xxs font-bold uppercase tracking-widest text-studio-500"
          >
            Recall Fade
          </div>
          <div className="flex gap-1" role="radiogroup" aria-labelledby="scene-fade-label">
            {FADE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                role="radio"
                aria-checked={fadeDuration === opt.value}
                onClick={() => setFadeDuration(opt.value)}
                className={`flex-1 rounded-badge py-1 text-xxs font-medium transition-colors ${
                  fadeDuration === opt.value
                    ? "bg-accent-blue/15 text-accent-blue"
                    : "bg-studio-750 text-studio-500 hover:text-studio-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Save new scene */}
      <div className="border-t border-studio-750/60 pt-3">
        <div className="flex gap-2">
          <input
            id="scene-save-name"
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Scene name"
            aria-label="New scene name"
            className="min-w-0 flex-1 !px-2 !py-1.5 !text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-badge bg-accent-blue px-3 py-1.5 text-xs font-medium text-studio-950 transition-colors hover:bg-accent-blue/80 disabled:opacity-50"
          >
            {saving ? "..." : "Save"}
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteScene && (
        <ConfirmDialog
          title="Delete Scene"
          message={`Delete "${deleteScene.name}"? This cannot be undone.`}
          onConfirm={() => handleDelete(deleteScene)}
          onCancel={() => setDeleteScene(null)}
        />
      )}
    </div>
  );
}
