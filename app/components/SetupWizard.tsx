"use client";

import { useEffect, useRef, useState } from "react";
import { getChannelCount } from "@/lib/light-types";
import { lightsApi, settingsApi, utilApi } from "@/lib/client-api";
import { useToast } from "./shared/ToastContext";
import { DEFAULT_STUDIO_LIGHTS, STEP_LABELS } from "./setup-wizard/constants";
import {
  AddressAssignmentStep,
  BridgeSetupStep,
  CrmxPairingStep,
  FixturesStep,
  StreamDeckStep,
} from "./setup-wizard/LightingSetupSteps";
import { PlanningSeedStep, TipsStep, UseCaseStep, WelcomeStep } from "./setup-wizard/PlanningSetupSteps";
import SetupWizardFrame from "./setup-wizard/SetupWizardFrame";
import type { BridgeConfig, CrmxTab, LightEntry, UseCase } from "./setup-wizard/types";

interface SetupWizardProps {
  onComplete: () => void;
  onDataChange: () => void;
}

export default function SetupWizard({ onComplete, onDataChange }: SetupWizardProps) {
  const [step, setStep] = useState(0);
  const [useCase, setUseCase] = useState<UseCase>(null);
  const [bridgeConfig, setBridgeConfig] = useState<BridgeConfig>({ ip: "", universe: 1 });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [crmxTab, setCrmxTab] = useState<CrmxTab>("astra");
  const [lights, setLights] = useState<LightEntry[]>(DEFAULT_STUDIO_LIGHTS);
  const [lightsConfigured, setLightsConfigured] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [showBridgeTroubleshooting, setShowBridgeTroubleshooting] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  const toast = useToast();
  const autoTestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLighting = useCase === "pm-lighting";
  const totalSteps = isLighting ? 9 : 4;

  function getStepName(index: number): string {
    if (isLighting) {
      return ["welcome", "useCase", "bridge", "crmx", "addresses", "lights", "data", "streamdeck", "tips"][index];
    }
    return ["welcome", "useCase", "data", "tips"][index];
  }

  useEffect(() => {
    if (getStepName(step) !== "bridge") return;
    if (autoTestTimer.current) clearTimeout(autoTestTimer.current);
    setTestResult(null);
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(bridgeConfig.ip)) return;

    autoTestTimer.current = setTimeout(() => {
      void handleTestConnection();
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
      const response = await lightsApi.fetchStatus();
      const data = await response.json();
      setTestResult(data.reachable ? "Bridge reachable" : `Bridge unreachable at ${bridgeConfig.ip}`);
    } catch {
      setTestResult("Connection failed");
    }
    setTesting(false);
  }

  function autoAssignAddresses() {
    let nextAddress = 1;
    setLights((previous) =>
      previous.map((light) => {
        const channelCount = getChannelCount(light.type);
        const address = nextAddress;
        nextAddress += channelCount;
        return { ...light, dmxStartAddress: address };
      })
    );
  }

  function getOverlaps(): Set<number> {
    const overlaps = new Set<number>();
    for (let i = 0; i < lights.length; i += 1) {
      const channelsA = getChannelCount(lights[i].type);
      for (let j = i + 1; j < lights.length; j += 1) {
        const channelsB = getChannelCount(lights[j].type);
        const startA = lights[i].dmxStartAddress;
        const endA = startA + channelsA - 1;
        const startB = lights[j].dmxStartAddress;
        const endB = startB + channelsB - 1;
        if (startA <= endB && startB <= endA) {
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

  async function handleSeed(preserveLights: boolean) {
    setSeeding(true);
    try {
      const response = await utilApi.seed({ preserveLights });
      if (response.ok) {
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
      // Not critical on finish.
    }
    onComplete();
  }

  const currentStep = getStepName(step);
  const overlaps = getOverlaps();

  return (
    <SetupWizardFrame
      step={step}
      totalSteps={totalSteps}
      currentStepLabel={STEP_LABELS[currentStep] ?? currentStep}
      showSkipConfirm={showSkipConfirm}
      onRequestClose={() => setShowSkipConfirm(true)}
      onConfirmSkip={handleFinish}
      onCancelSkip={() => setShowSkipConfirm(false)}
    >
      {currentStep === "welcome" && <WelcomeStep onNext={() => setStep(1)} />}

      {currentStep === "useCase" && (
        <UseCaseStep
          onChoosePlanningOnly={() => {
            setUseCase("pm-only");
            setStep(2);
          }}
          onChooseStudioControl={() => {
            setUseCase("pm-lighting");
            setStep(2);
          }}
        />
      )}

      {currentStep === "bridge" && (
        <BridgeSetupStep
          bridgeConfig={bridgeConfig}
          testing={testing}
          testResult={testResult}
          showTroubleshooting={showBridgeTroubleshooting}
          onBridgeConfigChange={setBridgeConfig}
          onTestConnection={() => void handleTestConnection()}
          onToggleTroubleshooting={() => setShowBridgeTroubleshooting((value) => !value)}
          onPrev={() => setStep((value) => Math.max(value - 1, 0))}
          onSkip={() => setStep((value) => value + 1)}
          onNext={() => setStep((value) => Math.min(value + 1, totalSteps - 1))}
        />
      )}

      {currentStep === "crmx" && (
        <CrmxPairingStep
          crmxTab={crmxTab}
          onSelectTab={setCrmxTab}
          onPrev={() => setStep((value) => Math.max(value - 1, 0))}
          onNext={() => setStep((value) => Math.min(value + 1, totalSteps - 1))}
        />
      )}

      {currentStep === "addresses" && (
        <AddressAssignmentStep
          lights={lights}
          overlaps={overlaps}
          onAddressChange={(index, value) => {
            setLights((previous) =>
              previous.map((light, lightIndex) => (lightIndex === index ? { ...light, dmxStartAddress: value } : light))
            );
          }}
          onAutoAssign={autoAssignAddresses}
          onPrev={() => setStep((value) => Math.max(value - 1, 0))}
          onNext={() => setStep((value) => Math.min(value + 1, totalSteps - 1))}
        />
      )}

      {currentStep === "lights" && (
        <FixturesStep
          lights={lights}
          lightsConfigured={lightsConfigured}
          onNameChange={(index, value) => {
            setLights((previous) =>
              previous.map((light, lightIndex) => (lightIndex === index ? { ...light, name: value } : light))
            );
          }}
          onConfigureLights={() => void handleConfigureLights()}
          onNext={() => setStep((value) => Math.min(value + 1, totalSteps - 1))}
          onPrev={() => setStep((value) => Math.max(value - 1, 0))}
        />
      )}

      {currentStep === "data" && (
        <PlanningSeedStep
          seeding={seeding}
          onSeed={() => void handleSeed(isLighting && lightsConfigured)}
          onStartEmpty={() => setStep((value) => Math.min(value + 1, totalSteps - 1))}
          onPrev={() => setStep((value) => Math.max(value - 1, 0))}
        />
      )}

      {currentStep === "streamdeck" && (
        <StreamDeckStep
          onPrev={() => setStep((value) => Math.max(value - 1, 0))}
          onNext={() => setStep((value) => Math.min(value + 1, totalSteps - 1))}
        />
      )}

      {currentStep === "tips" && (
        <TipsStep onFinish={() => void handleFinish()} onPrev={() => setStep((value) => Math.max(value - 1, 0))} />
      )}
    </SetupWizardFrame>
  );
}
