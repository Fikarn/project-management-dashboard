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
  const [expectedPeakData, setExpectedPeakData] = useState(settings.expectedPeakData);
  const [expectedSubmixLock, setExpectedSubmixLock] = useState(settings.expectedSubmixLock);
  const [expectedCompatibilityMode, setExpectedCompatibilityMode] = useState(settings.expectedCompatibilityMode);
  const [saving, setSaving] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const toast = useToast();

  const isDirty =
    oscEnabled !== settings.oscEnabled ||
    oscSendHost !== settings.oscSendHost ||
    oscSendPort !== String(settings.oscSendPort) ||
    oscReceivePort !== String(settings.oscReceivePort) ||
    expectedPeakData !== settings.expectedPeakData ||
    expectedSubmixLock !== settings.expectedSubmixLock ||
    expectedCompatibilityMode !== settings.expectedCompatibilityMode;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await audioApi.updateSettings({
        oscEnabled,
        oscSendHost,
        oscSendPort: parseInt(oscSendPort, 10),
        oscReceivePort: parseInt(oscReceivePort, 10),
        expectedPeakData,
        expectedSubmixLock,
        expectedCompatibilityMode,
        fadersPerBank: settings.fadersPerBank,
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
        <div className="space-y-5">
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

          <div className="rounded-[16px] border border-studio-700 bg-studio-950/45 px-3 py-3">
            <div className="console-label">UFX III Checklist</div>
            <div className="mt-2 space-y-2 text-sm text-studio-300">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={expectedPeakData}
                  onChange={(e) => setExpectedPeakData(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-studio-600 bg-studio-800 text-accent-blue"
                />
                <span>
                  <span className="font-medium text-studio-100">Peak data enabled</span>
                  <span className="mt-0.5 block text-xs text-studio-500">
                    TotalMix FX &rarr; Settings &rarr; OSC &rarr; “Send Peak Level Data”.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={expectedSubmixLock}
                  onChange={(e) => setExpectedSubmixLock(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-studio-600 bg-studio-800 text-accent-blue"
                />
                <span>
                  <span className="font-medium text-studio-100">Remote locked to submix</span>
                  <span className="mt-0.5 block text-xs text-studio-500">
                    Keep OSC in submix mode so send levels always target the selected output mix.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={expectedCompatibilityMode}
                  onChange={(e) => setExpectedCompatibilityMode(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-studio-600 bg-studio-800 text-accent-blue"
                />
                <span>
                  <span className="font-medium text-studio-100">Compatibility mode noted</span>
                  <span className="mt-0.5 block text-xs text-studio-500">
                    Only enable this in TotalMix if your OSC client requires it. This console assumes modern OSC
                    behavior.
                  </span>
                </span>
              </label>
            </div>

            <div className="mt-3 rounded-[14px] border border-studio-800 bg-studio-900/60 px-3 py-2.5 text-xs text-studio-400">
              The console is fixed for UFX III inputs 1-12, software playback 1/2 through 11/12, and three output mixes:
              main XLR, Phones 1, and Phones 2. Opening the page does not push stored state to TotalMix.
            </div>
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
