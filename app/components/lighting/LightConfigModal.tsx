"use client";

import { useState } from "react";
import type { Light, LightType, LightGroup } from "@/lib/types";
import { getChannelCount } from "@/lib/light-types";
import { lightsApi } from "@/lib/client-api";
import { useToast } from "../shared/ToastContext";
import Modal from "../shared/Modal";
import ConfirmDialog from "../shared/ConfirmDialog";

interface LightConfigModalProps {
  light?: Light;
  groups: LightGroup[];
  onClose: () => void;
  onSaved: () => void;
}

const LIGHT_TYPES: { value: LightType; label: string }[] = [
  { value: "astra-bicolor", label: "Litepanels Astra Bi-Color Soft" },
  { value: "infinimat", label: "Aputure Infinimat 2x4" },
  { value: "infinibar-pb12", label: "Aputure Infinibar PB12" },
];

export default function LightConfigModal({ light, groups, onClose, onSaved }: LightConfigModalProps) {
  const isEdit = !!light;
  const [name, setName] = useState(light?.name ?? "");
  const [type, setType] = useState<LightType>(light?.type ?? "astra-bicolor");
  const [dmxAddress, setDmxAddress] = useState(light?.dmxStartAddress ?? 1);
  const [groupId, setGroupId] = useState<string>(light?.groupId ?? "");
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const toast = useToast();

  const isDirty =
    name !== (light?.name ?? "") ||
    type !== (light?.type ?? "astra-bicolor") ||
    dmxAddress !== (light?.dmxStartAddress ?? 1) ||
    groupId !== (light?.groupId ?? "");

  function handleClose() {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    setSaving(true);

    try {
      if (isEdit) {
        await lightsApi.update(light.id, { name, type, dmxStartAddress: dmxAddress, groupId: groupId || null });
      } else {
        await lightsApi.create({ name, type, dmxStartAddress: dmxAddress, groupId: groupId || null });
        toast("success", `Added "${name}"`);
      }
      onSaved();
      onClose();
    } catch {
      toast("error", `Failed to ${isEdit ? "update" : "add"} light`);
      setSaving(false);
    }
  }

  return (
    <Modal
      onClose={handleClose}
      ariaLabel={isEdit ? "Edit Light" : "Add Light"}
      preventBackdropClose={isDirty}
      onBackdropClick={() => setShowDiscardConfirm(true)}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md animate-scale-in rounded-card border border-studio-700 bg-studio-850 p-6 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-5 text-lg font-semibold text-studio-100">{isEdit ? "Edit Light" : "Add Light"}</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="light-config-name" className="mb-1 block text-xs font-medium text-studio-400">
              Name
            </label>
            <input
              id="light-config-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError(false);
              }}
              className={`w-full ${nameError ? "!border-red-500" : ""}`}
              placeholder='e.g., "Key Left"'
              maxLength={50}
              autoFocus
              aria-invalid={nameError}
              aria-describedby={nameError ? "light-config-name-error" : undefined}
            />
            {nameError && (
              <p id="light-config-name-error" className="mt-1 text-xs text-red-400">
                Name is required
              </p>
            )}
          </div>

          <div>
            <label htmlFor="light-config-type" className="mb-1 block text-xs font-medium text-studio-400">
              Type
            </label>
            <select
              id="light-config-type"
              value={type}
              onChange={(e) => setType(e.target.value as LightType)}
              className="w-full"
            >
              {LIGHT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="light-config-dmx-address" className="mb-1 block text-xs font-medium text-studio-400">
              DMX Start Address
            </label>
            <input
              id="light-config-dmx-address"
              type="number"
              min="1"
              max={512 - getChannelCount(type) + 1}
              value={dmxAddress}
              onChange={(e) => setDmxAddress(Number(e.target.value))}
              className="w-full"
              aria-describedby="light-config-dmx-address-help"
            />
            <p id="light-config-dmx-address-help" className="mt-1 text-xs text-studio-500">
              Uses {getChannelCount(type)} channel{getChannelCount(type) > 1 ? "s" : ""}
              {getChannelCount(type) === 2 ? ": intensity + CCT" : ": intensity + CCT + RGB + effects"}
            </p>
          </div>

          {groups.length > 0 && (
            <div>
              <label htmlFor="light-config-group" className="mb-1 block text-xs font-medium text-studio-400">
                Group
              </label>
              <select
                id="light-config-group"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full"
              >
                <option value="">No group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-badge bg-studio-700 px-3 py-1.5 text-sm text-studio-300 transition-colors hover:bg-studio-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="rounded-badge bg-accent-blue px-3 py-1.5 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80 disabled:opacity-50"
          >
            {saving ? "Saving..." : isEdit ? "Save" : "Add Light"}
          </button>
        </div>
      </form>
      {showDiscardConfirm && (
        <ConfirmDialog
          title="Discard Changes"
          message="You have unsaved changes. Discard them?"
          confirmLabel="Discard"
          onConfirm={onClose}
          onCancel={() => setShowDiscardConfirm(false)}
        />
      )}
    </Modal>
  );
}
