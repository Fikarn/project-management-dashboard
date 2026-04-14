"use client";

import type { AudioChannel, AudioMeterData } from "@/lib/types";
import {
  supportsAutoSet,
  supportsGain,
  supportsInstrument,
  supportsPad,
  supportsPhase,
  supportsPhantom,
} from "@/lib/audio-console";
import HoldButton from "../shared/HoldButton";
import AudioFader from "./AudioFader";
import AudioGainSlider from "./AudioGainSlider";
import AudioToggleButton from "./AudioToggleButton";
import { useAudioControls } from "./hooks/useAudioControls";

interface AudioChannelStripProps {
  channel: AudioChannel;
  meterData: AudioMeterData | undefined;
  selected: boolean;
  mixLabel: string;
  sendValue: number;
  compact: boolean;
  onSelect: (id: string) => void;
  onUpdate: (channelId: string, values: Record<string, unknown>) => void;
  onOsc: (channelId: string, values: Record<string, unknown>) => void;
}

function roleCopy(channel: AudioChannel): { eyebrow: string; detail: string } {
  switch (channel.role) {
    case "front-preamp":
      return { eyebrow: `Front ${channel.oscChannel}`, detail: "Mic / line preamp" };
    case "rear-line":
      return { eyebrow: `Rear ${channel.oscChannel}`, detail: "Line input" };
    case "playback-pair":
      return { eyebrow: `Playback ${channel.oscChannel}/${channel.oscChannel + 1}`, detail: "Software return" };
    default:
      return { eyebrow: `Ch ${channel.oscChannel}`, detail: channel.kind };
  }
}

