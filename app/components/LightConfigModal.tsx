"use client";

import { useState } from "react";
import type { Light, LightType } from "@/lib/types";
import { useToast } from "./ToastContext";
import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";

interface LightConfigModalProps {
  light?: Light;
  onClose: () => void;
  onSaved: () => void;
}

const LIGHT_TYPES: { value: LightType; label: string }[] = [
  { value: "astra-bicolor", label: "Litepanels Astra Bi-color" },
  { value: "infinimat", label: "Aputure Infinimat" },
];

export default function LightConfigModal({
  light,
  onClose,
  onSaved,
}: LightConfigModalProps) {
  const isEdit = !!light;
  const [name, setName] = useState(light?.name ?? "");
  const [type, setType] = useState<LightType>(light?.type ?? "astra-bicolor");
  const [dmxAddress, setDmxAddress] = useState(light?.dmxStartAddress ?? 1);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const toast = useToast();

  const isDirty = name !== (light?.name ?? "") || type !== (light?.type ?? "astra-bicolor") || dmxAddress !== (light?.dmxStartAddress ?? 1);

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
        await fetch(`/api/lights/${light.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, type, dmxStartAddress: dmxAddress }),
        });
      } else {
        await fetch("/api/lights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, type, dmxStartAddress: dmxAddress }),
        });
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
    <Modal onClose={handleClose} ariaLabel={isEdit ? "Edit Light" : "Add Light"} preventBackdropClose={isDirty} onBackdropClick={() => setShowDiscardConfirm(true)}>
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white">
          {isEdit ? "Edit Light" : "Add Light"}
        </h2>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setNameError(false); }}
            className={`w-full bg-gray-900 border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 ${nameError ? "border-red-500" : "border-gray-600"}`}
            placeholder='e.g., "Key Left"'
            autoFocus
          />
          {nameError && <p className="text-xs text-red-400 mt-1">Name is required</p>}
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as LightType)}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            {LIGHT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">DMX Start Address</label>
          <input
            type="number"
            min="1"
            max="511"
            value={dmxAddress}
            onChange={(e) => setDmxAddress(Number(e.target.value))}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
          <p className="text-[10px] text-gray-500 mt-1">Uses 2 channels: intensity + CCT</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1.5 text-sm rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
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
