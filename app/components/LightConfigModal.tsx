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

export default function LightConfigModal({ light, onClose, onSaved }: LightConfigModalProps) {
  const isEdit = !!light;
  const [name, setName] = useState(light?.name ?? "");
  const [type, setType] = useState<LightType>(light?.type ?? "astra-bicolor");
  const [dmxAddress, setDmxAddress] = useState(light?.dmxStartAddress ?? 1);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const toast = useToast();

  const isDirty =
    name !== (light?.name ?? "") ||
    type !== (light?.type ?? "astra-bicolor") ||
    dmxAddress !== (light?.dmxStartAddress ?? 1);

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
    <Modal
      onClose={handleClose}
      ariaLabel={isEdit ? "Edit Light" : "Add Light"}
      preventBackdropClose={isDirty}
      onBackdropClick={() => setShowDiscardConfirm(true)}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-lg border border-gray-700 bg-gray-800 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white">{isEdit ? "Edit Light" : "Add Light"}</h2>

        <div>
          <label className="mb-1 block text-xs text-gray-400">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(false);
            }}
            className={`w-full rounded border bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none ${nameError ? "border-red-500" : "border-gray-600"}`}
            placeholder='e.g., "Key Left"'
            autoFocus
          />
          {nameError && <p className="mt-1 text-xs text-red-400">Name is required</p>}
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-400">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as LightType)}
            className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            {LIGHT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-400">DMX Start Address</label>
          <input
            type="number"
            min="1"
            max="511"
            value={dmxAddress}
            onChange={(e) => setDmxAddress(Number(e.target.value))}
            className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
          <p className="mt-1 text-[10px] text-gray-500">Uses 2 channels: intensity + CCT</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded bg-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
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
