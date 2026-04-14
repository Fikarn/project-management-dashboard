"use client";

import { useState, useRef, useCallback, type ReactNode } from "react";

interface HoldButtonProps {
  onConfirm: () => void;
  holdDuration?: number;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  title?: string;
}

export default function HoldButton({
  onConfirm,
  holdDuration = 1500,
  children,
  className = "",
  disabled,
  title,
}: HoldButtonProps) {
  const [holding, setHolding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmedRef = useRef(false);

  const startHold = useCallback(() => {
    if (disabled) return;
    confirmedRef.current = false;
    setHolding(true);
    timerRef.current = setTimeout(() => {
      confirmedRef.current = true;
      setHolding(false);
      onConfirm();
    }, holdDuration);
  }, [disabled, holdDuration, onConfirm]);

  const cancelHold = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setHolding(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && !e.repeat) {
        e.preventDefault();
        startHold();
      }
    },
    [startHold]
  );

  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        cancelHold();
      }
    },
    [cancelHold]
  );

  return (
    <button
      type="button"
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onMouseLeave={cancelHold}
      onTouchStart={startHold}
      onTouchEnd={cancelHold}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      disabled={disabled}
      title={title}
      className={`relative overflow-hidden ${className}`}
    >
      {holding && (
        <span
          className="absolute inset-0 bg-accent-red/30"
          style={{
            animation: `hold-fill ${holdDuration}ms linear forwards`,
          }}
        />
      )}
      <span className="relative">{children}</span>
    </button>
  );
}
