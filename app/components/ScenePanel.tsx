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
    try {
      await fetch(`/api/lights/scenes/${id}/recall`, { method: "POST" });
    } catch {
      toast("error", "Failed to recall scene");
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/lights/scenes/${id}`, { method: "DELETE" });
    } catch {
      toast("error", "Failed to delete scene");
    }
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Scenes</h3>

      {/* Scene list */}
      <div className="space-y-1.5 mb-4">
        {scenes.length === 0 && (
          <p className="text-xs text-gray-500 py-2">No scenes saved</p>
        )}
        {scenes.map((scene) => (
          <div
            key={scene.id}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded text-sm ${
              scene.id === selectedSceneId
                ? "bg-blue-600/20 border border-blue-500/30 text-white"
                : "bg-gray-900 text-gray-300 hover:bg-gray-750"
            }`}
          >
            <span className="truncate mr-2">{scene.name}</span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleRecall(scene.id)}
                className="px-1.5 py-0.5 text-[10px] rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
                title="Recall scene"
              >
                Recall
              </button>
              <button
                onClick={() => handleDelete(scene.id)}
                className="px-1.5 py-0.5 text-[10px] rounded bg-gray-700 text-red-400 hover:bg-gray-600"
                title="Delete scene"
              >
                Del
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
          className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-2.5 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? "..." : "Save"}
        </button>
      </div>
    </div>
  );
}
