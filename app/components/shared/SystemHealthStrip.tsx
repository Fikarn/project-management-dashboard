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

function StatusBadge({ color, label }: { color: "green" | "amber" | "red" | "gray"; label: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-pill border border-studio-700/80 bg-studio-950/50 px-2.5 py-1">
      <StatusDot color={color} />
      <span>{label}</span>
    </span>
  );
}

export default function SystemHealthStrip({ sseStatus, dmxStatus, oscStatus, lastSavedKey }: SystemHealthStripProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xxs text-studio-500">
      {lastSavedKey > 0 && (
        <span
          key={lastSavedKey}
          className="flex animate-fade-out items-center gap-1 rounded-pill border border-accent-green/20 bg-accent-green/10 px-2.5 py-1 text-accent-green"
        >
          Saved locally
        </span>
      )}

      <StatusBadge
        color={sseStatus === "connected" ? "green" : sseStatus === "connecting" ? "amber" : "red"}
        label={sseStatus === "connected" ? "Live sync" : sseStatus === "connecting" ? "Connecting" : "Reconnect"}
      />

      {dmxStatus && (
        <StatusBadge
          color={!dmxStatus.enabled ? "gray" : dmxStatus.reachable ? "green" : "red"}
          label={!dmxStatus.enabled ? "DMX Off" : dmxStatus.reachable ? "DMX Ready" : "DMX Down"}
        />
      )}

      {oscStatus && (
        <StatusBadge
          color={!oscStatus.enabled ? "gray" : oscStatus.connected ? "green" : "red"}
          label={!oscStatus.enabled ? "OSC Off" : oscStatus.connected ? "OSC Ready" : "OSC Down"}
        />
      )}
    </div>
  );
}
