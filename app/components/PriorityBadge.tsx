import type { Priority } from "@/lib/types";

const PRIORITY_STYLES: Record<Priority, string> = {
  p0: "bg-red-900 text-red-300",
  p1: "bg-orange-900 text-orange-300",
  p2: "bg-blue-900 text-blue-300",
  p3: "bg-gray-700 text-gray-400",
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
      className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${PRIORITY_STYLES[priority]}`}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
