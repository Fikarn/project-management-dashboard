"use client";

import ConfirmDialog from "../shared/ConfirmDialog";
import Modal from "../shared/Modal";
import LightConfigModal from "./LightConfigModal";
import LightingSettingsModal from "./LightingSettingsModal";
import type { Light, LightGroup, LightingSettings } from "@/lib/types";
import type { LightingModalState } from "./types";

interface LightingModalHostProps {
  modal: LightingModalState;
  lights: Light[];
  lightGroups: LightGroup[];
  lightingSettings: LightingSettings;
  renameGroupName: string;
  groupSaving: boolean;
  onRenameGroupNameChange: (value: string) => void;
  onClose: () => void;
  onSaved: () => void;
  onDeleteLight: (light: Light) => void;
  onDeleteGroup: (groupId: string, groupName: string) => void;
  onRenameGroup: (groupId: string) => void;
}

export default function LightingModalHost({
  modal,
  lights,
  lightGroups,
  lightingSettings,
  renameGroupName,
  groupSaving,
  onRenameGroupNameChange,
  onClose,
  onSaved,
  onDeleteLight,
  onDeleteGroup,
  onRenameGroup,
}: LightingModalHostProps) {
  return (
    <>
      {(modal.type === "addLight" || modal.type === "editLight") && (
        <LightConfigModal
          light={modal.type === "editLight" ? modal.light : undefined}
          groups={lightGroups}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}

      {modal.type === "deleteLight" && (
        <ConfirmDialog
          title="Delete Light"
          message={`Delete "${modal.light.name}"? This cannot be undone.`}
          onConfirm={() => onDeleteLight(modal.light)}
          onCancel={onClose}
        />
      )}

      {modal.type === "deleteGroup" && (
        <ConfirmDialog
          title="Delete Group"
          message={`Delete group "${modal.groupName}"? Lights will be moved to ungrouped.`}
          onConfirm={() => onDeleteGroup(modal.groupId, modal.groupName)}
          onCancel={onClose}
        />
      )}

      {modal.type === "renameGroup" && (
        <Modal onClose={onClose} ariaLabel="Rename Group">
          <div
            className="w-full max-w-xs animate-scale-in rounded-card border border-studio-700 bg-studio-850 p-4 shadow-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-3 text-sm font-semibold text-studio-100">Rename Group</h3>
            <input
              type="text"
              value={renameGroupName}
              onChange={(event) => onRenameGroupNameChange(event.target.value)}
              className="mb-3"
              placeholder='e.g., "Key Lights"'
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") onRenameGroup(modal.groupId);
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-badge bg-studio-700 px-3 py-1.5 text-xs text-studio-300 transition-colors hover:bg-studio-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onRenameGroup(modal.groupId)}
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
        <LightingSettingsModal lightingSettings={lightingSettings} lights={lights} onClose={onClose} />
      )}
    </>
  );
}
