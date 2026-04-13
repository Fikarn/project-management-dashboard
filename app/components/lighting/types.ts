"use client";

import type { ColorMode, Light, LightEffect } from "@/lib/types";

export type LightingViewMode = "expanded" | "compact" | "spatial";

export type LightingModalState =
  | { type: "none" }
  | { type: "addLight" }
  | { type: "editLight"; light: Light }
  | { type: "deleteLight"; light: Light }
  | { type: "settings" }
  | { type: "renameGroup"; groupId: string; groupName: string }
  | { type: "deleteGroup"; groupId: string; groupName: string };

export interface LightValueUpdate {
  intensity?: number;
  cct?: number;
  on?: boolean;
  red?: number;
  green?: number;
  blue?: number;
  colorMode?: ColorMode;
  gmTint?: number | null;
}

export interface LightingEffectChange {
  lightId: string;
  effect: LightEffect | null;
}
