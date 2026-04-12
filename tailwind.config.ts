import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        studio: {
          950: "#0a0a0f",
          900: "#111118",
          850: "#16161f",
          800: "#1c1c27",
          750: "#242430",
          700: "#2e2e3b",
          // studio-600 is NOT used as text — borders/backgrounds only. Contrast fails WCAG as text.
          600: "#3e3e4d",
          // studio-500: tertiary text. Lifted from #5a5a6e (was ~2.5:1) to pass WCAG AA ≥4.5:1 on studio-900/850/800.
          500: "#8d8da5",
          // studio-400: secondary text. Lifted from #8888a0 to clear AA on studio-750 (was 4.43:1, borderline).
          400: "#a0a0b8",
          300: "#b0b0c4",
          200: "#d0d0e0",
          100: "#eaeaf0",
          50: "#f5f5fa",
        },
        accent: {
          blue: "#99BA92",
          indigo: "#6366f1",
          green: "#22c55e",
          red: "#ef4444",
          amber: "#f59e0b",
          orange: "#f97316",
          cyan: "#06b6d4",
        },
        sse: {
          green: "#99BA92",
          beige: "#EDEBD1",
          "beige-light": "#F6F5E8",
          sky: "#C9D4DA",
        },
      },
      fontSize: {
        xxs: ["10px", { lineHeight: "14px" }],
        micro: ["9px", { lineHeight: "12px" }],
      },
      borderRadius: {
        card: "10px",
        badge: "6px",
        pill: "100px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)",
        modal: "0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
        glow: "0 0 20px -4px var(--glow-color)",
      },
      animation: {
        "slide-in": "slide-in 0.2s ease-out",
        "fade-out": "fade-out 4s ease-out forwards",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "fade-in": "fade-in 0.15s ease-out",
        "scale-in": "scale-in 0.15s ease-out",
        "slide-up": "slide-up 0.2s ease-out",
      },
      keyframes: {
        "slide-in": {
          from: { opacity: "0", transform: "translateX(100%)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "80%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "0.8" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
