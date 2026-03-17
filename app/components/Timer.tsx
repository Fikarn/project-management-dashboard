"use client";

import { useEffect, useState } from "react";

interface TimerProps {
  isRunning: boolean;
  totalSeconds: number;
  lastStarted: string | null;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export default function Timer({ isRunning, totalSeconds, lastStarted }: TimerProps) {
  const [liveElapsed, setLiveElapsed] = useState(0);

  useEffect(() => {
    if (!isRunning || !lastStarted) {
      setLiveElapsed(0);
      return;
    }

    const calc = () => {
      setLiveElapsed(
        Math.floor((Date.now() - new Date(lastStarted).getTime()) / 1000)
      );
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [isRunning, lastStarted]);

  const display = formatTime(totalSeconds + liveElapsed);

  return (
    <span className={`font-mono text-xs ${isRunning ? "text-green-400" : "text-gray-500"}`}>
      {display}
    </span>
  );
}
