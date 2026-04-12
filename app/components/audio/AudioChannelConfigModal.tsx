"use client";

import { useState } from "react";
import type { AudioChannel } from "@/lib/types";
import Modal from "../shared/Modal";
import ConfirmDialog from "../shared/ConfirmDialog";
import { audioApi } from "@/lib/client-api";
import { useToast } from "../shared/ToastContext";

interface AudioChannelConfigModalProps {
  channel?: AudioChannel; // undefined = create mode
  onClose: () => void;
  onSaved: () => void;
}

export default function AudioChannelConfigModal({ channel, onClose, onSaved }: AudioChannelConfigModalProps) {
  const isEdit = !!channel;
  const [name, setName] = useState(channel?.name ?? "");
  const [oscChannel, setOscChannel] = useState(String(channel?.oscChannel ?? 1));
  const [saving, setSaving] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const toast = useToast();

  const isDirty = isEdit ? name !== channel.name || oscChannel !== String(channel.oscChannel) : name.trim().length > 0;

  const handleSave = async () => {
    if (!name.trim()) {
      toast("error", "Name is required");
      return;
    }

    setSaving(true);
    try {
      const body = { name: name.trim(), oscChannel: parseInt(oscChannel, 10) };
      const res = isEdit ? await audioApi.update(channel.id, body) : await audioApi.create(body);

      if (!res.ok) {
        const data = await res.json();
        toast("error", data.error || `Failed to ${isEdit ? "update" : "create"} channel`);
        return;
      }
      toast("success", isEdit ? "Channel updated" : "Channel created");
      onSaved();
      onClose();
    } catch {
      toast("error", `Failed to ${isEdit ? "update" : "create"} channel`);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (isDirty) {
      setShowDiscard(true);
    } else {
      onClose();
    }
  };

  return (
    <>
      <Modal ariaLabel={isEdit ? "Edit Channel" : "Add Channel"} onClose={handleClose}>
        <div className="space-y-4">
          <div>
            <label htmlFor="audio-channel-name" className="mb-1 block text-xs text-studio-400">
              Channel Name
            </label>
            <input
              id="audio-channel-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="e.g. Presenter"
              className="w-full rounded-badge border border-studio-600 bg-studio-800 px-3 py-2 text-sm text-studio-200 placeholder-studio-600"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="audio-channel-osc" className="mb-1 block text-xs text-studio-400">
              TotalMix Input Channel
            </label>
            <input
              id="audio-channel-osc"
              type="number"
              value={oscChannel}
              onChange={(e) => setOscChannel(e.target.value)}
              min={1}
              max={128}
              className="w-full rounded-badge border border-studio-600 bg-studio-800 px-3 py-2 text-sm text-studio-200"
              aria-describedby="audio-channel-osc-help"
            />
            <p id="audio-channel-osc-help" className="mt-1 text-xs text-studio-500">
              The input channel number in TotalMix FX (1-4 for mic preamps).
            </p>
          </div>

          <div className="flex justify-end gap-2 border-t border-studio-700 pt-3">
            <button
              onClick={handleClose}
              className="rounded-badge border border-studio-600 px-4 py-2 text-sm text-studio-400 transition-colors hover:bg-studio-750"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="rounded-badge bg-accent-blue px-4 py-2 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80 disabled:opacity-50"
            >
              {saving ? "Saving..." : isEdit ? "Save" : "Create"}
            </button>
          </div>
        </div>
      </Modal>

      {showDiscard && (
        <ConfirmDialog
          title="Discard Changes"
          message="You have unsaved changes. Discard them?"
          confirmLabel="Discard"
          onConfirm={onClose}
          onCancel={() => setShowDiscard(false)}
        />
      )}
    </>
  );
}
