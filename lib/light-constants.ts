import type { EffectType } from "./types";

export const EFFECTS: { type: EffectType; label: string }[] = [
  { type: "pulse", label: "Pulse" },
  { type: "strobe", label: "Strobe" },
  { type: "candle", label: "Candle" },
];

export const TYPE_LABELS: Record<string, string> = {
  "astra-bicolor": "Astra",
  infinimat: "Infinimat",
  "infinibar-pb12": "Infinibar",
};

// Common white light source presets (Kelvin values)
export const CCT_PRESETS = [
  { label: "Tungsten", cct: 3200, color: "#ff9329" },
  { label: "Halogen", cct: 3400, color: "#ffab4a" },
  { label: "Fluorescent", cct: 4200, color: "#ffe0b5" },
  { label: "Daylight", cct: 5600, color: "#fff5e6" },
  { label: "Overcast", cct: 6500, color: "#d6e4f0" },
  { label: "Shade", cct: 7500, color: "#b8cfe0" },
];

// CTO/CTB gel presets — standard film industry corrections
export const GEL_PRESETS = [
  { label: "Full CTO", cct: 3200, color: "#ff8c00" },
  { label: "1/2 CTO", cct: 3800, color: "#ffab4a" },
  { label: "1/4 CTO", cct: 4400, color: "#ffc980" },
  { label: "1/4 CTB", cct: 5200, color: "#e8eef5" },
  { label: "1/2 CTB", cct: 6500, color: "#c4d6ea" },
  { label: "Full CTB", cct: 8000, color: "#8db4d9" },
];

/** Map CCT (Kelvin) to an approximate RGB color string (e.g. "255, 180, 50"). */
export function cctToColor(cct: number): string {
  const t = cct / 100;
  let r: number, g: number, b: number;

  if (t <= 66) {
    r = 255;
    g = Math.min(255, Math.max(0, 99.47 * Math.log(t) - 161.12));
    b = t <= 19 ? 0 : Math.min(255, Math.max(0, 138.52 * Math.log(t - 10) - 305.04));
  } else {
    r = Math.min(255, Math.max(0, 329.7 * Math.pow(t - 60, -0.133)));
    g = Math.min(255, Math.max(0, 288.12 * Math.pow(t - 60, -0.0755)));
    b = 255;
  }

  return `${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}`;
}
