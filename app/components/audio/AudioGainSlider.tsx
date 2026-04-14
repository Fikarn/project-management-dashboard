"use client";

interface AudioGainSliderProps {
  value: number; // 0-75 dB
  onChange: (value: number) => void;
  onDragStart: (value: number) => void;
  onDragEnd: () => void;
  ariaLabel: string;
  title?: string;
}

export default function AudioGainSlider({
  value,
  onChange,
  onDragStart,
  onDragEnd,
  ariaLabel,
  title,
}: AudioGainSliderProps) {
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <input
          type="range"
          min={0}
          max={75}
          step={1}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          onMouseDown={(e) => onDragStart(parseInt((e.target as HTMLInputElement).value, 10))}
          onMouseUp={onDragEnd}
          onTouchStart={(e) => onDragStart(parseInt((e.target as HTMLInputElement).value, 10))}
          onTouchEnd={onDragEnd}
          aria-label={ariaLabel}
          title={title ?? ariaLabel}
          className="audio-gain-slider h-2 w-full cursor-pointer appearance-none rounded-full bg-studio-700"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(value / 75) * 100}%, rgba(49,56,71,0.95) ${(value / 75) * 100}%, rgba(49,56,71,0.95) 100%)`,
          }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.16em] text-studio-500">
        <span>0</span>
        <span>75</span>
      </div>
    </div>
  );
}
