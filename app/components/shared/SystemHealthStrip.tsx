"use client";

import type { DmxStatus, OscStatus } from "@/lib/types";

interface SystemHealthStripProps {
  sseStatus: "connected" | "connecting" | "disconnected";
  dmxStatus: DmxStatus | null;
  oscStatus: OscStatus | null;
  lastSavedKey: number;
}

function StatusDot({ color }: { color: "green" | "amber" | "red" | "gray" }) {
  const bg = {
    green: "bg-accent-green",
    amber: "bg-accent-amber",
    red: "bg-accent-red",
    gray: "bg-studio-600",
  }[color];
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${bg}`} />;
}

export default function SystemHealthStrip({ sseStatus, dmxStatus, oscStatus, lastSavedKey }: SystemHealthStripProps) {
  return (
    <div className="flex items-center gap-3 text-xxs text-studio-500">
      {lastSavedKey > 0 && (
        <span key={lastSavedKey} className="flex animate-fade-out items-center gap-1 text-accent-green">
          Saved
        </span>
      )}

      {/* SSE */}
      <span className="flex items-center gap-1">
        <StatusDot color={sseStatus === "connected" ? "green" : sseStatus === "connecting" ? "amber" : "red"} />
        {sseStatus === "connected" ? "Live" : sseStatus === "connecting" ? "Connecting..." : "Reconnecting..."}
      </span>

      {/* DMX — only shown when configured */}
      {dmxStatus && (
        <span className="flex items-center gap-1">
          <StatusDot color={!dmxStatus.enabled ? "gray" : dmxStatus.reachable ? "green" : "red"} />
          {!dmxStatus.enabled ? "DMX Off" : dmxStatus.reachable ? "DMX" : "DMX Down"}
        </span>
      )}

      {/* OSC — only shown when configured */}
      {oscStatus && (
        <span className="flex items-center gap-1">
          <StatusDot color={!oscStatus.enabled ? "gray" : oscStatus.connected ? "green" : "red"} />
          {!oscStatus.enabled ? "OSC Off" : oscStatus.connected ? "OSC" : "OSC Down"}
        </span>
      )}
    </div>
  );
}
