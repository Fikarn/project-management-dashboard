"use client";

import { useState, useEffect, useRef } from "react";
import type { LightType } from "@/lib/types";
import { LIGHT_TYPE_CONFIGS, getChannelCount } from "@/lib/light-types";
import { lightsApi, settingsApi, utilApi } from "@/lib/client-api";
import { useToast } from "./shared/ToastContext";
import Modal from "./shared/Modal";

interface SetupWizardProps {
  onComplete: () => void;
  onDataChange: () => void;
}

type UseCase = "pm-only" | "pm-lighting" | null;

interface BridgeConfig {
  ip: string;
  universe: number;
}

interface LightEntry {
  name: string;
  type: LightType;
  dmxStartAddress: number;
}

const DEFAULT_STUDIO_LIGHTS: LightEntry[] = [
  { name: "Key Left", type: "astra-bicolor", dmxStartAddress: 1 },
  { name: "Key Right", type: "astra-bicolor", dmxStartAddress: 3 },
  { name: "Fill", type: "astra-bicolor", dmxStartAddress: 5 },
  { name: "Background", type: "infinimat", dmxStartAddress: 7 },
  { name: "BG Bar 1", type: "infinibar-pb12", dmxStartAddress: 9 },
  { name: "BG Bar 2", type: "infinibar-pb12", dmxStartAddress: 17 },
  { name: "BG Bar 3", type: "infinibar-pb12", dmxStartAddress: 25 },
  { name: "BG Bar 4", type: "infinibar-pb12", dmxStartAddress: 33 },
];

const TYPE_SHORT_LABELS: Record<LightType, string> = {
  "astra-bicolor": "Astra",
  infinimat: "Infinimat",
  "infinibar-pb12": "Infinibar PB12",
};

type CrmxTab = "astra" | "infinimat" | "infinibar";

