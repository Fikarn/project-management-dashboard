import { useRef, useCallback, useState, useMemo } from "react";
import type { Light, LightValues, ColorMode } from "@/lib/types";
import { getCctRange, supportsRgb, supportsGm } from "@/lib/light-types";
import { rgbToHs, hsiToRgb } from "../HueWheel";

export function useLightControls(
  light: Light,
  onUpdate: (values: LightValues) => void,
  onDmx: (values: LightValues) => void
) {
  const rafRef = useRef<number | null>(null);

  const throttledDmx = useCallback(
    (values: LightValues) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        onDmx(values);
        rafRef.current = null;
      });
    },
    [onDmx]
  );

  const [cctMin, cctMax] = getCctRange(light.type);
  const hasRgb = supportsRgb(light.type);
  const hasGm = supportsGm(light.type);

  // Local drag state prevents slider snap-back during drag
  const [dragging, setDragging] = useState<Record<string, number | null>>({});
  const sliderVal = (key: string, propVal: number) => dragging[key] ?? propVal;
  const startDrag = (key: string, val: number) => setDragging((d) => ({ ...d, [key]: val }));
  const endDrag = (key: string) => setDragging((d) => ({ ...d, [key]: null }));

  const intensityVal = sliderVal("intensity", light.intensity);
  const intensityGradient = `linear-gradient(to right, #b45309 0%, #fbbf24 ${intensityVal}%, #242430 ${intensityVal}%, #242430 100%)`;

  const cctGradient =
    cctMin >= 3000
      ? "linear-gradient(to right, #ff9329, #fff5e6, #a8c4e0)"
      : "linear-gradient(to right, #ff6b00, #ff9329, #fff5e6, #a8c4e0, #8db4d9)";

  // HSI state derived from current RGB
  const [hsiHue, hsiSat] = useMemo(
    () => rgbToHs(light.red, light.green, light.blue),
    [light.red, light.green, light.blue]
  );
  const [localHue, setLocalHue] = useState<number | null>(null);
  const [localSat, setLocalSat] = useState<number | null>(null);

  const handleHsiChange = useCallback(
    (h: number, s: number) => {
      setLocalHue(h);
      setLocalSat(s);
      const [r, g, b] = hsiToRgb(h, s);
      throttledDmx({ red: r, green: g, blue: b });
    },
    [throttledDmx]
  );

  const handleHsiChangeEnd = useCallback(
    (h: number, s: number) => {
      const [r, g, b] = hsiToRgb(h, s);
      setLocalHue(null);
      setLocalSat(null);
      onUpdate({ red: r, green: g, blue: b });
    },
    [onUpdate]
  );

  const colorModes: { mode: ColorMode; label: string }[] = hasRgb
    ? [
        { mode: "cct", label: "CCT" },
        { mode: "hsi", label: "HSI" },
        { mode: "rgb", label: "RGB" },
      ]
    : [];

  return {
    throttledDmx,
    sliderVal,
    startDrag,
    endDrag,
    cctMin,
    cctMax,
    hasRgb,
    hasGm,
    intensityVal,
    intensityGradient,
    cctGradient,
    hsiHue,
    hsiSat,
    localHue,
    localSat,
    handleHsiChange,
    handleHsiChangeEnd,
    colorModes,
  };
}
