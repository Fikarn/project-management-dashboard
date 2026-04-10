"use client";

interface AudioGainSliderProps {
  value: number; // 0-75 dB
  onChange: (value: number) => void;
  onDragStart: (value: number) => void;
  onDragEnd: () => void;
}

export default function AudioGainSlider({ value, onChange, onDragStart, onDragEnd }: AudioGainSliderProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 text-right text-micro text-studio-500">0</span>
      <div className="relative flex-1">
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
          className="audio-gain-slider h-1.5 w-full cursor-pointer appearance-none rounded-full bg-studio-700"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(value / 75) * 100}%, #374151 ${(value / 75) * 100}%, #374151 100%)`,
          }}
        />
      </div>
      <span className="w-10 text-left text-micro font-medium text-studio-300">+{value}dB</span>
    </div>
  );
}
