"use client";

import { useState, useEffect, useRef } from "react";
import type { Light, LightingSettings } from "@/lib/types";
import { getChannelCount } from "@/lib/light-types";
import { lightsApi } from "@/lib/client-api";
import { useToast } from "../shared/ToastContext";
import Modal from "../shared/Modal";
import ConfirmDialog from "../shared/ConfirmDialog";

interface LightingSettingsModalProps {
  lightingSettings: LightingSettings;
  lights: Light[];
  onClose: () => void;
}

export default function LightingSettingsModal({ lightingSettings, lights, onClose }: LightingSettingsModalProps) {
  const [ip, setIp] = useState(lightingSettings.apolloBridgeIp);
  const [universe, setUniverse] = useState(lightingSettings.dmxUniverse);
  const [enabled, setEnabled] = useState(lightingSettings.dmxEnabled);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const toast = useToast();
  const autoTestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const testingRef = useRef(false);

  const isDirty =
    ip !== lightingSettings.apolloBridgeIp ||
    universe !== lightingSettings.dmxUniverse ||
    enabled !== lightingSettings.dmxEnabled;

  // Debounced auto-test when IP changes
  useEffect(() => {
    if (autoTestTimer.current) clearTimeout(autoTestTimer.current);
    setTestResult(null);
    const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
    if (!ipv4 || testingRef.current) return;
    autoTestTimer.current = setTimeout(() => {
      handleTest();
    }, 1500);
    return () => {
      if (autoTestTimer.current) clearTimeout(autoTestTimer.current);
    };
  }, [ip]);

  function handleClose() {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await lightsApi.updateSettings({ apolloBridgeIp: ip, dmxUniverse: universe, dmxEnabled: enabled });
      toast("success", "Lighting settings saved");
      onClose();
    } catch {
      toast("error", "Failed to save settings");
    }
    setSaving(false);
  }

  async function handleTest() {
    testingRef.current = true;
    setTesting(true);
    setTestResult(null);
    try {
      await lightsApi.updateSettings({ apolloBridgeIp: ip, dmxUniverse: universe, dmxEnabled: true });
      const res = await lightsApi.fetchStatus();
      const data = await res.json();
      if (data.reachable) {
        setTestResult("Bridge reachable — DMX active");
      } else {
        setTestResult(`Bridge unreachable at ${ip}`);
      }
      setEnabled(true);
    } catch {
      setTestResult("Connection failed");
    }
    setTesting(false);
    testingRef.current = false;
  }

  return (
    <Modal
      onClose={handleClose}
      ariaLabel="Lighting Settings"
      preventBackdropClose={isDirty}
      onBackdropClick={() => setShowDiscardConfirm(true)}
    >
      <div
        className="w-full max-w-md animate-scale-in rounded-card border border-studio-700 bg-studio-850 p-6 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-5 text-lg font-semibold text-studio-100">Lighting Settings</h2>

        <div className="space-y-4">
          {/* Apollo Bridge IP */}
          <div>
            <label className="mb-1 block text-xs font-medium text-studio-400">Apollo Bridge IP</label>
            <input
              type="text"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              className="w-full"
              placeholder="2.0.0.1"
            />
            <p className="mt-1 text-xs text-studio-500">
              The network gateway to your Litepanels fixtures. Default: 2.0.0.1
            </p>
          </div>

          {/* Test connection */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="rounded-badge bg-studio-700 px-3 py-1.5 text-xs text-studio-300 transition-colors hover:bg-studio-600 disabled:opacity-50"
            >
              {testing ? "Testing..." : "Test Connection"}
            </button>
            {testResult && (
              <span className={`text-xs ${testResult.includes("reachable —") ? "text-accent-green" : "text-red-400"}`}>
                {testResult}
              </span>
            )}
          </div>

          {/* DMX Universe */}
          <div>
            <label className="mb-1 block text-xs font-medium text-studio-400">DMX Universe</label>
            <input
              type="number"
              min="1"
              max="63999"
              value={universe}
              onChange={(e) => setUniverse(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* DMX Output toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-studio-300">DMX Output</label>
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`relative h-7 w-12 rounded-full transition-all duration-200 ${
                enabled ? "bg-accent-blue" : "bg-studio-600"
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-all duration-200 ${
                  enabled ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>

          {/* DMX address reference */}
          {lights.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-studio-400">DMX Address Map</label>
              <div className="space-y-0.5 rounded-badge bg-studio-900 p-2">
                {lights.map((l) => {
                  const chCount = getChannelCount(l.type);
                  return (
                    <div key={l.id} className="flex justify-between text-xs text-studio-400">
                      <span>{l.name}</span>
                      <span className="font-mono tabular-nums">
                        Ch {l.dmxStartAddress}–{l.dmxStartAddress + chCount - 1}{" "}
                        <span className="text-studio-600">({chCount}ch)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
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
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-badge bg-accent-blue px-3 py-1.5 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
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
