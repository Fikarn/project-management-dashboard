"use client";

import { useState, useEffect, useRef } from "react";
import type { Light, LightingSettings } from "@/lib/types";
import { useToast } from "./ToastContext";
import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";

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
      await fetch("/api/lights/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apolloBridgeIp: ip,
          dmxUniverse: universe,
          dmxEnabled: enabled,
        }),
      });
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
      // First save, which reinitializes DMX
      await fetch("/api/lights/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apolloBridgeIp: ip,
          dmxUniverse: universe,
          dmxEnabled: true,
        }),
      });
      // Then check status (includes network reachability probe)
      const res = await fetch("/api/lights/status");
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
        className="w-full max-w-md space-y-4 rounded-lg border border-gray-700 bg-gray-800 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white">Lighting Settings</h2>

        {/* Apollo Bridge IP — first */}
        <div>
          <label className="mb-1 block text-xs text-gray-400">Apollo Bridge IP</label>
          <input
            type="text"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            placeholder="2.0.0.1"
          />
          <p className="mt-1 text-xs text-gray-500">
            The network gateway to your Litepanels fixtures. Default: 2.0.0.1
          </p>
        </div>

        {/* Test connection — immediately below IP */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="rounded bg-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-600 disabled:opacity-50"
          >
            {testing ? "Testing..." : "Test Connection"}
          </button>
          {testResult && (
            <span className={`text-xs ${testResult.includes("reachable —") ? "text-green-400" : "text-red-400"}`}>
              {testResult}
            </span>
          )}
        </div>

        {/* DMX Universe */}
        <div>
          <label className="mb-1 block text-xs text-gray-400">DMX Universe</label>
          <input
            type="number"
            min="1"
            max="63999"
            value={universe}
            onChange={(e) => setUniverse(Number(e.target.value))}
            className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* DMX Output toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-300">DMX Output</label>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`relative h-5 w-10 rounded-full transition-colors ${enabled ? "bg-blue-600" : "bg-gray-600"}`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                enabled ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>

        {/* DMX address reference */}
        {lights.length > 0 && (
          <div>
            <label className="mb-1 block text-xs text-gray-400">DMX Addresses</label>
            <p className="mb-1.5 text-xs text-gray-500">Each light uses 2 channels: intensity + color temperature</p>
            <div className="space-y-0.5 rounded bg-gray-900 p-2">
              {lights.map((l) => (
                <div key={l.id} className="flex justify-between text-xs text-gray-400">
                  <span>{l.name}</span>
                  <span className="font-mono">
                    Ch {l.dmxStartAddress}-{l.dmxStartAddress + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded bg-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
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
