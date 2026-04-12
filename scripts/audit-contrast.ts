#!/usr/bin/env tsx
/**
 * WCAG contrast audit for the studio-* palette.
 *
 * Reads the hex values from tailwind.config.ts (kept in sync manually here — if the config
 * changes, update the STUDIO/ACCENT/BACKGROUNDS maps below). Computes WCAG 2.0 contrast
 * ratios for every text-on-background pairing and prints a pass/fail table.
 *
 * Usage: `npx tsx scripts/audit-contrast.ts`
 *
 * WCAG AA thresholds:
 *   - Normal text (< 18pt or < 14pt bold): 4.5:1
 *   - Large text (>= 18pt or >= 14pt bold): 3:1
 *   - UI components and graphical objects: 3:1
 */

const STUDIO: Record<string, string> = {
  "studio-950": "#0a0a0f",
  "studio-900": "#111118",
  "studio-850": "#16161f",
  "studio-800": "#1c1c27",
  "studio-750": "#242430",
  "studio-700": "#2e2e3b",
  "studio-600": "#3e3e4d",
  "studio-500": "#8d8da5",
  "studio-400": "#a0a0b8",
  "studio-300": "#b0b0c4",
  "studio-200": "#d0d0e0",
  "studio-100": "#eaeaf0",
  "studio-50": "#f5f5fa",
};

const ACCENT: Record<string, string> = {
  "accent-blue": "#99BA92",
  "accent-green": "#22c55e",
  "accent-red": "#ef4444",
  "accent-amber": "#f59e0b",
  "accent-orange": "#f97316",
  "accent-cyan": "#06b6d4",
};

// Standard dark-mode backgrounds text is rendered on.
const BACKGROUNDS = ["studio-900", "studio-850", "studio-800", "studio-750"];

type Rgb = { r: number; g: number; b: number };

function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const srgb = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(hexToRgb(fg));
  const l2 = relativeLuminance(hexToRgb(bg));
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

function verdict(ratio: number): { normal: string; large: string } {
  const normal = ratio >= 4.5 ? "PASS" : "FAIL";
  const large = ratio >= 3.0 ? "PASS" : "FAIL";
  return { normal, large };
}

function formatRow(label: string, ratio: number): string {
  const v = verdict(ratio);
  const bar = "=".repeat(Math.min(Math.round(ratio), 21));
  return `  ${label.padEnd(28)} ${ratio.toFixed(2).padStart(6)}:1  [${v.normal.padEnd(4)} / ${v.large.padEnd(4)}]  ${bar}`;
}

function audit(palette: Record<string, string>, title: string) {
  console.log(`\n=== ${title} ===`);
  for (const bg of BACKGROUNDS) {
    const bgHex = STUDIO[bg];
    console.log(`\nOn ${bg} (${bgHex}):`);
    for (const [name, hex] of Object.entries(palette)) {
      if (name === bg) continue;
      const ratio = contrastRatio(hex, bgHex);
      console.log(formatRow(`${name} (${hex})`, ratio));
    }
  }
}

console.log("WCAG 2.0 contrast audit — thresholds: normal ≥ 4.5:1, large/UI ≥ 3:1");
audit(STUDIO, "Studio text colors");
audit(ACCENT, "Accent colors");

// Summary: flag every text shade that FAILS normal-text AA on every standard background.
console.log("\n=== FAIL SUMMARY (normal text AA) ===");
const textShades = ["studio-400", "studio-500", "studio-600", "studio-700"];
for (const shade of textShades) {
  const fails: string[] = [];
  for (const bg of BACKGROUNDS) {
    const ratio = contrastRatio(STUDIO[shade], STUDIO[bg]);
    if (ratio < 4.5) fails.push(`${bg} (${ratio.toFixed(2)}:1)`);
  }
  if (fails.length === 0) {
    console.log(`  ${shade}: PASS on all backgrounds`);
  } else {
    console.log(`  ${shade}: FAIL on ${fails.join(", ")}`);
  }
}

// Accent-blue button contrast check (for button backgrounds with white vs studio-950 text)
console.log("\n=== ACCENT-BLUE BUTTON BACKGROUND ===");
const accentBlue = ACCENT["accent-blue"];
const withWhite = contrastRatio("#ffffff", accentBlue);
const withStudio950 = contrastRatio(STUDIO["studio-950"], accentBlue);
console.log(`  accent-blue + text-white:        ${withWhite.toFixed(2)}:1 ${withWhite >= 4.5 ? "PASS" : "FAIL"}`);
console.log(
  `  accent-blue + text-studio-950:   ${withStudio950.toFixed(2)}:1 ${withStudio950 >= 4.5 ? "PASS" : "FAIL"}`
);
