import { useState, useCallback, useRef } from "react";
import type { AudioChannel } from "@/lib/types";

interface UseAudioControlsOptions {
  channel: AudioChannel;
  faderValue: number;
  onUpdate: (channelId: string, values: Record<string, unknown>) => void;
  onOsc: (channelId: string, values: Record<string, unknown>) => void;
}

export function useAudioControls({ channel, faderValue, onUpdate, onOsc }: UseAudioControlsOptions) {
  // Local drag state to prevent SSE snap-back
  const [dragging, setDragging] = useState<Record<string, number | null>>({});
  const rafRef = useRef<number | null>(null);

  const sliderVal = useCallback((key: string, propVal: number) => dragging[key] ?? propVal, [dragging]);

  const startDrag = useCallback((key: string, val: number) => {
    setDragging((prev) => ({ ...prev, [key]: val }));
  }, []);

  const onDrag = useCallback(
    (key: string, val: number) => {
      setDragging((prev) => ({ ...prev, [key]: val }));
      // RAF-throttled OSC send during drag
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        onOsc(channel.id, { [key]: val });
      });
    },
    [channel.id, onOsc]
  );

  const endDrag = useCallback(
    (key: string) => {
      const val = dragging[key];
      setDragging((prev) => ({ ...prev, [key]: null }));
      if (val !== null && val !== undefined) {
        onUpdate(channel.id, { [key]: val });
      }
    },
    [channel.id, dragging, onUpdate]
  );

  // Computed slider values with drag override
  const gainVal = sliderVal("gain", channel.gain);
  const faderVal = sliderVal("fader", faderValue);

  return {
    dragging,
    sliderVal,
    startDrag,
    onDrag,
    endDrag,
    gainVal,
    faderVal,
  };
}
