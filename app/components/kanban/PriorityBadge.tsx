import type { Priority } from "@/lib/types";

const PRIORITY_STYLES: Record<Priority, string> = {
  p0: "bg-red-500/15 text-red-400 border border-red-500/20",
  p1: "bg-orange-500/15 text-orange-400 border border-orange-500/20",
  p2: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
  p3: "bg-studio-700 text-studio-400 border border-studio-600",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  p0: "P0",
  p1: "P1",
  p2: "P2",
  p3: "P3",
};

export default function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`rounded-badge px-1.5 py-0.5 text-xxs font-bold uppercase tracking-wide ${PRIORITY_STYLES[priority]}`}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
