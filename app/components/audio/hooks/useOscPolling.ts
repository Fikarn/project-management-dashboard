import { useState, useEffect, useRef } from "react";
import type { OscStatus } from "@/lib/types";
import { audioApi } from "@/lib/client-api";

interface UseOscPollingOptions {
  oscEnabled: boolean;
  oscSendHost: string;
}

export function useOscPolling({ oscEnabled, oscSendHost }: UseOscPollingOptions) {
  const [oscStatus, setOscStatus] = useState<OscStatus>({
    connected: false,
    verified: false,
    enabled: false,
    oscSendHost: "127.0.0.1",
    oscSendPort: 7001,
    oscReceivePort: 9001,
    lastMessageAt: null,
    lastMeterAt: null,
    lastInboundType: null,
    meteringState: "disabled",
    activeMeterChannels: 0,
    staleMeterChannels: 0,
    clippedChannels: 0,
    consoleStateConfidence: "assumed",
    lastConsoleSyncAt: null,
    lastConsoleSyncReason: "startup",
    lastSnapshotRecallAt: null,
  });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-initialize OSC transport on mount without pushing stored channel values
  useEffect(() => {
    const controller = new AbortController();
    async function initAudio() {
      try {
        await audioApi.init({ signal: controller.signal });
      } catch {
        // ignore — aborted or network error
      }
    }
    initAudio();
    return () => controller.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll OSC status every 10s
  useEffect(() => {
    const controller = new AbortController();
    async function fetchStatus() {
      try {
        const res = await audioApi.fetchStatus({ signal: controller.signal });
        if (controller.signal.aborted) return;
        const data = await res.json();
        if (controller.signal.aborted) return;
        setOscStatus({
          connected: data.connected,
          verified: data.verified,
          enabled: data.enabled,
          oscSendHost: data.oscSendHost,
          oscSendPort: data.oscSendPort,
          oscReceivePort: data.oscReceivePort,
          recoveryExhausted: data.recoveryExhausted,
          lastMessageAt: data.lastMessageAt ?? null,
          lastMeterAt: data.lastMeterAt ?? null,
          lastInboundType: data.lastInboundType ?? null,
          meteringState: data.meteringState ?? "disabled",
          activeMeterChannels: data.activeMeterChannels ?? 0,
          staleMeterChannels: data.staleMeterChannels ?? 0,
          clippedChannels: data.clippedChannels ?? 0,
          consoleStateConfidence: data.consoleStateConfidence ?? "assumed",
          lastConsoleSyncAt: data.lastConsoleSyncAt ?? null,
          lastConsoleSyncReason: data.lastConsoleSyncReason ?? "startup",
          lastSnapshotRecallAt: data.lastSnapshotRecallAt ?? null,
        });
      } catch {
        // ignore — aborted or network error
      }
    }
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 10000);
    return () => {
      controller.abort();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [oscEnabled, oscSendHost]);

  return { oscStatus };
}
