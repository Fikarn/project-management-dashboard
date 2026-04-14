"use client";

import { useRef, useCallback, useEffect, useState, useMemo } from "react";

interface HueWheelProps {
  hue: number; // 0-360
  saturation: number; // 0-100
  onChange: (hue: number, saturation: number) => void;
  onChangeEnd: (hue: number, saturation: number) => void;
  disabled?: boolean;
}

// Convert HSI to RGB (I is handled separately as the intensity slider)
export function hsiToRgb(h: number, s: number): [number, number, number] {
  const sNorm = s / 100;

  // At full saturation with I=1, produce vivid colors
  // We compute RGB assuming full intensity, then the intensity slider scales the output
  const c = sNorm;
  const hPrime = h / 60;
  const x = c * (1 - Math.abs((hPrime % 2) - 1));

  let r1 = 0,
    g1 = 0,
    b1 = 0;
  if (hPrime >= 0 && hPrime < 1) {
    r1 = c;
    g1 = x;
    b1 = 0;
  } else if (hPrime >= 1 && hPrime < 2) {
    r1 = x;
    g1 = c;
    b1 = 0;
  } else if (hPrime >= 2 && hPrime < 3) {
    r1 = 0;
    g1 = c;
    b1 = x;
  } else if (hPrime >= 3 && hPrime < 4) {
    r1 = 0;
    g1 = x;
    b1 = c;
  } else if (hPrime >= 4 && hPrime < 5) {
    r1 = x;
    g1 = 0;
    b1 = c;
  } else {
    r1 = c;
    g1 = 0;
    b1 = x;
  }

  const m = 1 - c;
  return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];
}

// Convert RGB to Hue (0-360) and Saturation (0-100)
export function rgbToHs(r: number, g: number, b: number): [number, number] {
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const delta = max - min;

  let hue = 0;
  if (delta > 0) {
    if (max === rN) {
      hue = 60 * (((gN - bN) / delta) % 6);
    } else if (max === gN) {
      hue = 60 * ((bN - rN) / delta + 2);
    } else {
      hue = 60 * ((rN - gN) / delta + 4);
    }
  }
  if (hue < 0) hue += 360;

  // Saturation as chroma relative to max brightness
  const sat = max === 0 ? 0 : (delta / max) * 100;

  return [Math.round(hue), Math.round(sat)];
}

const WHEEL_SIZE = 132;
const RING_WIDTH = 18;
const CENTER = WHEEL_SIZE / 2;
const OUTER_R = WHEEL_SIZE / 2 - 2;
const INNER_R = OUTER_R - RING_WIDTH;

export default function HueWheel({ hue, saturation, onChange, onChangeEnd, disabled }: HueWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draggingHue, setDraggingHue] = useState(false);
  const [draggingSat, setDraggingSat] = useState(false);

  // Draw the hue ring
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = WHEEL_SIZE * dpr;
    canvas.height = WHEEL_SIZE * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, WHEEL_SIZE, WHEEL_SIZE);

    // Draw hue ring
    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = ((angle - 91) * Math.PI) / 180;
      const endAngle = ((angle - 89) * Math.PI) / 180;
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, (OUTER_R + INNER_R) / 2, startAngle, endAngle);
      ctx.lineWidth = RING_WIDTH;
      ctx.strokeStyle = `hsl(${angle}, 100%, 50%)`;
      ctx.stroke();
    }

    // Draw inner saturation gradient circle
    const innerRadius = INNER_R - 8;
    const gradient = ctx.createRadialGradient(CENTER, CENTER, 0, CENTER, CENTER, innerRadius);
    gradient.addColorStop(0, "white");
    gradient.addColorStop(1, `hsl(${hue}, 100%, 50%)`);
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Hue indicator on the ring
    const hueAngle = ((hue - 90) * Math.PI) / 180;
    const hueX = CENTER + ((OUTER_R + INNER_R) / 2) * Math.cos(hueAngle);
    const hueY = CENTER + ((OUTER_R + INNER_R) / 2) * Math.sin(hueAngle);
    ctx.beginPath();
    ctx.arc(hueX, hueY, RING_WIDTH / 2 + 1, 0, Math.PI * 2);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(hueX, hueY, RING_WIDTH / 2 + 1, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Saturation indicator inside the circle
    const satRadius = (saturation / 100) * innerRadius;
    const satAngle = ((hue - 90) * Math.PI) / 180;
    const satX = CENTER + satRadius * Math.cos(satAngle);
    const satY = CENTER + satRadius * Math.sin(satAngle);
    ctx.beginPath();
    ctx.arc(satX, satY, 6, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [hue, saturation]);

  const getAngle = useCallback((e: React.MouseEvent | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - CENTER * (rect.width / WHEEL_SIZE);
    const y = e.clientY - rect.top - CENTER * (rect.height / WHEEL_SIZE);
    let angle = (Math.atan2(y, x) * 180) / Math.PI + 90;
    if (angle < 0) angle += 360;
    return Math.round(angle) % 360;
  }, []);

  const getSatFromPos = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return saturation;
      const rect = canvas.getBoundingClientRect();
      const scale = rect.width / WHEEL_SIZE;
      const x = e.clientX - rect.left - CENTER * scale;
      const y = e.clientY - rect.top - CENTER * scale;
      const dist = Math.sqrt(x * x + y * y) / scale;
      const innerRadius = INNER_R - 8;
      return Math.round(Math.min(100, Math.max(0, (dist / innerRadius) * 100)));
    },
    [saturation]
  );

  const isOnRing = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / WHEEL_SIZE;
    const x = e.clientX - rect.left - CENTER * scale;
    const y = e.clientY - rect.top - CENTER * scale;
    const dist = Math.sqrt(x * x + y * y) / scale;
    return dist >= INNER_R - 4 && dist <= OUTER_R + 4;
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      if (isOnRing(e)) {
        setDraggingHue(true);
        const h = getAngle(e);
        onChange(h, saturation);
      } else {
        setDraggingSat(true);
        const h = getAngle(e);
        const s = getSatFromPos(e);
        onChange(h, s);
      }
    },
    [disabled, isOnRing, getAngle, getSatFromPos, onChange, saturation]
  );

  useEffect(() => {
    if (!draggingHue && !draggingSat) return;

    const handleMove = (e: MouseEvent) => {
      if (draggingHue) {
        onChange(getAngle(e), saturation);
      } else if (draggingSat) {
        const h = getAngle(e);
        const s = getSatFromPos(e);
        onChange(h, s);
      }
    };

    const handleUp = (e: MouseEvent) => {
      if (draggingHue) {
        onChangeEnd(getAngle(e), saturation);
      } else if (draggingSat) {
        onChangeEnd(getAngle(e), getSatFromPos(e));
      }
      setDraggingHue(false);
      setDraggingSat(false);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [draggingHue, draggingSat, getAngle, getSatFromPos, onChange, onChangeEnd, saturation]);

  // Current color preview
  const [r, g, b] = useMemo(() => hsiToRgb(hue, saturation), [hue, saturation]);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={WHEEL_SIZE}
        height={WHEEL_SIZE}
        style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}
        className={`${disabled ? "opacity-40" : "cursor-crosshair"}`}
        onMouseDown={handleMouseDown}
      />
      <div className="flex items-center gap-2">
        <div
          className="h-5 w-5 rounded-full border border-white/20"
          style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }}
        />
        <span className="font-mono text-xxs text-studio-400">
          H:{hue}° S:{saturation}%
        </span>
      </div>
    </div>
  );
}
