"use client";

import type { ReactNode } from "react";
import { getChannelCount } from "@/lib/light-types";
import { TYPE_SHORT_LABELS } from "./constants";
import type { BridgeConfig, CrmxTab, LightEntry } from "./types";

interface BridgeSetupStepProps {
  bridgeConfig: BridgeConfig;
  testing: boolean;
  testResult: string | null;
  showTroubleshooting: boolean;
  onBridgeConfigChange: (next: BridgeConfig) => void;
  onTestConnection: () => void;
  onToggleTroubleshooting: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onNext: () => void;
}

export function BridgeSetupStep({
  bridgeConfig,
  testing,
  testResult,
  showTroubleshooting,
  onBridgeConfigChange,
  onTestConnection,
  onToggleTroubleshooting,
  onPrev,
  onSkip,
  onNext,
}: BridgeSetupStepProps) {
  return (
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
              Find the Bridge&apos;s IP address — it&apos;s{" "}
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
            onChange={(event) => onBridgeConfigChange({ ...bridgeConfig, ip: event.target.value })}
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
            onChange={(event) => onBridgeConfigChange({ ...bridgeConfig, universe: Number(event.target.value) })}
            className="w-full"
            aria-describedby="setup-bridge-universe-help"
          />
          <p id="setup-bridge-universe-help" className="mt-1 text-xs text-studio-500">
            Usually 1 unless you have multiple universes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTestConnection}
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

        <button
          type="button"
          onClick={onToggleTroubleshooting}
          className="text-xs text-studio-500 hover:text-studio-300"
        >
          {showTroubleshooting ? "Hide" : "Show"} troubleshooting tips
        </button>
        {showTroubleshooting && (
          <div className="rounded-card border border-studio-700 bg-studio-900/50 p-3 text-xs text-studio-400">
            <ul className="list-inside list-disc space-y-1">
              <li>Make sure the Bridge is powered on (LED should be lit)</li>
              <li>Check that the Ethernet cable is firmly connected on both ends</li>
              <li>
                Try connecting to the Bridge&apos;s WiFi network (SSID and password are on the bottom of the device)
              </li>
              <li>Open the Bridge&apos;s web interface by typing the IP address in a browser to verify connectivity</li>
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
          type="button"
          onClick={onPrev}
          className="rounded-badge bg-studio-700 px-3 py-1.5 text-sm text-studio-300 transition-colors hover:bg-studio-600"
        >
          Back
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="rounded-badge bg-studio-700 px-3 py-1.5 text-sm text-studio-300 transition-colors hover:bg-studio-600"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={onNext}
            className="rounded-badge bg-accent-blue px-3 py-1.5 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80"
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}

interface CrmxPairingStepProps {
  crmxTab: CrmxTab;
  onSelectTab: (tab: CrmxTab) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function CrmxPairingStep({ crmxTab, onSelectTab, onPrev, onNext }: CrmxPairingStepProps) {
  return (
    <>
      <h2 className="mb-2 text-lg font-semibold text-studio-100">CRMX Wireless Pairing</h2>
      <p className="mb-3 text-sm text-studio-400">
        Each light needs to be wirelessly paired with the Apollo Bridge. Select your light type below for step-by-step
        instructions.
      </p>

      <div className="mb-3 flex gap-1 rounded-badge bg-studio-900 p-1">
        {(["astra", "infinimat", "infinibar"] as CrmxTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onSelectTab(tab)}
            className={`flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
              crmxTab === tab ? "bg-studio-700 text-studio-100" : "text-studio-500 hover:text-studio-300"
            }`}
          >
            {tab === "astra" ? "Astra" : tab === "infinimat" ? "Infinimat" : "Infinibar PB12"}
          </button>
        ))}
      </div>

      {crmxTab === "astra" && (
        <PairingCard title="Litepanels Astra Bi-Color Soft (with CRMX module)">
          <li>Make sure the wireless DMX module is inserted into the rear of the Astra panel</li>
          <li>Power on the Astra and open the on-screen menu</li>
          <li>
            Navigate to <Mono>Settings &gt; DMX Settings &gt; Wireless DMX</Mono>
          </li>
          <li>
            Select <Mono>Unlink Radio</Mono> to clear any previous connections
          </li>
          <li>
            Select <Mono>Link</Mono> to start pairing mode
          </li>
          <li>
            On the Apollo Bridge, firmly press the <strong className="font-medium text-studio-300">Link CRMX</strong>{" "}
            button
          </li>
          <li>Wait until the wireless indicator bars turn green on the Astra&apos;s menu</li>
          <li>Repeat for each Astra panel</li>
        </PairingCard>
      )}

      {crmxTab === "infinimat" && (
        <PairingCard title="Aputure Infinimat 2x4">
          <li>Power on the Infinimat and access the touch menu</li>
          <li>
            Navigate to <Mono>Menu &gt; CRMX Setting</Mono>
          </li>
          <li>
            Enable <Mono>CRMX Status</Mono> (set to On)
          </li>
          <li>
            On the Apollo Bridge, firmly press the <strong className="font-medium text-studio-300">Link CRMX</strong>{" "}
            button
          </li>
          <li>The Infinimat will automatically pair within a few seconds</li>
          <li>The wireless link indicator will turn green when connected</li>
        </PairingCard>
      )}

      {crmxTab === "infinibar" && (
        <div className="rounded-card border border-studio-700 bg-studio-900/50 p-3">
          <p className="mb-2 text-xs font-medium text-studio-300">Aputure Infinibar PB12</p>
          <ol className="list-inside list-decimal space-y-1.5 text-xs text-studio-400">
            <li>Power on the Infinibar PB12 and press MENU to access the system menu</li>
            <li>
              Navigate to <Mono>CRMX Setting</Mono>
            </li>
            <li>
              Turn on <Mono>CRMX Status</Mono> — the fixture will start searching for pairable signals
            </li>
            <li>
              On the Apollo Bridge, firmly press the <strong className="font-medium text-studio-300">Link CRMX</strong>{" "}
              button
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
          type="button"
          onClick={onPrev}
          className="rounded-badge bg-studio-700 px-3 py-1.5 text-sm text-studio-300 transition-colors hover:bg-studio-600"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded-badge bg-accent-blue px-3 py-1.5 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80"
        >
          I&apos;ve paired all my lights
        </button>
      </div>
    </>
  );
}

interface AddressAssignmentStepProps {
  lights: LightEntry[];
  overlaps: Set<number>;
  onAddressChange: (index: number, value: number) => void;
  onAutoAssign: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export function AddressAssignmentStep({
  lights,
  overlaps,
  onAddressChange,
  onAutoAssign,
  onPrev,
  onNext,
}: AddressAssignmentStepProps) {
  return (
    <>
      <h2 className="mb-2 text-lg font-semibold text-studio-100">DMX Address Assignment</h2>
      <p className="mb-3 text-sm text-studio-400">
        Each light needs a unique set of DMX channels. Think of channels like mailbox numbers — each light listens for
        its data on specific channel numbers.
      </p>
      <p className="mb-3 text-xs text-studio-500">
        The addresses below have been auto-assigned with no overlaps. You can adjust them if your lights are already set
        to specific addresses.
      </p>

      <div className="mb-3 space-y-1 rounded-badge bg-studio-900 p-2">
        {lights.map((light, index) => {
          const channelCount = getChannelCount(light.type);
          const isOverlap = overlaps.has(index);

          return (
            <div
              key={`${light.name}-${index}`}
              className={`flex items-center gap-2 text-xs ${isOverlap ? "text-red-400" : "text-studio-400"}`}
            >
              <span className="w-24 truncate" title={light.name}>
                {light.name}
              </span>
              <span className="text-xxs text-studio-500">({channelCount}ch)</span>
              <span className="text-studio-500">Ch</span>
              <input
                type="number"
                min="1"
                max={512 - channelCount + 1}
                value={light.dmxStartAddress}
                onChange={(event) => onAddressChange(index, Number(event.target.value))}
                className={`w-14 rounded-badge border bg-studio-800 px-1.5 py-0.5 text-center font-mono text-xs text-studio-100 focus:outline-none ${
                  isOverlap ? "border-red-500" : "border-studio-700"
                }`}
              />
              <span className="font-mono text-studio-500">–{light.dmxStartAddress + channelCount - 1}</span>
            </div>
          );
        })}
      </div>

      {overlaps.size > 0 && (
        <p className="mb-2 text-xs text-red-400">Some addresses overlap. Lights sharing channels will interfere.</p>
      )}

      <button type="button" onClick={onAutoAssign} className="mb-2 text-xs text-accent-blue hover:text-accent-blue/80">
        Auto-assign addresses (no gaps)
      </button>

      <p className="mb-3 text-xxs text-studio-500">
        Set each physical light&apos;s DMX address to match the values above. On Astra: Settings &gt; DMX &gt; DMX
        Address. On Aputure: Menu &gt; DMX Settings &gt; DMX Address Set.
      </p>

      <div className="mt-4 flex justify-between">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-badge bg-studio-700 px-3 py-1.5 text-sm text-studio-300 transition-colors hover:bg-studio-600"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded-badge bg-accent-blue px-3 py-1.5 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80"
        >
          Next
        </button>
      </div>
    </>
  );
}

interface FixturesStepProps {
  lights: LightEntry[];
  lightsConfigured: boolean;
  onNameChange: (index: number, value: string) => void;
  onConfigureLights: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export function FixturesStep({
  lights,
  lightsConfigured,
  onNameChange,
  onConfigureLights,
  onNext,
  onPrev,
}: FixturesStepProps) {
  return (
    <>
      <h2 className="mb-2 text-lg font-semibold text-studio-100">Load fixtures into the console</h2>
      <p className="mb-4 text-sm text-studio-400">
        Review and customize your fixture names, then load them into the console.
      </p>
      <div className="mb-3 max-h-64 space-y-1.5 overflow-y-auto rounded-badge bg-studio-900 p-2">
        {lights.map((light, index) => (
          <div key={`${light.name}-${index}`} className="flex items-center gap-2">
            <input
              type="text"
              value={light.name}
              onChange={(event) => onNameChange(index, event.target.value)}
              className="flex-1 rounded-badge border border-studio-700 bg-studio-800 px-2 py-1 text-xs text-studio-100 focus:border-accent-blue focus:outline-none"
            />
            <span className="w-20 text-right text-xxs text-studio-500">{TYPE_SHORT_LABELS[light.type]}</span>
            <span className="w-16 text-right font-mono text-xxs text-studio-500">
              Ch {light.dmxStartAddress}–{light.dmxStartAddress + getChannelCount(light.type) - 1}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={onConfigureLights}
          disabled={lightsConfigured}
          className="w-full rounded-badge bg-accent-blue px-4 py-2 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80 disabled:opacity-50"
        >
          {lightsConfigured ? "Fixtures Loaded" : `Load ${lights.length} Fixtures into Console`}
        </button>
        <button
          type="button"
          onClick={onNext}
          className="w-full rounded-badge bg-studio-700 px-4 py-2 text-sm font-medium text-studio-200 transition-colors hover:bg-studio-600"
        >
          {lightsConfigured ? "Next" : "Skip — I'll add lights manually"}
        </button>
      </div>
      <div className="mt-4 flex justify-start">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-badge bg-studio-700 px-3 py-1.5 text-sm text-studio-300 transition-colors hover:bg-studio-600"
        >
          Back
        </button>
      </div>
    </>
  );
}

interface StreamDeckStepProps {
  onPrev: () => void;
  onNext: () => void;
}

export function StreamDeckStep({ onPrev, onNext }: StreamDeckStepProps) {
  return (
    <>
      <h2 className="mb-2 text-lg font-semibold text-studio-100">Companion + Stream Deck+ (Optional)</h2>
      <p className="mb-3 text-sm text-studio-400">
        Use Bitfocus Companion with an Elgato Stream Deck+ for physical control of the console.
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
              Add a <Mono>Generic HTTP</Mono> connection pointed at <Mono>http://localhost:3000</Mono>
            </li>
            <li>Configure buttons to send HTTP POST requests to the console API</li>
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
          type="button"
          onClick={onPrev}
          className="rounded-badge bg-studio-700 px-3 py-1.5 text-sm text-studio-300 transition-colors hover:bg-studio-600"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded-badge bg-accent-blue px-3 py-1.5 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80"
        >
          Next
        </button>
      </div>
    </>
  );
}

function PairingCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-card border border-studio-700 bg-studio-900/50 p-3">
      <p className="mb-2 text-xs font-medium text-studio-300">{title}</p>
      <ol className="list-inside list-decimal space-y-1.5 text-xs text-studio-400">{children}</ol>
    </div>
  );
}

function Mono({ children }: { children: ReactNode }) {
  return <span className="font-mono text-studio-300">{children}</span>;
}
