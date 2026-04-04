import type { LightType } from "./types";

export type LightCapability = "intensity" | "cct" | "rgb" | "gm";

export interface SpatialNodeShape {
  width: number;
  height: number;
  borderRadius: number;
}

export interface LightTypeConfig {
  label: string;
  manufacturer: string;
  channelCount: number;
  cctMin: number;
  cctMax: number;
  capabilities: LightCapability[];
  defaultCct: number;
  spatialShape: SpatialNodeShape;
  beamAngle: number; // degrees, approximate beam spread for spatial visualization
}

export const LIGHT_TYPE_CONFIGS: Record<LightType, LightTypeConfig> = {
  "astra-bicolor": {
    label: "Litepanels Astra Bi-Color Soft",
    manufacturer: "Litepanels",
    channelCount: 2,
    cctMin: 3200,
    cctMax: 5600,
    capabilities: ["intensity", "cct"],
    defaultCct: 4400,
    spatialShape: { width: 48, height: 48, borderRadius: 8 },
    beamAngle: 80,
  },
  infinimat: {
    label: "Aputure Infinimat 2x4",
    manufacturer: "Aputure",
    channelCount: 4,
    cctMin: 2000,
    cctMax: 10000,
    capabilities: ["intensity", "cct", "gm"],
    defaultCct: 5600,
    spatialShape: { width: 72, height: 40, borderRadius: 8 },
    beamAngle: 110,
  },
  "infinibar-pb12": {
    label: "Aputure Infinibar PB12",
    manufacturer: "Aputure",
    channelCount: 8,
    cctMin: 2000,
    cctMax: 10000,
    capabilities: ["intensity", "cct", "rgb"],
    defaultCct: 5600,
    spatialShape: { width: 16, height: 56, borderRadius: 8 },
    beamAngle: 60,
  },
};

export function getConfig(type: LightType): LightTypeConfig {
  return LIGHT_TYPE_CONFIGS[type];
}

export function getChannelCount(type: LightType): number {
  return LIGHT_TYPE_CONFIGS[type].channelCount;
}

export function getCctRange(type: LightType): [number, number] {
  const c = LIGHT_TYPE_CONFIGS[type];
  return [c.cctMin, c.cctMax];
}

export function supportsRgb(type: LightType): boolean {
  return LIGHT_TYPE_CONFIGS[type].capabilities.includes("rgb");
}

export function supportsGm(type: LightType): boolean {
  return LIGHT_TYPE_CONFIGS[type].capabilities.includes("gm");
}

export function getSpatialShape(type: LightType): SpatialNodeShape {
  return LIGHT_TYPE_CONFIGS[type].spatialShape;
}

export function getBeamAngle(type: LightType): number {
  return LIGHT_TYPE_CONFIGS[type].beamAngle;
}