export default function AudioChannelStrip({
  channel,
  meterData,
  selected,
  mixLabel,
  sendValue,
  compact,
  onSelect,
  onUpdate,
  onOsc,
}: AudioChannelStripProps) {
  const handleSelect = () => onSelect(channel.id);
  const { gainVal, faderVal, startDrag, onDrag, endDrag } = useAudioControls({
    channel,
    faderValue: sendValue,
    onUpdate,
    onOsc,
  });
  const copy = roleCopy(channel);
  const signal = meterData?.level ?? 0;
  const peakDb = signal <= 0.0001 ? "-inf" : `${(20 * Math.log10(signal)).toFixed(1)} dB`;
  const peakHoldDb =
    (meterData?.peakHold ?? 0) <= 0.0001 ? "-inf" : `${(20 * Math.log10(meterData?.peakHold ?? 0)).toFixed(1)} dB`;
  const sendDb = faderVal === 0 ? "-inf" : `${((faderVal - 0.75) * 60).toFixed(1)} dB`;
  const sectionGap = compact ? "gap-2" : "gap-2.5";
  const shellPadding = compact ? "px-3 py-3" : "px-3.5 py-3.5";
  const gainEnabled = supportsGain(channel);
  const phaseEnabled = supportsPhase(channel);
  const padEnabled = supportsPad(channel);
  const phantomEnabled = supportsPhantom(channel);
  const instrumentEnabled = supportsInstrument(channel);
  const autoSetEnabled = supportsAutoSet(channel);

  return (
    <div
      data-testid={`audio-strip-${channel.id}`}
      onClick={handleSelect}
      onPointerDownCapture={handleSelect}
      onFocusCapture={handleSelect}
      className={`group relative flex min-h-0 flex-col overflow-hidden rounded-[22px] border text-left transition-all ${
        selected
          ? "border-accent-blue/70 bg-[linear-gradient(180deg,rgba(16,24,40,0.98),rgba(8,10,16,0.98))] shadow-[0_18px_42px_rgba(37,99,235,0.12)]"
          : "border-studio-700 bg-[linear-gradient(180deg,rgba(20,24,33,0.96),rgba(8,10,15,0.98))] hover:border-studio-600"
      } ${shellPadding}`}
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${
          channel.mute
            ? "from-red-500/35 via-red-500/10"
            : signal > 0.025
              ? "from-accent-green/28 via-accent-cyan/8"
              : "from-accent-blue/22 via-accent-blue/0"
        } to-transparent`}
      />

      <div className={`relative flex h-full min-h-0 flex-col ${sectionGap}`}>
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={handleSelect}
            className="-mx-1 -my-1 min-w-0 flex-1 rounded-[14px] px-1 py-1 text-left transition-colors hover:bg-white/[0.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
            aria-pressed={selected}
            aria-label={`Focus ${channel.name} strip`}
          >
            <div className="console-label text-accent-blue/80">{copy.eyebrow}</div>
            <h3 className={`mt-1 truncate font-semibold text-studio-50 ${compact ? "text-[13px]" : "text-[15px]"}`}>
              {channel.name}
            </h3>
            <p className="mt-1 text-xxs text-studio-500">{copy.detail}</p>
          </button>
          <div className="rounded-pill border border-studio-700 bg-studio-950/70 px-2 py-0.5 text-xxs font-semibold uppercase tracking-[0.18em] text-studio-400">
            {channel.shortName}
          </div>
        </div>

        <div className="flex min-h-[20px] flex-wrap gap-1">
          {signal > 0.02 ? (
            <span className="bg-accent-green/12 rounded-pill px-2 py-0.5 text-xxs font-medium uppercase tracking-[0.14em] text-accent-green">
              Signal
            </span>
          ) : null}
          {channel.mute ? (
            <span className="bg-red-500/12 rounded-pill px-2 py-0.5 text-xxs font-medium uppercase tracking-[0.14em] text-red-400">
              Muted
            </span>
          ) : null}
          {channel.solo ? (
            <span className="bg-amber-400/12 rounded-pill px-2 py-0.5 text-xxs font-medium uppercase tracking-[0.14em] text-amber-300">
              PFL
            </span>
          ) : null}
          {channel.phantom ? (
            <span className="bg-blue-500/12 rounded-pill px-2 py-0.5 text-xxs font-medium uppercase tracking-[0.14em] text-blue-300">
              48V
            </span>
          ) : null}
          {meterData?.clip ? (
            <span className="bg-red-500/12 rounded-pill px-2 py-0.5 text-xxs font-medium uppercase tracking-[0.14em] text-red-400">
              OVR
            </span>
          ) : null}
        </div>

        {gainEnabled ? (
          <div className="rounded-[16px] border border-studio-800 bg-studio-950/45 px-3 py-2.5">
            <div className="mb-1.5 flex items-end justify-between gap-2">
              <div>
                <div className="console-label">Preamp Gain</div>
                <div className="text-xxs text-studio-500">Front preamp trim</div>
              </div>
              <div className="font-mono text-xs font-semibold tabular-nums text-studio-200">+{gainVal} dB</div>
            </div>
            <AudioGainSlider
              value={gainVal}
              onChange={(val) => onDrag("gain", val)}
              onDragStart={(val) => startDrag("gain", val)}
              onDragEnd={() => endDrag("gain")}
              ariaLabel={`${channel.name} preamp gain`}
              title={`${channel.name} preamp gain`}
            />
          </div>
        ) : (
          <div className="rounded-[16px] border border-dashed border-studio-800 bg-studio-950/30 px-3 py-2.5">
            <div className="console-label">Source Mode</div>
            <p className="mt-1 text-xxs leading-5 text-studio-500">
              {channel.role === "rear-line"
                ? "Rear line inputs are treated as fixed line sources in this console."
                : "Playback returns feed the selected mix directly without preamp trim."}
            </p>
          </div>
        )}

        <div className="rounded-[16px] border border-studio-800 bg-studio-950/45 px-3 py-2.5">
          <div className="mb-1.5 flex items-end justify-between gap-2">
            <div>
              <div className="console-label">Send</div>
              <div className="text-xxs text-studio-500">{mixLabel}</div>
            </div>
            <div className="text-right">
              <div
                data-testid={`audio-strip-send-${channel.id}`}
                className="font-mono text-xs font-semibold tabular-nums text-studio-200"
              >
                {sendDb}
              </div>
              <div className="font-mono text-xxs tabular-nums text-studio-500">Peak {peakDb}</div>
              <div className="font-mono text-xxs tabular-nums text-studio-600">Hold {peakHoldDb}</div>
            </div>
          </div>
          <AudioFader
            value={faderVal}
            meterLevel={signal}
            onChange={(val) => onDrag("fader", val)}
            onDragStart={(val) => startDrag("fader", val)}
            onDragEnd={() => endDrag("fader")}
            compact={compact}
            ariaLabel={`${channel.name} send to ${mixLabel}`}
            title={`${channel.name} send to ${mixLabel}`}
          />
          <div className="mt-1 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.16em] text-studio-500">
            <span>-inf</span>
            <span>Selected Mix</span>
          </div>
        </div>

        <div className={`grid gap-1.5 ${gainEnabled ? "grid-cols-3" : "grid-cols-2"}`}>
          {phantomEnabled ? (
            <HoldButton
              onConfirm={() => onUpdate(channel.id, { phantom: !channel.phantom })}
              holdDuration={900}
              className={`w-full rounded-badge border text-center text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                channel.phantom
                  ? "border-blue-500/40 bg-blue-600 px-2.5 py-1.5 text-white"
                  : "border-studio-700 bg-studio-700 px-2.5 py-1.5 text-studio-300 hover:bg-studio-600 hover:text-studio-100"
              }`}
              title="Hold to toggle 48V phantom power"
            >
              48V Hold
            </HoldButton>
          ) : (
            <div className="rounded-badge border border-dashed border-studio-800 px-2.5 py-1.5 text-center text-[11px] uppercase tracking-[0.14em] text-studio-600">
              No 48V
            </div>
          )}

          {instrumentEnabled ? (
            <AudioToggleButton
              label="Inst"
              active={channel.instrument}
              onClick={() => onUpdate(channel.id, { instrument: !channel.instrument })}
              activeColor="bg-accent-blue"
              size="md"
              className="w-full"
              title="Instrument / Hi-Z input mode"
            />
          ) : gainEnabled ? (
            <div className="rounded-badge border border-dashed border-studio-800 px-2.5 py-1.5 text-center text-[11px] uppercase tracking-[0.14em] text-studio-600">
              Mic/Line
            </div>
          ) : null}

          {autoSetEnabled ? (
            <AudioToggleButton
              label="AutoSet"
              active={channel.autoSet}
              onClick={() => onUpdate(channel.id, { autoSet: !channel.autoSet })}
              activeColor="bg-accent-green"
              size="md"
              className="w-full"
              title="RME AutoSet gain protection"
            />
          ) : gainEnabled ? (
            <div className="rounded-badge border border-dashed border-studio-800 px-2.5 py-1.5 text-center text-[11px] uppercase tracking-[0.14em] text-studio-600">
              Manual
            </div>
          ) : null}

          <AudioToggleButton
            label="PFL"
            active={channel.solo}
            onClick={() => onUpdate(channel.id, { solo: !channel.solo })}
            activeColor="bg-amber-500"
            activeText="text-studio-950"
            size="md"
            className="w-full"
            title="TotalMix Solo / PFL"
          />

          <AudioToggleButton
            label="Mute"
            active={channel.mute}
            onClick={() => onUpdate(channel.id, { mute: !channel.mute })}
            activeColor="bg-red-600"
            activeText="text-white"
            size="md"
            className="w-full"
          />

          {phaseEnabled ? (
            <AudioToggleButton
              label="Phase"
              active={channel.phase}
              onClick={() => onUpdate(channel.id, { phase: !channel.phase })}
              activeColor="bg-amber-600"
              activeText="text-white"
              size="md"
              className="w-full"
            />
          ) : (
            <div className="rounded-badge border border-dashed border-studio-800 px-2.5 py-1.5 text-center text-[11px] uppercase tracking-[0.14em] text-studio-600">
              Stereo
            </div>
          )}

          {padEnabled ? (
            <AudioToggleButton
              label="Pad"
              active={channel.pad}
              onClick={() => onUpdate(channel.id, { pad: !channel.pad })}
              size="md"
              className="w-full"
            />
          ) : (
            <div className="rounded-badge border border-dashed border-studio-800 px-2.5 py-1.5 text-center text-[11px] uppercase tracking-[0.14em] text-studio-600">
              Fixed
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
