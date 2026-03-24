"use client";

import { useState, useEffect, useRef } from "react";

interface ChannelEntry {
  channel: number;
  value: number;
  lightName: string;
  label: string;
}

export default function DmxMonitor() {
  const [channels, setChannels] = useState<ChannelEntry[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    async function fetchChannels() {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      try {
        const res = await fetch("/api/lights/dmx-monitor", { signal: controller.signal });
        if (controller.signal.aborted) return;
        const data = await res.json();
        if (controller.signal.aborted) return;
        setChannels(data.channels ?? []);
      } catch {
        // ignore — aborted or network error
      }
    }

    fetchChannels();
    pollRef.current = setInterval(fetchChannels, 500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      controllerRef.current?.abort();
    };
  }, []);

  if (channels.length === 0) {
    return (
      <div className="rounded-xl border border-gray-700/80 bg-gray-800/90 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">DMX Output</h3>
        <p className="text-xs text-gray-500">No channels in use</p>
      </div>
    );
  }

  // Group by light
  const grouped = new Map<string, ChannelEntry[]>();
  for (const ch of channels) {
    if (!grouped.has(ch.lightName)) grouped.set(ch.lightName, []);
    grouped.get(ch.lightName)!.push(ch);
  }

  return (
    <div className="rounded-xl border border-gray-700/80 bg-gray-800/90 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">DMX Output</h3>
      <div className="space-y-2.5">
        {Array.from(grouped.entries()).map(([lightName, chs]) => (
          <div key={lightName}>
            <div className="mb-1 text-[10px] font-medium text-gray-400">{lightName}</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {chs.map((ch) => (
                <div key={ch.channel} className="flex items-center gap-1.5">
                  <span className="w-4 text-right font-mono text-[9px] tabular-nums text-gray-600">{ch.channel}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-700">
                    <div
                      className="h-full rounded-full bg-blue-500/70 transition-all duration-300"
                      style={{ width: `${(ch.value / 255) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right font-mono text-[9px] tabular-nums text-gray-500">{ch.value}</span>
                  <span className="w-10 truncate text-[8px] text-gray-600">{ch.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
