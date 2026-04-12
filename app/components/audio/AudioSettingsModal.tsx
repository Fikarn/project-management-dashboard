"use client";

import { useState } from "react";
import type { AudioSettings } from "@/lib/types";
import Modal from "../shared/Modal";
import ConfirmDialog from "../shared/ConfirmDialog";
import { audioApi } from "@/lib/client-api";
import { useToast } from "../shared/ToastContext";

interface AudioSettingsModalProps {
  settings: AudioSettings;
  onClose: () => void;
  onSaved: () => void;
}

export default function AudioSettingsModal({ settings, onClose, onSaved }: AudioSettingsModalProps) {
  const [oscEnabled, setOscEnabled] = useState(settings.oscEnabled);
  const [oscSendHost, setOscSendHost] = useState(settings.oscSendHost);
  const [oscSendPort, setOscSendPort] = useState(String(settings.oscSendPort));
  const [oscReceivePort, setOscReceivePort] = useState(String(settings.oscReceivePort));
  const [saving, setSaving] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const toast = useToast();

  const isDirty =
    oscEnabled !== settings.oscEnabled ||
    oscSendHost !== settings.oscSendHost ||
    oscSendPort !== String(settings.oscSendPort) ||
    oscReceivePort !== String(settings.oscReceivePort);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await audioApi.updateSettings({
        oscEnabled,
        oscSendHost,
        oscSendPort: parseInt(oscSendPort, 10),
        oscReceivePort: parseInt(oscReceivePort, 10),
      });
      if (!res.ok) {
        const data = await res.json();
        toast("error", data.error || "Failed to save audio settings");
        return;
      }
      toast("success", "Audio settings saved");
      onSaved();
      onClose();
    } catch {
      toast("error", "Failed to save audio settings");
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
      <Modal ariaLabel="Audio Settings" onClose={handleClose}>
        <div className="space-y-4">
          {/* OSC Enable/Disable */}
          <label htmlFor="audio-settings-osc-enabled" className="flex items-center gap-3">
            <input
              id="audio-settings-osc-enabled"
              type="checkbox"
              checked={oscEnabled}
              onChange={(e) => setOscEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-studio-600 bg-studio-800 text-accent-blue"
            />
            <span className="text-sm text-studio-200">Enable OSC (TotalMix FX)</span>
          </label>

          {/* Host */}
          <div>
            <label htmlFor="audio-settings-host" className="mb-1 block text-xs text-studio-400">
              TotalMix Host
            </label>
            <input
              id="audio-settings-host"
              type="text"
              value={oscSendHost}
              onChange={(e) => setOscSendHost(e.target.value)}
              placeholder="127.0.0.1"
              className="w-full rounded-badge border border-studio-600 bg-studio-800 px-3 py-2 text-sm text-studio-200 placeholder-studio-600"
            />
          </div>

          {/* Ports */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="audio-settings-send-port" className="mb-1 block text-xs text-studio-400">
                Send Port
              </label>
              <input
                id="audio-settings-send-port"
                type="number"
                value={oscSendPort}
                onChange={(e) => setOscSendPort(e.target.value)}
                min={1}
                max={65535}
                className="w-full rounded-badge border border-studio-600 bg-studio-800 px-3 py-2 text-sm text-studio-200"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="audio-settings-receive-port" className="mb-1 block text-xs text-studio-400">
                Receive Port
              </label>
              <input
                id="audio-settings-receive-port"
                type="number"
                value={oscReceivePort}
                onChange={(e) => setOscReceivePort(e.target.value)}
                min={1}
                max={65535}
                className="w-full rounded-badge border border-studio-600 bg-studio-800 px-3 py-2 text-sm text-studio-200"
              />
            </div>
          </div>

          <p className="text-xxs text-studio-500">
            Configure OSC to match TotalMix FX settings (Options &rarr; Settings &rarr; OSC tab).
          </p>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t border-studio-700 pt-3">
            <button
              onClick={handleClose}
              className="rounded-badge border border-studio-600 px-4 py-2 text-sm text-studio-400 transition-colors hover:bg-studio-750"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="rounded-badge bg-accent-blue px-4 py-2 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
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
