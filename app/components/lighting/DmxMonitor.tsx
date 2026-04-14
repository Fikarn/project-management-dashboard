"use client";

import { useState, useEffect, useRef } from "react";
import { lightsApi } from "@/lib/client-api";

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
        const res = await lightsApi.fetchDmxMonitor({ signal: controller.signal });
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

  const grouped = new Map<string, ChannelEntry[]>();
  for (const ch of channels) {
    if (!grouped.has(ch.lightName)) grouped.set(ch.lightName, []);
    grouped.get(ch.lightName)!.push(ch);
  }

  if (channels.length === 0) {
    return (
      <div className="rounded-card border border-studio-750 bg-studio-850 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xxs font-bold uppercase tracking-widest text-studio-500">DMX Output</h3>
          <span className="rounded-pill bg-studio-800 px-2 py-0.5 text-xxs font-medium text-studio-400">0</span>
        </div>
        <p className="text-xs text-studio-500">No channels in use</p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-studio-750 bg-studio-850 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xxs font-bold uppercase tracking-widest text-studio-500">DMX Output</h3>
        <div className="flex items-center gap-1">
          <span className="rounded-pill bg-studio-800 px-2 py-0.5 text-xxs font-medium text-studio-400">
            {grouped.size} fx
          </span>
          <span className="rounded-pill bg-studio-800 px-2 py-0.5 text-xxs font-medium text-studio-400">
            {channels.length} ch
          </span>
        </div>
      </div>
      <div className="space-y-1.5">
        {Array.from(grouped.entries()).map(([lightName, chs]) => (
          <div key={lightName} className="rounded-badge border border-studio-750/60 bg-studio-950/45 px-2.5 py-2">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="truncate text-xxs font-semibold uppercase tracking-[0.12em] text-studio-300">
                {lightName}
              </div>
              <span className="rounded-pill bg-studio-800 px-1.5 py-0.5 text-xxs font-medium text-studio-500">
                {chs.length}
              </span>
            </div>
            <div className="space-y-1">
              {chs.map((ch) => (
                <div key={ch.channel} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-1.5">
                  <span className="w-6 text-right font-mono text-xxs tabular-nums text-studio-500">{ch.channel}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-studio-750">
                    <div
                      className="h-full rounded-full bg-accent-blue/60 transition-all duration-300"
                      style={{ width: `${(ch.value / 255) * 100}%` }}
                    />
                  </div>
                  <span className="w-7 text-right font-mono text-xxs tabular-nums text-studio-500">{ch.value}</span>
                  <span className="w-12 truncate text-xxs text-studio-500">{ch.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
