"use client";

interface AudioFaderProps {
  value: number; // 0.0-1.0
  meterLevel: number; // 0.0-1.0
  onChange: (value: number) => void;
  onDragStart: (value: number) => void;
  onDragEnd: () => void;
  compact?: boolean;
  ariaLabel: string;
  title?: string;
}

export default function AudioFader({
  value,
  meterLevel,
  onChange,
  onDragStart,
  onDragEnd,
  compact = false,
  ariaLabel,
  title,
}: AudioFaderProps) {
  return (
    <div className={`relative mx-auto flex items-end justify-center ${compact ? "h-40 w-10" : "h-48 w-12"}`}>
      {/* Meter background */}
      <div className="absolute inset-x-2 bottom-0 top-0 overflow-hidden rounded-[12px] border border-studio-700/80 bg-[linear-gradient(180deg,rgba(22,28,38,0.95),rgba(10,12,18,0.98))] shadow-inner">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: "linear-gradient(to top, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "100% 25%",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 transition-[height] duration-75"
          style={{
            height: `${meterLevel * 100}%`,
            background:
              meterLevel > 0.9
                ? "linear-gradient(to top, #22c55e 0%, #eab308 60%, #ef4444 100%)"
                : meterLevel > 0.7
                  ? "linear-gradient(to top, #22c55e 0%, #eab308 100%)"
                  : "#22c55e",
            opacity: 0.3,
          }}
        />
      </div>

      {/* Vertical range input */}
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onMouseDown={(e) => onDragStart(parseFloat((e.target as HTMLInputElement).value))}
        onMouseUp={onDragEnd}
        onTouchStart={(e) => onDragStart(parseFloat((e.target as HTMLInputElement).value))}
        onTouchEnd={onDragEnd}
        aria-label={ariaLabel}
        title={title ?? ariaLabel}
        className={`audio-fader relative z-10 cursor-pointer appearance-none bg-transparent ${compact ? "h-36 w-8" : "h-44 w-10"}`}
        style={{
          writingMode: "vertical-lr",
          direction: "rtl",
        }}
      />
    </div>
  );
}
