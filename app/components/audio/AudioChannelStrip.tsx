"use client";

import { Settings, Trash2 } from "lucide-react";
import type { AudioChannel, AudioMeterData } from "@/lib/types";
import { useAudioControls } from "./hooks/useAudioControls";
import AudioFader from "./AudioFader";
import AudioGainSlider from "./AudioGainSlider";
import AudioToggleButton from "./AudioToggleButton";

interface AudioChannelStripProps {
  channel: AudioChannel;
  meterData: AudioMeterData | undefined;
  selected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (channelId: string, values: Record<string, unknown>) => void;
  onOsc: (channelId: string, values: Record<string, unknown>) => void;
  onEdit: (channel: AudioChannel) => void;
  onDelete: (channel: AudioChannel) => void;
}

export default function AudioChannelStrip({
  channel,
  meterData,
  selected,
  onSelect,
  onUpdate,
  onOsc,
  onEdit,
  onDelete,
}: AudioChannelStripProps) {
  const { gainVal, faderVal, startDrag, onDrag, endDrag } = useAudioControls({
    channel,
    onUpdate,
    onOsc,
  });

  const meterLevel = meterData?.level ?? 0;

  return (
    <div
      className={`group flex flex-col items-center gap-2 rounded-card border p-3 transition-colors ${
        selected ? "border-accent-blue bg-accent-blue/5" : "border-studio-700 bg-studio-850 hover:border-studio-600"
      }`}
      style={{ minWidth: 120, maxWidth: 160 }}
      onClick={() => onSelect(channel.id)}
    >
      {/* Channel name + actions */}
      <div className="flex w-full items-center justify-between gap-1">
        <span className="truncate text-sm font-medium text-studio-200">{channel.name}</span>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(channel);
            }}
            aria-label={`Edit ${channel.name}`}
            className="rounded p-0.5 text-studio-500 hover:bg-studio-700 hover:text-studio-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
          >
            <Settings size={12} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(channel);
            }}
            aria-label={`Delete ${channel.name}`}
            className="rounded p-0.5 text-studio-500 hover:bg-red-900/30 hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
          >
            <Trash2 size={12} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* OSC Channel label */}
      <span className="text-xxs text-studio-500">Ch {channel.oscChannel}</span>

      {/* Gain slider */}
      <div className="w-full">
        <AudioGainSlider
          value={gainVal}
          onChange={(val) => onDrag("gain", val)}
          onDragStart={(val) => startDrag("gain", val)}
          onDragEnd={() => endDrag("gain")}
        />
      </div>

      {/* Fader + meter */}
      <AudioFader
        value={faderVal}
        meterLevel={meterLevel}
        onChange={(val) => onDrag("fader", val)}
        onDragStart={(val) => startDrag("fader", val)}
        onDragEnd={() => endDrag("fader")}
      />

      {/* Fader dB readout */}
      <span className="text-xxs font-medium text-studio-400">
        {faderVal === 0 ? "-\u221E" : `${((faderVal - 0.75) * 60).toFixed(1)}dB`}
      </span>

      {/* Toggle buttons */}
      <div className="flex flex-wrap justify-center gap-1">
        <AudioToggleButton
          label="48V"
          active={channel.phantom}
          onClick={() => onUpdate(channel.id, { phantom: !channel.phantom })}
          activeColor="bg-blue-600"
          activeText="text-white"
        />
        <AudioToggleButton
          label="\u00D8"
          active={channel.phase}
          onClick={() => onUpdate(channel.id, { phase: !channel.phase })}
          activeColor="bg-amber-600"
          activeText="text-white"
        />
        <AudioToggleButton
          label="PAD"
          active={channel.pad}
          onClick={() => onUpdate(channel.id, { pad: !channel.pad })}
        />
        <AudioToggleButton
          label="LC"
          active={channel.loCut}
          onClick={() => onUpdate(channel.id, { loCut: !channel.loCut })}
        />
      </div>

      {/* Mute and Solo — larger buttons */}
      <div className="flex w-full gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUpdate(channel.id, { mute: !channel.mute });
          }}
          aria-pressed={channel.mute}
          aria-label={`Mute ${channel.name}`}
          className={`flex-1 rounded-badge py-1.5 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${
            channel.mute
              ? "bg-red-600 text-white"
              : "bg-studio-700 text-studio-400 hover:bg-studio-600 hover:text-studio-200"
          }`}
        >
          M
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUpdate(channel.id, { solo: !channel.solo });
          }}
          aria-pressed={channel.solo}
          aria-label={`Solo ${channel.name}`}
          className={`flex-1 rounded-badge py-1.5 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${
            channel.solo
              ? "bg-amber-500 text-studio-950"
              : "bg-studio-700 text-studio-400 hover:bg-studio-600 hover:text-studio-200"
          }`}
        >
          S
        </button>
      </div>
    </div>
  );
}
