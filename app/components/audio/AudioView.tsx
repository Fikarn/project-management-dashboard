"use client";

import { useState, useCallback } from "react";
import type { AudioChannel, AudioSnapshot, AudioSettings } from "@/lib/types";
import { audioApi, audioSnapshotsApi } from "@/lib/client-api";
import { useToast } from "../shared/ToastContext";
import ConfirmDialog from "../shared/ConfirmDialog";
import AudioToolbar from "./AudioToolbar";
import AudioChannelStrip from "./AudioChannelStrip";
import AudioSettingsModal from "./AudioSettingsModal";
import AudioChannelConfigModal from "./AudioChannelConfigModal";
import { useOscPolling } from "./hooks/useOscPolling";
import { useMeterPolling } from "./hooks/useMeterPolling";

type ModalState =
  | { type: "none" }
  | { type: "settings" }
  | { type: "addChannel" }
  | { type: "editChannel"; channel: AudioChannel }
  | { type: "deleteChannel"; channel: AudioChannel };

interface AudioViewProps {
  audioChannels: AudioChannel[];
  audioSnapshots: AudioSnapshot[];
  audioSettings: AudioSettings;
  onDataChange: () => void;
}

export default function AudioView({ audioChannels, audioSnapshots, audioSettings, onDataChange }: AudioViewProps) {
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const toast = useToast();

  const { oscStatus } = useOscPolling({
    oscEnabled: audioSettings.oscEnabled,
    oscSendHost: audioSettings.oscSendHost,
  });

  const meters = useMeterPolling(audioSettings.oscEnabled);

  const lastOscErrorRef = { current: 0 };

  const handleUpdate = useCallback(
    async (channelId: string, values: Record<string, unknown>) => {
      try {
        const res = await audioApi.updateValue(channelId, values);
        if (!res.ok) {
          const now = Date.now();
          if (now - lastOscErrorRef.current > 5000) {
            lastOscErrorRef.current = now;
            toast("error", "Failed to update audio channel");
          }
        }
      } catch {
        const now = Date.now();
        if (now - lastOscErrorRef.current > 5000) {
          lastOscErrorRef.current = now;
          toast("error", "Failed to update audio channel");
        }
      }
    },
    [toast] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleOsc = useCallback(async (channelId: string, values: Record<string, unknown>) => {
    try {
      await audioApi.sendOsc({ channelId, ...values });
    } catch {
      // Throttled error handling — don't spam toasts during drag
    }
  }, []);

  const handleSelect = useCallback(
    async (channelId: string) => {
      try {
        await audioApi.updateSettings({ selectedChannelId: channelId });
      } catch {
        toast("error", "Failed to select channel");
      }
    },
    [toast]
  );

  const handleRecallSnapshot = useCallback(
    async (snapshot: AudioSnapshot) => {
      try {
        const res = await audioSnapshotsApi.recall(snapshot.id);
        const data = await res.json();
        if (data.recalled) {
          toast("success", `Recalled "${snapshot.name}"`);
        } else {
          toast("error", "Snapshot recall failed — OSC not connected");
        }
      } catch {
        toast("error", "Failed to recall snapshot");
      }
    },
    [toast]
  );

  const handleDeleteChannel = useCallback(
    async (channel: AudioChannel) => {
      try {
        const res = await audioApi.delete(channel.id);
        if (!res.ok) {
          toast("error", "Failed to delete channel");
          return;
        }
        toast("success", `Deleted "${channel.name}"`);
        onDataChange();
      } catch {
        toast("error", "Failed to delete channel");
      }
      setModal({ type: "none" });
    },
    [toast, onDataChange]
  );

  const sorted = [...audioChannels].sort((a, b) => a.order - b.order);

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col gap-3">
      {/* Toolbar */}
      <AudioToolbar
        oscStatus={oscStatus}
        snapshots={audioSnapshots}
        onRecallSnapshot={handleRecallSnapshot}
        onAddChannel={() => setModal({ type: "addChannel" })}
        onOpenSettings={() => setModal({ type: "settings" })}
      />

      {/* Channel strips */}
      <div className="flex flex-1 items-start justify-center gap-3 overflow-x-auto px-2 py-4">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-studio-500">
            <p className="text-sm">No audio channels configured.</p>
            <button
              onClick={() => setModal({ type: "addChannel" })}
              className="rounded-badge bg-accent-blue px-4 py-2 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80"
            >
              Add Channel
            </button>
          </div>
        ) : (
          sorted.map((ch) => (
            <AudioChannelStrip
              key={ch.id}
              channel={ch}
              meterData={meters.get(ch.id)}
              selected={audioSettings.selectedChannelId === ch.id}
              onSelect={handleSelect}
              onUpdate={handleUpdate}
              onOsc={handleOsc}
              onEdit={(channel) => setModal({ type: "editChannel", channel })}
              onDelete={(channel) => setModal({ type: "deleteChannel", channel })}
            />
          ))
        )}
      </div>

      {/* Modals */}
      {modal.type === "settings" && (
        <AudioSettingsModal
          settings={audioSettings}
          onClose={() => setModal({ type: "none" })}
          onSaved={onDataChange}
        />
      )}

      {(modal.type === "addChannel" || modal.type === "editChannel") && (
        <AudioChannelConfigModal
          channel={modal.type === "editChannel" ? modal.channel : undefined}
          onClose={() => setModal({ type: "none" })}
          onSaved={onDataChange}
        />
      )}

      {modal.type === "deleteChannel" && (
        <ConfirmDialog
          title="Delete Channel"
          message={`Delete "${modal.channel.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => handleDeleteChannel(modal.channel)}
          onCancel={() => setModal({ type: "none" })}
        />
      )}
    </div>
  );
}
