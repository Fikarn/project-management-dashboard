"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import type { LightGroup } from "@/lib/types";

interface GroupManagementPanelProps {
  groups: LightGroup[];
  getLightCount: (groupId: string) => number;
  onRenameGroup: (group: LightGroup) => void;
  onDeleteGroup: (group: LightGroup) => void;
  onAddGroup: (name: string) => void;
  saving: boolean;
}

export default function GroupManagementPanel({
  groups,
  getLightCount,
  onRenameGroup,
  onDeleteGroup,
  onAddGroup,
  saving,
}: GroupManagementPanelProps) {
  const [inputName, setInputName] = useState("");

  function handleAdd() {
    const name = inputName.trim();
    if (!name) return;
    onAddGroup(name);
    setInputName("");
  }

  return (
    <div className="rounded-card border border-studio-750 bg-studio-850 p-3">
      <h3 className="mb-3 text-xxs font-bold uppercase tracking-widest text-studio-500">Groups</h3>

      <div className="mb-3 space-y-1.5">
        {groups.length === 0 && (
          <p className="py-3 text-center text-xs text-studio-500">
            No groups yet.
            <br />
            <span className="text-studio-500">Organize lights into groups.</span>
          </p>
        )}
        {groups.map((group) => {
          const count = getLightCount(group.id);
          return (
            <div
              key={group.id}
              className="group flex items-center justify-between rounded-badge border border-studio-750 bg-studio-900 px-2.5 py-2 transition-colors hover:border-studio-700"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-xs font-medium text-studio-200">{group.name}</span>
                <span className="shrink-0 rounded-pill bg-studio-800 px-1.5 py-0.5 text-xxs font-medium text-studio-500">
                  {count}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => onRenameGroup(group)}
                  className="rounded-badge p-0.5 text-studio-500 transition-colors hover:text-studio-200"
                  title="Rename group"
                >
                  <Pencil size={11} />
                </button>
                <button
                  onClick={() => onDeleteGroup(group)}
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
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            placeholder="Group name"
            className="min-w-0 flex-1 !px-2 !py-1.5 !text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter" && inputName.trim()) handleAdd();
            }}
          />
          <button
            onClick={handleAdd}
            disabled={saving || !inputName.trim()}
            className="rounded-badge bg-accent-blue px-3 py-1.5 text-xs font-medium text-studio-950 transition-colors hover:bg-accent-blue/80 disabled:opacity-50"
          >
            {saving ? "..." : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
