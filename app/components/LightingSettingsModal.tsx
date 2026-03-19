"use client";

import { useState } from "react";
import type { Light, LightingSettings } from "@/lib/types";
import { useToast } from "./ToastContext";

interface LightingSettingsModalProps {
  lightingSettings: LightingSettings;
  lights: Light[];
  onClose: () => void;
}

export default function LightingSettingsModal({
  lightingSettings,
  lights,
  onClose,
}: LightingSettingsModalProps) {
  const [ip, setIp] = useState(lightingSettings.apolloBridgeIp);
  const [universe, setUniverse] = useState(lightingSettings.dmxUniverse);
  const [enabled, setEnabled] = useState(lightingSettings.dmxEnabled);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const toast = useToast();

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
      // Then check status
      const res = await fetch("/api/lights/status");
      const data = await res.json();
      setTestResult(data.connected ? "Connected" : "Not connected");
      setEnabled(true);
    } catch {
      setTestResult("Connection failed");
    }
    setTesting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white">Lighting Settings</h2>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Apollo Bridge IP</label>
          <input
            type="text"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            placeholder="2.0.0.1"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">DMX Universe</label>
          <input
            type="number"
            min="1"
            max="63999"
            value={universe}
            onChange={(e) => setUniverse(Number(e.target.value))}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-300">DMX Output</label>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`w-10 h-5 rounded-full relative transition-colors ${
              enabled ? "bg-blue-600" : "bg-gray-600"
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                enabled ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>

        {/* DMX address reference */}
        {lights.length > 0 && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">DMX Addresses</label>
            <div className="bg-gray-900 rounded p-2 space-y-0.5">
              {lights.map((l) => (
                <div key={l.id} className="flex justify-between text-xs text-gray-400">
                  <span>{l.name}</span>
                  <span className="font-mono">Ch {l.dmxStartAddress}-{l.dmxStartAddress + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test connection */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="px-3 py-1.5 text-xs rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50"
          >
            {testing ? "Testing..." : "Test Connection"}
          </button>
          {testResult && (
            <span className={`text-xs ${testResult === "Connected" ? "text-green-400" : "text-red-400"}`}>
              {testResult}
            </span>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
