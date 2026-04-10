import { useState, useEffect, useRef } from "react";
import type { AudioMeterData } from "@/lib/types";
import { audioApi } from "@/lib/client-api";

const POLL_INTERVAL_MS = 100; // 10fps metering

export function useMeterPolling(active: boolean) {
  const [meters, setMeters] = useState<Map<string, AudioMeterData>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) {
      setMeters(new Map());
      return;
    }

    const controller = new AbortController();

    async function fetchMeters() {
      try {
        const res = await audioApi.fetchMetering({ signal: controller.signal });
        if (controller.signal.aborted) return;
        const data = await res.json();
        if (controller.signal.aborted) return;
        const map = new Map<string, AudioMeterData>();
        for (const m of data.meters ?? []) {
          map.set(m.channelId, m);
        }
        setMeters(map);
      } catch {
        // ignore — aborted or network error
      }
    }

    fetchMeters();
    intervalRef.current = setInterval(fetchMeters, POLL_INTERVAL_MS);

    return () => {
      controller.abort();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active]);

  return meters;
}
