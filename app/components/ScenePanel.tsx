"use client";

import { useState } from "react";
import type { LightScene } from "@/lib/types";
import { useToast } from "./ToastContext";

interface ScenePanelProps {
  scenes: LightScene[];
  selectedSceneId: string | null;
}

export default function ScenePanel({ scenes, selectedSceneId }: ScenePanelProps) {
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [recallingId, setRecallingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const toast = useToast();

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
      await fetch(`/api/lights/scenes/${id}/recall`, { method: "POST" });
    } catch {
      toast("error", "Failed to recall scene");
    }
    setRecallingId(null);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/lights/scenes/${id}`, { method: "DELETE" });
    } catch {
      toast("error", "Failed to delete scene");
    }
    setDeletingId(null);
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">Scenes</h3>

      {/* Scene list */}
      <div className="mb-4 space-y-1.5">
        {scenes.length === 0 && <p className="py-2 text-xs text-gray-500">No scenes saved</p>}
        {scenes.map((scene) => (
          <div
            key={scene.id}
            className={`flex items-center justify-between rounded px-2.5 py-1.5 text-sm ${
              scene.id === selectedSceneId
                ? "border border-blue-500/30 bg-blue-600/20 text-white"
                : "hover:bg-gray-750 bg-gray-900 text-gray-300"
            }`}
          >
            <span className="mr-2 truncate">{scene.name}</span>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => handleRecall(scene.id)}
                disabled={recallingId === scene.id}
                className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-300 hover:bg-gray-600 disabled:opacity-50"
                title="Recall scene"
              >
                {recallingId === scene.id ? "..." : "Recall"}
              </button>
              <button
                onClick={() => handleDelete(scene.id)}
                disabled={deletingId === scene.id}
                className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] text-red-400 hover:bg-gray-600 disabled:opacity-50"
                title="Delete scene"
              >
                {deletingId === scene.id ? "..." : "Del"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Save new scene */}
      <div className="flex gap-2">
        <input
          type="text"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          placeholder="Scene name"
          className="flex-1 rounded border border-gray-600 bg-gray-900 px-2 py-1 text-xs text-white focus:border-blue-500 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-blue-600 px-2.5 py-1 text-xs text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? "..." : "Save"}
        </button>
      </div>
    </div>
  );
}
