"use client";

import type { LightType } from "@/lib/types";

export type UseCase = "pm-only" | "pm-lighting" | null;
export type CrmxTab = "astra" | "infinimat" | "infinibar";

export interface BridgeConfig {
  ip: string;
  universe: number;
}

export interface LightEntry {
  name: string;
  type: LightType;
  dmxStartAddress: number;
}
