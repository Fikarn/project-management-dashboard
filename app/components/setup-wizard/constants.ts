"use client";

import type { LightType } from "@/lib/types";
import type { LightEntry } from "./types";

export const DEFAULT_STUDIO_LIGHTS: LightEntry[] = [
  { name: "Key Left", type: "astra-bicolor", dmxStartAddress: 1 },
  { name: "Key Right", type: "astra-bicolor", dmxStartAddress: 3 },
  { name: "Fill", type: "astra-bicolor", dmxStartAddress: 5 },
  { name: "Background", type: "infinimat", dmxStartAddress: 7 },
  { name: "BG Bar 1", type: "infinibar-pb12", dmxStartAddress: 9 },
  { name: "BG Bar 2", type: "infinibar-pb12", dmxStartAddress: 17 },
  { name: "BG Bar 3", type: "infinibar-pb12", dmxStartAddress: 25 },
  { name: "BG Bar 4", type: "infinibar-pb12", dmxStartAddress: 33 },
];

export const TYPE_SHORT_LABELS: Record<LightType, string> = {
  "astra-bicolor": "Astra",
  infinimat: "Infinimat",
  "infinibar-pb12": "Infinibar PB12",
};

export const STEP_LABELS: Record<string, string> = {
  welcome: "Console",
  useCase: "Mode",
  bridge: "Bridge",
  crmx: "Pairing",
  addresses: "Patching",
  lights: "Fixtures",
  data: "Planning",
  streamdeck: "Controls",
  tips: "Finish",
};
