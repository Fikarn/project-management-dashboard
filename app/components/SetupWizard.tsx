"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "./ToastContext";
import Modal from "./Modal";

interface SetupWizardProps {
  onComplete: () => void;
  onDataChange: () => void;
}

type UseCase = "pm-only" | "pm-lighting" | null;

interface BridgeConfig {
  ip: string;
  universe: number;
}

const STUDIO_LIGHTS = [
  { name: "Key Left", type: "astra-bicolor" as const, dmxStartAddress: 1 },
  { name: "Key Right", type: "astra-bicolor" as const, dmxStartAddress: 3 },
  { name: "Fill", type: "astra-bicolor" as const, dmxStartAddress: 5 },
  { name: "Hair", type: "astra-bicolor" as const, dmxStartAddress: 7 },
  { name: "Background", type: "infinimat" as const, dmxStartAddress: 9 },
];

export default function SetupWizard({ onComplete, onDataChange }: SetupWizardProps) {
  const [step, setStep] = useState(0);
  const [useCase, setUseCase] = useState<UseCase>(null);
  const [bridgeConfig, setBridgeConfig] = useState<BridgeConfig>({ ip: "2.0.0.1", universe: 1 });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [lightsConfigured, setLightsConfigured] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const toast = useToast();
  const autoTestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLighting = useCase === "pm-lighting";

  // Total steps: PM-only = 4, PM+Lighting = 6
  const totalSteps = isLighting ? 6 : 4;

  // Map logical step index to step name
  function getStepName(idx: number): string {
    if (isLighting) {
      return ["welcome", "useCase", "bridge", "lights", "data", "tips"][idx];
    }
    return ["welcome", "useCase", "data", "tips"][idx];
  }

  // Auto-test bridge when IP changes (debounced 1.5s)
  useEffect(() => {
    if (getStepName(step) !== "bridge") return;
    if (autoTestTimer.current) clearTimeout(autoTestTimer.current);
    setTestResult(null);
    const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(bridgeConfig.ip);
    if (!ipv4) return;
    autoTestTimer.current = setTimeout(() => {
      handleTestConnection();
    }, 1500);
    return () => {
      if (autoTestTimer.current) clearTimeout(autoTestTimer.current);
    };
  }, [bridgeConfig.ip, step]);

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      // Save settings first to init DMX
      await fetch("/api/lights/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apolloBridgeIp: bridgeConfig.ip,
          dmxUniverse: bridgeConfig.universe,
          dmxEnabled: true,
        }),
      });
      const res = await fetch("/api/lights/status");
      const data = await res.json();
      setTestResult(data.reachable ? "Bridge reachable" : `Bridge unreachable at ${bridgeConfig.ip}`);
    } catch {
      setTestResult("Connection failed");
    }
    setTesting(false);
  }

  async function handleLoadStudioSetup() {
    try {
      // Save bridge settings
      await fetch("/api/lights/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apolloBridgeIp: bridgeConfig.ip,
          dmxUniverse: bridgeConfig.universe,
          dmxEnabled: true,
        }),
      });
      // Create all studio lights
      for (let i = 0; i < STUDIO_LIGHTS.length; i++) {
        const light = STUDIO_LIGHTS[i];
        await fetch("/api/lights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: light.name,
            type: light.type,
            dmxStartAddress: light.dmxStartAddress,
          }),
        });
      }
      setLightsConfigured(true);
      toast("success", "Studio lights configured");
      onDataChange();
    } catch {
      toast("error", "Failed to configure lights");
    }
  }

  async function handleSeed(preserveLights: boolean) {
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preserveLights }),
      });
      if (res.ok) {
        toast("success", "Sample projects loaded");
        onDataChange();
      } else {
        toast("error", "Failed to load sample data");
      }
    } catch {
      toast("error", "Failed to load sample data");
    }
    setSeeding(false);
  }

  async function handleFinish() {
    // Mark setup as completed in both localStorage and server
    localStorage.setItem("hasSeenWelcome", "1");
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hasCompletedSetup: true }),
      });
    } catch {
      // Non-critical
    }
    onComplete();
  }

  function nextStep() {
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 0));
  }

  const currentStep = getStepName(step);

  return (
    <Modal onClose={() => {}} ariaLabel="Setup Wizard">
      <div className="w-full max-w-lg rounded-lg border border-gray-700 bg-gray-800 p-6">
        {/* Welcome */}
        {currentStep === "welcome" && (
          <>
            <h2 className="mb-2 text-lg font-semibold text-white">Welcome to Project Manager</h2>
            <p className="mb-2 text-sm text-gray-400">
              A Kanban dashboard for tracking projects and tasks, with integrated studio lighting control via sACN/DMX.
            </p>
            <div className="mb-6 mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-gray-600 bg-gray-900/50 p-3 text-center">
                <div className="mb-1 text-2xl">&#128203;</div>
                <div className="text-xs font-medium text-gray-300">Project Tracking</div>
                <div className="text-xs text-gray-500">Kanban boards, timers, reports</div>
              </div>
              <div className="rounded-lg border border-gray-600 bg-gray-900/50 p-3 text-center">
                <div className="mb-1 text-2xl">&#128161;</div>
                <div className="text-xs font-medium text-gray-300">Studio Lighting</div>
                <div className="text-xs text-gray-500">sACN control via Apollo Bridge</div>
              </div>
            </div>
            <button
              onClick={nextStep}
              className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
            >
              Get Started
            </button>
          </>
        )}

        {/* Use Case Selection */}
        {currentStep === "useCase" && (
          <>
            <h2 className="mb-2 text-lg font-semibold text-white">How will you use this?</h2>
            <p className="mb-4 text-sm text-gray-400">You can always enable lighting later from the Lights view.</p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setUseCase("pm-only");
                  setStep(isLighting ? 2 : 2); // jump to data step
                }}
                className={`w-full rounded-lg border p-4 text-left transition-colors ${
                  useCase === "pm-only"
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-gray-600 bg-gray-900/50 hover:border-gray-500"
                }`}
              >
                <div className="text-sm font-medium text-white">Project Management Only</div>
                <div className="text-xs text-gray-400">Kanban boards, tasks, time tracking</div>
              </button>
              <button
                onClick={() => {
                  setUseCase("pm-lighting");
                  setStep(2); // go to bridge setup
                }}
                className={`w-full rounded-lg border p-4 text-left transition-colors ${
                  useCase === "pm-lighting"
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-gray-600 bg-gray-900/50 hover:border-gray-500"
                }`}
              >
                <div className="text-sm font-medium text-white">Project Management + Studio Lighting</div>
                <div className="text-xs text-gray-400">Everything above, plus sACN light control via Apollo Bridge</div>
              </button>
            </div>
          </>
        )}

        {/* Bridge Setup (lighting only) */}
        {currentStep === "bridge" && (
          <>
            <h2 className="mb-2 text-lg font-semibold text-white">Apollo Bridge Setup</h2>
            <p className="mb-4 text-sm text-gray-400">
              The Apollo Bridge is the network gateway to your Litepanels fixtures. It translates sACN into the
              proprietary wireless protocol used by Astra and Infinimat lights.
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-gray-400">Bridge IP Address</label>
                <input
                  type="text"
                  value={bridgeConfig.ip}
                  onChange={(e) => setBridgeConfig((c) => ({ ...c, ip: e.target.value }))}
                  className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  placeholder="2.0.0.1"
                />
                <p className="mt-1 text-xs text-gray-500">Default: 2.0.0.1</p>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">DMX Universe</label>
                <input
                  type="number"
                  min="1"
                  max="63999"
                  value={bridgeConfig.universe}
                  onChange={(e) => setBridgeConfig((c) => ({ ...c, universe: Number(e.target.value) }))}
                  className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="rounded bg-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-600 disabled:opacity-50"
                >
                  {testing ? "Testing..." : "Test Connection"}
                </button>
                {testResult && (
                  <span
                    className={`text-xs ${testResult.includes("reachable") && !testResult.includes("unreachable") ? "text-green-400" : "text-red-400"}`}
                  >
                    {testResult}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-between">
              <button
                onClick={prevStep}
                className="rounded bg-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-600"
              >
                Back
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // Skip bridge setup - disable DMX
                    setStep(3);
                  }}
                  className="rounded bg-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-600"
                >
                  Skip
                </button>
                <button
                  onClick={nextStep}
                  className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        {/* Add Lights (lighting only) */}
        {currentStep === "lights" && (
          <>
            <h2 className="mb-2 text-lg font-semibold text-white">Configure Lights</h2>
            <p className="mb-4 text-sm text-gray-400">
              Load the standard studio setup or add lights manually later from the Lights view.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleLoadStudioSetup}
                disabled={lightsConfigured}
                className="w-full rounded-lg border border-gray-600 bg-gray-900/50 p-4 text-left transition-colors hover:border-gray-500 disabled:opacity-50"
              >
                <div className="text-sm font-medium text-white">
                  {lightsConfigured ? "Studio Setup Loaded" : "Load Studio Setup"}
                </div>
                <div className="mt-1 space-y-0.5 text-xs text-gray-400">
                  {STUDIO_LIGHTS.map((l) => (
                    <div key={l.name} className="flex justify-between">
                      <span>{l.name}</span>
                      <span className="font-mono text-gray-500">
                        Ch {l.dmxStartAddress}-{l.dmxStartAddress + 1} &middot;{" "}
                        {l.type === "astra-bicolor" ? "Astra Bi-color" : "Infinimat"}
                      </span>
                    </div>
                  ))}
                </div>
              </button>
              <button
                onClick={nextStep}
                className="w-full rounded bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-gray-600"
              >
                {lightsConfigured ? "Next" : "Skip — I'll add lights manually"}
              </button>
            </div>
            <div className="mt-4 flex justify-start">
              <button
                onClick={prevStep}
                className="rounded bg-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-600"
              >
                Back
              </button>
            </div>
          </>
        )}

        {/* Sample Data */}
        {currentStep === "data" && (
          <>
            <h2 className="mb-2 text-lg font-semibold text-white">Set Up Your Board</h2>
            <p className="mb-4 text-sm text-gray-400">
              Start with sample projects to explore the features, or jump right in with an empty board.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleSeed(isLighting && lightsConfigured)}
                disabled={seeding}
                className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                {seeding ? "Loading..." : "Load Sample Projects"}
              </button>
              <button
                onClick={nextStep}
                className="w-full rounded bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-gray-600"
              >
                Start Empty
              </button>
            </div>
            <div className="mt-4 flex justify-start">
              <button
                onClick={prevStep}
                className="rounded bg-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-600"
              >
                Back
              </button>
            </div>
          </>
        )}

        {/* Quick Tips */}
        {currentStep === "tips" && (
          <>
            <h2 className="mb-2 text-lg font-semibold text-white">You&apos;re All Set</h2>
            <p className="mb-4 text-sm text-gray-400">A few shortcuts to get you started:</p>
            <div className="space-y-2 text-sm">
              {[
                ["N", "Create a new project"],
                ["L", "Toggle lighting view"],
                ["?", "Show all keyboard shortcuts"],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between rounded bg-gray-900/50 px-3 py-2">
                  <span className="text-gray-300">{desc}</span>
                  <kbd className="rounded bg-gray-700 px-2 py-0.5 font-mono text-xs text-gray-300">{key}</kbd>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-gray-500">
              Your data saves automatically on every change. Backups are created every 30 minutes (last 10 kept). Press{" "}
              <kbd className="rounded bg-gray-700 px-1 py-0.5 font-mono text-xs text-gray-400">E</kbd> to export
              anytime.
            </p>
            <button
              onClick={handleFinish}
              className="mt-4 w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
            >
              Done
            </button>
            <div className="mt-3 flex justify-start">
              <button
                onClick={prevStep}
                className="rounded bg-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-600"
              >
                Back
              </button>
            </div>
          </>
        )}

        {/* Progress dots */}
        <div className="mt-4 flex justify-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === step ? "bg-blue-500" : i < step ? "bg-blue-500/40" : "bg-gray-600"
              }`}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
}
