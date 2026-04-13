"use client";

interface AudioFaderProps {
  value: number; // 0.0-1.0
  meterLevel: number; // 0.0-1.0
  onChange: (value: number) => void;
  onDragStart: (value: number) => void;
  onDragEnd: () => void;
}

export default function AudioFader({ value, meterLevel, onChange, onDragStart, onDragEnd }: AudioFaderProps) {
  return (
    <div className="relative flex h-48 w-10 items-end justify-center">
      {/* Meter background */}
      <div className="absolute inset-x-1 bottom-0 top-0 overflow-hidden rounded-sm bg-studio-800">
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
        className="audio-fader relative z-10 h-44 w-8 cursor-pointer appearance-none bg-transparent"
        style={{
          writingMode: "vertical-lr",
          direction: "rtl",
        }}
      />
    </div>
  );
}