export default function SetupWizard({ onComplete, onDataChange }: SetupWizardProps) {
  const [step, setStep] = useState(0);
  const [useCase, setUseCase] = useState<UseCase>(null);
  const [bridgeConfig, setBridgeConfig] = useState<BridgeConfig>({ ip: "", universe: 1 });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [crmxTab, setCrmxTab] = useState<CrmxTab>("astra");
  const [lights, setLights] = useState<LightEntry[]>(DEFAULT_STUDIO_LIGHTS);
  const [lightsConfigured, setLightsConfigured] = useState(false);
  const [testingLight, setTestingLight] = useState<number | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [showBridgeTroubleshooting, setShowBridgeTroubleshooting] = useState(false);
  const toast = useToast();
  const autoTestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLighting = useCase === "pm-lighting";

  // PM-only: welcome, useCase, data, tips (4 steps)
  // PM+Lighting: welcome, useCase, bridge, crmx, addresses, lights, data, streamdeck, tips (9 steps)
  const totalSteps = isLighting ? 9 : 4;

  function getStepName(idx: number): string {
    if (isLighting) {
      return ["welcome", "useCase", "bridge", "crmx", "addresses", "lights", "data", "streamdeck", "tips"][idx];
    }
    return ["welcome", "useCase", "data", "tips"][idx];
  }

  // Auto-test bridge when IP changes
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
  }, [bridgeConfig.ip, step]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      await lightsApi.updateSettings({
        apolloBridgeIp: bridgeConfig.ip,
        dmxUniverse: bridgeConfig.universe,
        dmxEnabled: true,
      });
      const res = await lightsApi.fetchStatus();
      const data = await res.json();
      setTestResult(data.reachable ? "Bridge reachable" : `Bridge unreachable at ${bridgeConfig.ip}`);
    } catch {
      setTestResult("Connection failed");
    }
    setTesting(false);
  }

  // Auto-assign DMX addresses sequentially with no overlaps
  function autoAssignAddresses() {
    let nextAddr = 1;
    setLights((prev) =>
      prev.map((l) => {
        const chCount = getChannelCount(l.type);
        const addr = nextAddr;
        nextAddr += chCount;
        return { ...l, dmxStartAddress: addr };
      })
    );
  }

  // Check for address overlaps
  function getOverlaps(): Set<number> {
    const overlaps = new Set<number>();
    for (let i = 0; i < lights.length; i++) {
      const chA = getChannelCount(lights[i].type);
      for (let j = i + 1; j < lights.length; j++) {
        const chB = getChannelCount(lights[j].type);
        const aStart = lights[i].dmxStartAddress;
        const aEnd = aStart + chA - 1;
        const bStart = lights[j].dmxStartAddress;
        const bEnd = bStart + chB - 1;
        if (aStart <= bEnd && bStart <= aEnd) {
          overlaps.add(i);
          overlaps.add(j);
        }
      }
    }
    return overlaps;
  }

  async function handleConfigureLights() {
    try {
      await lightsApi.updateSettings({
        apolloBridgeIp: bridgeConfig.ip,
        dmxUniverse: bridgeConfig.universe,
        dmxEnabled: true,
      });
      for (const light of lights) {
        await lightsApi.create({
          name: light.name,
          type: light.type,
          dmxStartAddress: light.dmxStartAddress,
        });
      }
      setLightsConfigured(true);
      toast("success", `${lights.length} lights configured`);
      onDataChange();
    } catch {
      toast("error", "Failed to configure lights");
    }
  }

  async function handleTestLight(idx: number) {
    setTestingLight(idx);
    const light = lights[idx];
    try {
      // Create a temporary flash by sending max intensity then off
      await lightsApi.sendDmx({ lightId: `flash-test-${idx}`, intensity: 100, cct: 5000, on: true });
    } catch {
      // Ignore — test is best-effort
    }
    setTimeout(() => setTestingLight(null), 1000);
  }

  async function handleSeed(preserveLights: boolean) {
    setSeeding(true);
    try {
      const res = await utilApi.seed({ preserveLights });
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
    localStorage.setItem("hasSeenWelcome", "1");
    try {
      await settingsApi.update({ hasCompletedSetup: true });
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
  const overlaps = getOverlaps();

  return (
    <Modal onClose={() => {}} ariaLabel="Setup Wizard">
      <div className="w-full max-w-lg animate-scale-in rounded-card border border-studio-700 bg-studio-850 p-6 shadow-modal">
        {/* ── Step: Welcome ─────────────────────────── */}
        {currentStep === "welcome" && (
          <>
            <h2 className="mb-2 text-lg font-semibold text-studio-100">Welcome to Project Manager</h2>
            <p className="mb-2 text-sm text-studio-400">
              A Kanban dashboard for tracking projects and tasks, with integrated studio lighting control via sACN/DMX.
            </p>
            <div className="mb-6 mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-card border border-studio-700 bg-studio-900/50 p-3 text-center">
                <div className="mb-1 text-2xl">&#128203;</div>
                <div className="text-xs font-medium text-studio-300">Project Tracking</div>
                <div className="text-xs text-studio-500">Kanban boards, timers, reports</div>
              </div>
              <div className="rounded-card border border-studio-700 bg-studio-900/50 p-3 text-center">
                <div className="mb-1 text-2xl">&#128161;</div>
                <div className="text-xs font-medium text-studio-300">Studio Lighting</div>
                <div className="text-xs text-studio-500">sACN control via Apollo Bridge</div>
              </div>
            </div>
            <button
              onClick={nextStep}
              className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-studio-100 transition-colors hover:bg-blue-500"
            >
              Get Started
            </button>
          </>
        )}

        {/* ── Step: Use Case ────────────────────────── */}
        {currentStep === "useCase" && (
          <>
            <h2 className="mb-2 text-lg font-semibold text-studio-100">How will you use this?</h2>
            <p className="mb-4 text-sm text-studio-400">You can always enable lighting later from the Lights view.</p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setUseCase("pm-only");
                  setStep(2);
                }}
                className="w-full rounded-card border border-studio-700 bg-studio-900/50 p-4 text-left transition-colors hover:border-studio-600"
              >
                <div className="text-sm font-medium text-studio-100">Project Management Only</div>
                <div className="text-xs text-studio-400">Kanban boards, tasks, time tracking</div>
              </button>
              <button
                onClick={() => {
                  setUseCase("pm-lighting");
                  setStep(2);
                }}
                className="w-full rounded-card border border-studio-700 bg-studio-900/50 p-4 text-left transition-colors hover:border-studio-600"
              >
                <div className="text-sm font-medium text-studio-100">Project Management + Studio Lighting</div>
                <div className="text-xs text-studio-400">
                  Everything above, plus sACN light control via Apollo Bridge
                </div>
              </button>
            </div>
          </>
        )}

        {/* ── Step: Bridge Setup ────────────────────── */}
        {currentStep === "bridge" && (
          <>
            <h2 className="mb-2 text-lg font-semibold text-studio-100">Apollo Bridge Setup</h2>
            <div className="mb-4 space-y-2 text-sm text-studio-400">
              <p>The Apollo Bridge connects your computer to your studio lights wirelessly via CRMX.</p>
              <div className="rounded-card border border-studio-700 bg-studio-900/50 p-3">
                <p className="mb-2 text-xs font-medium text-studio-300">Setup steps:</p>
                <ol className="list-inside list-decimal space-y-1 text-xs text-studio-400">
                  <li>Connect the Apollo Bridge to power (USB-C or battery)</li>
                  <li>Connect an Ethernet cable from the Bridge to your computer or network switch</li>
                  <li>
                    Find the Bridge&apos;s IP address &mdash; it&apos;s{" "}
                    <span className="font-medium text-studio-300">printed on the bottom of the device</span>
                  </li>
                  <li>Enter the IP address below and test the connection</li>
                </ol>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label htmlFor="setup-bridge-ip" className="mb-1 block text-xs text-studio-400">
                  Bridge IP Address
                </label>
                <input
                  id="setup-bridge-ip"
                  type="text"
                  value={bridgeConfig.ip}
                  onChange={(e) => setBridgeConfig((c) => ({ ...c, ip: e.target.value }))}
                  className="w-full"
                  placeholder="Enter IP from the bottom of the Bridge"
                />
              </div>
              <div>
                <label htmlFor="setup-bridge-universe" className="mb-1 block text-xs text-studio-400">
                  DMX Universe
                </label>
                <input
                  id="setup-bridge-universe"
                  type="number"
                  min="1"
                  max="63999"
                  value={bridgeConfig.universe}
                  onChange={(e) => setBridgeConfig((c) => ({ ...c, universe: Number(e.target.value) }))}
                  className="w-full"
                  aria-describedby="setup-bridge-universe-help"
                />
                <p id="setup-bridge-universe-help" className="mt-1 text-xs text-studio-500">
                  Usually 1 unless you have multiple universes
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="rounded-badge bg-studio-700 px-3 py-1.5 text-xs text-studio-300 transition-colors hover:bg-studio-600 disabled:opacity-50"
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

              {/* Troubleshooting */}
              <button
                onClick={() => setShowBridgeTroubleshooting(!showBridgeTroubleshooting)}
                className="text-xs text-studio-500 hover:text-studio-300"
              >
                {showBridgeTroubleshooting ? "Hide" : "Show"} troubleshooting tips
              </button>
              {showBridgeTroubleshooting && (
                <div className="rounded-card border border-studio-700 bg-studio-900/50 p-3 text-xs text-studio-400">
                  <ul className="list-inside list-disc space-y-1">
                    <li>Make sure the Bridge is powered on (LED should be lit)</li>
                    <li>Check that the Ethernet cable is firmly connected on both ends</li>
                    <li>
                      Try connecting to the Bridge&apos;s WiFi network (SSID and password are on the bottom of the
                      device)
                    </li>
                    <li>
                      Open the Bridge&apos;s web interface by typing the IP address in a browser to verify connectivity
                    </li>
                    <li>
                      Factory reset: press the pinhole button on the Bridge with a pin for 3 seconds (soft reset) or 10
                      seconds (full reset)
                    </li>
                  </ul>
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-between">
              <button
                onClick={prevStep}
                className="rounded-badge bg-studio-700 px-3 py-1.5 text-sm text-studio-300 transition-colors hover:bg-studio-600"
              >
                Back
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep(step + 1)}
                  className="rounded-badge bg-studio-700 px-3 py-1.5 text-sm text-studio-300 transition-colors hover:bg-studio-600"
                >
                  Skip
                </button>
                <button
                  onClick={nextStep}
                  className="rounded-badge bg-accent-blue px-3 py-1.5 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Step: CRMX Pairing Guide ─────────────── */}
        {currentStep === "crmx" && (
          <>
            <h2 className="mb-2 text-lg font-semibold text-studio-100">CRMX Wireless Pairing</h2>
            <p className="mb-3 text-sm text-studio-400">
              Each light needs to be wirelessly paired with the Apollo Bridge. Select your light type below for
              step-by-step instructions.
            </p>

            {/* Tabs */}
            <div className="mb-3 flex gap-1 rounded-badge bg-studio-900 p-1">
              {(["astra", "infinimat", "infinibar"] as CrmxTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setCrmxTab(tab)}
                  className={`flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                    crmxTab === tab ? "bg-studio-700 text-studio-100" : "text-studio-500 hover:text-studio-300"
                  }`}
                >
                  {tab === "astra" ? "Astra" : tab === "infinimat" ? "Infinimat" : "Infinibar PB12"}
                </button>
              ))}
            </div>

            {/* Astra pairing */}
            {crmxTab === "astra" && (
              <div className="rounded-card border border-studio-700 bg-studio-900/50 p-3">
                <p className="mb-2 text-xs font-medium text-studio-300">
                  Litepanels Astra Bi-Color Soft (with CRMX module)
                </p>
                <ol className="list-inside list-decimal space-y-1.5 text-xs text-studio-400">
                  <li>Make sure the wireless DMX module is inserted into the rear of the Astra panel</li>
                  <li>Power on the Astra and open the on-screen menu</li>
                  <li>
                    Navigate to{" "}
                    <span className="font-mono text-studio-300">Settings &gt; DMX Settings &gt; Wireless DMX</span>
                  </li>
                  <li>
                    Select <span className="font-mono text-studio-300">Unlink Radio</span> to clear any previous
                    connections
                  </li>
                  <li>
                    Select <span className="font-mono text-studio-300">Link</span> to start pairing mode
                  </li>
                  <li>
                    On the Apollo Bridge, firmly press the{" "}
                    <span className="font-medium text-studio-300">Link CRMX</span> button
                  </li>
                  <li>Wait until the wireless indicator bars turn green on the Astra&apos;s menu</li>
                  <li>Repeat for each Astra panel</li>
                </ol>
              </div>
            )}

            {/* Infinimat pairing */}
            {crmxTab === "infinimat" && (
              <div className="rounded-card border border-studio-700 bg-studio-900/50 p-3">
                <p className="mb-2 text-xs font-medium text-studio-300">Aputure Infinimat 2x4</p>
                <ol className="list-inside list-decimal space-y-1.5 text-xs text-studio-400">
                  <li>Power on the Infinimat and access the touch menu</li>
                  <li>
                    Navigate to <span className="font-mono text-studio-300">Menu &gt; CRMX Setting</span>
                  </li>
                  <li>
                    Enable <span className="font-mono text-studio-300">CRMX Status</span> (set to On)
                  </li>
                  <li>
                    On the Apollo Bridge, firmly press the{" "}
                    <span className="font-medium text-studio-300">Link CRMX</span> button
                  </li>
                  <li>The Infinimat will automatically pair within a few seconds</li>
                  <li>The wireless link indicator will turn green when connected</li>
                </ol>
              </div>
            )}

            {/* Infinibar pairing */}
            {crmxTab === "infinibar" && (
              <div className="rounded-card border border-studio-700 bg-studio-900/50 p-3">
                <p className="mb-2 text-xs font-medium text-studio-300">Aputure Infinibar PB12</p>
                <ol className="list-inside list-decimal space-y-1.5 text-xs text-studio-400">
                  <li>Power on the Infinibar PB12 and press MENU to access the system menu</li>
                  <li>
                    Navigate to <span className="font-mono text-studio-300">CRMX Setting</span>
                  </li>
                  <li>
                    Turn on <span className="font-mono text-studio-300">CRMX Status</span> &mdash; the fixture will
                    start searching for pairable signals
                  </li>
                  <li>
                    On the Apollo Bridge, firmly press the{" "}
                    <span className="font-medium text-studio-300">Link CRMX</span> button
                  </li>
                  <li>The Infinibar will automatically pair within ~10 seconds</li>
                  <li>Repeat for each Infinibar PB12</li>
                </ol>
                <p className="mt-2 text-xxs text-studio-500">
                  Tip: If previously paired to another transmitter, select Unlink in the CRMX menu first.
                </p>
              </div>
            )}

            <div className="mt-4 flex justify-between">
              <button
                onClick={prevStep}
                className="rounded-badge bg-studio-700 px-3 py-1.5 text-sm text-studio-300 transition-colors hover:bg-studio-600"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                className="rounded-badge bg-accent-blue px-3 py-1.5 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80"
              >
                I&apos;ve paired all my lights
              </button>
            </div>
          </>
        )}

        {/* ── Step: DMX Address Assignment ──────────── */}
        {currentStep === "addresses" && (
          <>
            <h2 className="mb-2 text-lg font-semibold text-studio-100">DMX Address Assignment</h2>
            <p className="mb-3 text-sm text-studio-400">
              Each light needs a unique set of DMX channels. Think of channels like mailbox numbers &mdash; each light
              listens for its data on specific channel numbers.
            </p>
            <p className="mb-3 text-xs text-studio-500">
              The addresses below have been auto-assigned with no overlaps. You can adjust them if your lights are
              already set to specific addresses.
            </p>

            <div className="mb-3 space-y-1 rounded-badge bg-studio-900 p-2">
              {lights.map((l, i) => {
                const chCount = getChannelCount(l.type);
                const isOverlap = overlaps.has(i);
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-2 text-xs ${isOverlap ? "text-red-400" : "text-studio-400"}`}
                  >
                    <span className="w-24 truncate" title={l.name}>
                      {l.name}
                    </span>
                    <span className="text-xxs text-studio-500">({chCount}ch)</span>
                    <span className="text-studio-500">Ch</span>
                    <input
                      type="number"
                      min="1"
                      max={512 - chCount + 1}
                      value={l.dmxStartAddress}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setLights((prev) => prev.map((ll, j) => (j === i ? { ...ll, dmxStartAddress: val } : ll)));
                      }}
                      className={`w-14 rounded-badge border bg-studio-800 px-1.5 py-0.5 text-center font-mono text-xs text-studio-100 focus:outline-none ${
                        isOverlap ? "border-red-500" : "border-studio-700"
                      }`}
                    />
                    <span className="font-mono text-studio-500">&ndash;{l.dmxStartAddress + chCount - 1}</span>
                  </div>
                );
              })}
            </div>

            {overlaps.size > 0 && (
              <p className="mb-2 text-xs text-red-400">
                Some addresses overlap. Lights sharing channels will interfere.
              </p>
            )}

            <button onClick={autoAssignAddresses} className="mb-2 text-xs text-blue-400 hover:text-blue-300">
              Auto-assign addresses (no gaps)
            </button>

            <p className="mb-3 text-xxs text-studio-500">
              Set each physical light&apos;s DMX address to match the values above. On Astra: Settings &gt; DMX &gt; DMX
              Address. On Aputure: Menu &gt; DMX Settings &gt; DMX Address Set.
            </p>

            <div className="mt-4 flex justify-between">
              <button
                onClick={prevStep}
                className="rounded-badge bg-studio-700 px-3 py-1.5 text-sm text-studio-300 transition-colors hover:bg-studio-600"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                className="rounded-badge bg-accent-blue px-3 py-1.5 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80"
              >
                Next
              </button>
            </div>
          </>
        )}

        {/* ── Step: Add Lights ─────────────────────── */}
        {currentStep === "lights" && (
          <>
            <h2 className="mb-2 text-lg font-semibold text-studio-100">Configure Lights</h2>
            <p className="mb-4 text-sm text-studio-400">
              Review and customize your light names, then load them into the dashboard.
            </p>
            <div className="mb-3 max-h-64 space-y-1.5 overflow-y-auto rounded-badge bg-studio-900 p-2">
              {lights.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={l.name}
                    onChange={(e) =>
                      setLights((prev) => prev.map((ll, j) => (j === i ? { ...ll, name: e.target.value } : ll)))
                    }
                    className="flex-1 rounded-badge border border-studio-700 bg-studio-800 px-2 py-1 text-xs text-studio-100 focus:border-accent-blue focus:outline-none"
                  />
                  <span className="w-20 text-right text-xxs text-studio-500">{TYPE_SHORT_LABELS[l.type]}</span>
                  <span className="w-16 text-right font-mono text-xxs text-studio-500">
                    Ch {l.dmxStartAddress}–{l.dmxStartAddress + getChannelCount(l.type) - 1}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <button
                onClick={handleConfigureLights}
                disabled={lightsConfigured}
                className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-studio-100 transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                {lightsConfigured ? "Lights Configured" : `Add ${lights.length} Lights to Dashboard`}
              </button>
              <button
                onClick={nextStep}
                className="w-full rounded-badge bg-studio-700 px-4 py-2 text-sm font-medium text-studio-200 transition-colors hover:bg-studio-600"
              >
                {lightsConfigured ? "Next" : "Skip — I'll add lights manually"}
              </button>
            </div>
            <div className="mt-4 flex justify-start">
              <button
                onClick={prevStep}
                className="rounded-badge bg-studio-700 px-3 py-1.5 text-sm text-studio-300 transition-colors hover:bg-studio-600"
              >
                Back
              </button>
            </div>
          </>
        )}

        {/* ── Step: Sample Data ────────────────────── */}
        {currentStep === "data" && (
          <>
            <h2 className="mb-2 text-lg font-semibold text-studio-100">Set Up Your Board</h2>
            <p className="mb-4 text-sm text-studio-400">
              Start with sample projects to explore the features, or jump right in with an empty board.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleSeed(isLighting && lightsConfigured)}
                disabled={seeding}
                className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-studio-100 transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                {seeding ? "Loading..." : "Load Sample Projects"}
              </button>
              <button
                onClick={nextStep}
                className="w-full rounded-badge bg-studio-700 px-4 py-2 text-sm font-medium text-studio-200 transition-colors hover:bg-studio-600"
              >
                Start Empty
              </button>
            </div>
            <div className="mt-4 flex justify-start">
              <button
                onClick={prevStep}
                className="rounded-badge bg-studio-700 px-3 py-1.5 text-sm text-studio-300 transition-colors hover:bg-studio-600"
              >
                Back
              </button>
            </div>
          </>
        )}

        {/* ── Step: Stream Deck Setup (optional) ───── */}
        {currentStep === "streamdeck" && (
          <>
            <h2 className="mb-2 text-lg font-semibold text-studio-100">Stream Deck+ Setup (Optional)</h2>
            <p className="mb-3 text-sm text-studio-400">
              Use an Elgato Stream Deck+ with Bitfocus Companion for physical control of your lights.
            </p>
            <div className="space-y-3">
              <div className="rounded-card border border-studio-700 bg-studio-900/50 p-3">
                <p className="mb-2 text-xs font-medium text-studio-300">Setup steps:</p>
                <ol className="list-inside list-decimal space-y-1.5 text-xs text-studio-400">
                  <li>
                    Download and install <span className="font-medium text-studio-300">Bitfocus Companion</span> from
                    bitfocus.io/companion
                  </li>
                  <li>Open Companion and connect your Stream Deck+</li>
                  <li>
                    Add a <span className="font-mono text-studio-300">Generic HTTP</span> connection pointed at{" "}
                    <span className="font-mono text-studio-300">http://localhost:3000</span>
                  </li>
                  <li>Configure buttons to send HTTP POST requests to the dashboard API</li>
                </ol>
              </div>
              <div className="rounded-card border border-studio-700 bg-studio-900/50 p-3">
                <p className="mb-2 text-xs font-medium text-studio-300">Stream Deck+ dial assignments:</p>
                <div className="space-y-1 text-xs text-studio-400">
                  <div className="flex justify-between">
                    <span>Dial 1</span>
                    <span className="text-studio-300">Intensity (rotate = adjust, press = toggle)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dial 2</span>
                    <span className="text-studio-300">CCT (rotate = adjust, press = reset)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dial 3</span>
                    <span className="text-studio-300">Red (Infinibar only)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dial 4</span>
                    <span className="text-studio-300">Green/Blue (Infinibar only)</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-between">
              <button
                onClick={prevStep}
                className="rounded-badge bg-studio-700 px-3 py-1.5 text-sm text-studio-300 transition-colors hover:bg-studio-600"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                className="rounded-badge bg-accent-blue px-3 py-1.5 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80"
              >
                Next
              </button>
            </div>
          </>
        )}

        {/* ── Step: Quick Tips ─────────────────────── */}
        {currentStep === "tips" && (
          <>
            <h2 className="mb-2 text-lg font-semibold text-studio-100">You&apos;re All Set</h2>
            <p className="mb-4 text-sm text-studio-400">A few shortcuts to get you started:</p>
            <div className="space-y-2 text-sm">
              {[
                ["N", "Create a new project"],
                ["L", "Toggle lighting view"],
                ["?", "Show all keyboard shortcuts"],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between rounded-badge bg-studio-900/50 px-3 py-2">
                  <span className="text-studio-300">{desc}</span>
                  <kbd className="rounded-badge bg-studio-700 px-2 py-0.5 font-mono text-xs text-studio-300">{key}</kbd>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-studio-500">
              Your data saves automatically on every change. Backups are created every 30 minutes (last 10 kept). Press{" "}
              <kbd className="rounded-badge bg-studio-700 px-1 py-0.5 font-mono text-xs text-studio-400">E</kbd> to
              export anytime.
            </p>
            <button
              onClick={handleFinish}
              className="mt-4 w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-studio-100 transition-colors hover:bg-blue-500"
            >
              Done
            </button>
            <div className="mt-3 flex justify-start">
              <button
                onClick={prevStep}
                className="rounded-badge bg-studio-700 px-3 py-1.5 text-sm text-studio-300 transition-colors hover:bg-studio-600"
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
                i === step ? "bg-accent-blue" : i < step ? "bg-accent-blue/40" : "bg-studio-600"
              }`}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
}
