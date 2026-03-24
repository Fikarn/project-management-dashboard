"use client";

import { useState, useRef } from "react";
import type { LightScene, LightSceneEntry } from "@/lib/types";
import { useToast } from "./ToastContext";
import ConfirmDialog from "./ConfirmDialog";

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
  if (!s.on) return "#374151"; // gray-700 for off
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
      await fetch("/api/lights/scenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
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
      await fetch(`/api/lights/scenes/${id}/recall`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fadeDuration }),
      });
    } catch {
      toast("error", "Failed to recall scene");
    }
    setRecallingId(null);
  }

  async function handleUpdate(scene: LightScene) {
    setUpdatingId(scene.id);
    try {
      await fetch(`/api/lights/scenes/${scene.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updateStates: true }),
      });
      toast("success", `Updated "${scene.name}"`);
    } catch {
      toast("error", "Failed to update scene");
    }
    setUpdatingId(null);
  }

  async function handleDelete(scene: LightScene) {
    try {
      await fetch(`/api/lights/scenes/${scene.id}`, { method: "DELETE" });
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
      await fetch(`/api/lights/scenes/${sceneId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    } catch {
      toast("error", "Failed to rename scene");
    }
  }

  return (
    <div className="rounded-xl border border-gray-700/80 bg-gray-800/90 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Scenes</h3>

      {/* Scene list */}
      <div className="mb-4 space-y-2">
        {scenes.length === 0 && (
          <p className="py-4 text-center text-xs text-gray-500">
            No scenes saved yet.
            <br />
            <span className="text-gray-600">Set your lights, then save.</span>
          </p>
        )}
        {scenes.map((scene) => {
          const isActive = scene.id === selectedSceneId;
          const isRecalling = recallingId === scene.id;
          const isUpdating = updatingId === scene.id;

          return (
            <div
              key={scene.id}
              className={`group rounded-lg border p-2.5 transition-all ${
                isActive
                  ? "border-blue-500/40 bg-blue-600/10"
                  : "border-gray-700/50 bg-gray-900/60 hover:border-gray-600"
              }`}
            >
              {/* Scene name — click to rename */}
              <div className="mb-1.5 flex items-center justify-between">
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
                    className="w-full rounded border border-blue-500/50 bg-gray-900 px-1.5 py-0.5 text-xs text-white focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => startRename(scene)}
                    className="truncate text-left text-xs font-medium text-white hover:text-blue-300"
                    title="Click to rename"
                  >
                    {scene.name}
                  </button>
                )}
                {isActive && editingId !== scene.id && (
                  <span className="ml-1.5 shrink-0 rounded bg-blue-600/30 px-1.5 py-0.5 text-[9px] font-semibold text-blue-400">
                    ACTIVE
                  </span>
                )}
              </div>

              {/* Color swatches — mini preview of scene colors */}
              <div className="mb-2 flex gap-0.5">
                {scene.lightStates.slice(0, 12).map((ls) => (
                  <div
                    key={ls.lightId}
                    className="h-2.5 flex-1 first:rounded-l-sm last:rounded-r-sm"
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
                  className="flex-1 rounded bg-gray-700/80 py-1 text-[10px] font-medium text-gray-300 transition-colors hover:bg-gray-600 hover:text-white disabled:opacity-50"
                >
                  {isRecalling ? "..." : "Recall"}
                </button>
                <button
                  onClick={() => handleUpdate(scene)}
                  disabled={isUpdating}
                  className="rounded bg-gray-700/80 px-2 py-1 text-[10px] text-gray-400 transition-colors hover:bg-gray-600 hover:text-white disabled:opacity-50"
                  title="Overwrite with current light values"
                >
                  {isUpdating ? "..." : "Update"}
                </button>
                <button
                  onClick={() => setDeleteScene(scene)}
                  className="rounded bg-gray-700/80 px-1.5 py-1 text-[10px] text-gray-500 transition-colors hover:bg-red-600/30 hover:text-red-400"
                  title="Delete scene"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fade duration selector */}
      {scenes.length > 0 && (
        <div className="mb-3 border-t border-gray-700/60 pt-3">
          <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-gray-500">
            Recall Fade
          </label>
          <div className="flex gap-1">
            {FADE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFadeDuration(opt.value)}
                className={`flex-1 rounded py-1 text-[10px] font-medium transition-colors ${
                  fadeDuration === opt.value
                    ? "bg-blue-600/30 text-blue-400"
                    : "bg-gray-700/50 text-gray-500 hover:text-gray-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Save new scene */}
      <div className="border-t border-gray-700/60 pt-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Scene name"
            className="flex-1 rounded-lg border border-gray-600 bg-gray-900 px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
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
