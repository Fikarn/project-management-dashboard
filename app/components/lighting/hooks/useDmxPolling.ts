import { useState, useEffect, useRef } from "react";
import type { DmxStatus } from "@/lib/types";
import { lightsApi } from "@/lib/client-api";

interface UseDmxPollingOptions {
  dmxEnabled: boolean;
  apolloBridgeIp: string;
}

export function useDmxPolling({ dmxEnabled, apolloBridgeIp }: UseDmxPollingOptions) {
  const [dmxStatus, setDmxStatus] = useState<DmxStatus>({ connected: false, reachable: false, enabled: false });
  const [showDmxHint, setShowDmxHint] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show DMX status hint on first visit
  useEffect(() => {
    if (!localStorage.getItem("hasSeenLightingHint")) {
      setShowDmxHint(true);
      hintTimerRef.current = setTimeout(() => {
        setShowDmxHint(false);
        localStorage.setItem("hasSeenLightingHint", "1");
      }, 8000);
    }
    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  }, []);

  // Auto-initialize DMX sender and sync light values on mount
  useEffect(() => {
    const controller = new AbortController();
    async function initLights() {
      try {
        const res = await lightsApi.init({ signal: controller.signal });
        if (controller.signal.aborted) return;
        const data = await res.json();
        if (controller.signal.aborted) return;
        setDmxStatus({ connected: data.initialized, reachable: data.reachable, enabled: data.enabled });
      } catch {
        // ignore — aborted or network error
      }
    }
    initLights();
    return () => controller.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll DMX status every 10s
  useEffect(() => {
    const controller = new AbortController();
    async function fetchStatus() {
      try {
        const res = await lightsApi.fetchStatus({ signal: controller.signal });
        if (controller.signal.aborted) return;
        const data = await res.json();
        if (controller.signal.aborted) return;
        setDmxStatus({ connected: data.connected, reachable: data.reachable, enabled: data.enabled });
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
  }, [dmxEnabled, apolloBridgeIp]);

  const dismissHint = () => {
    setShowDmxHint(false);
    localStorage.setItem("hasSeenLightingHint", "1");
  };

  return { dmxStatus, showDmxHint, dismissHint };
}
