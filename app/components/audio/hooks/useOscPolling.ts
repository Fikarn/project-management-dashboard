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
    enabled: false,
    oscSendHost: "127.0.0.1",
    oscSendPort: 7001,
    oscReceivePort: 9001,
  });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-initialize OSC and sync channel values on mount
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
          enabled: data.enabled,
          oscSendHost: data.oscSendHost,
          oscSendPort: data.oscSendPort,
          oscReceivePort: data.oscReceivePort,
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
