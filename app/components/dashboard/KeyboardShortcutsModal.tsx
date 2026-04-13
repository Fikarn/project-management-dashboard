"use client";

import Link from "next/link";
import Modal from "../shared/Modal";

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

const SHORTCUTS = [
  ["l", "Open lighting workspace"],
  ["a", "Open audio workspace"],
  ["k", "Open planning board"],
  ["n", "Create a new project"],
  ["s /", "Focus search"],
  ["1-4", "Filter planning columns"],
  ["0", "Show all columns"],
  ["r", "Open time report"],
  ["e", "Export a backup"],
  ["Esc", "Close the current modal"],
  ["?", "Toggle this help"],
] as const;

export default function KeyboardShortcutsModal({ onClose }: KeyboardShortcutsModalProps) {
  return (
    <Modal onClose={onClose} ariaLabel="Keyboard Shortcuts & Help">
      <div className="w-full max-w-md animate-scale-in rounded-[22px] border border-studio-700/80 bg-studio-850/95 p-6 shadow-modal backdrop-blur">
        <div className="mb-4">
          <p className="text-xxs font-semibold uppercase tracking-[0.22em] text-accent-blue/80">Operator Help</p>
          <h2 className="mt-2 text-lg font-semibold text-studio-100">Keyboard shortcuts</h2>
        </div>

        <div className="space-y-2 text-sm">
          {SHORTCUTS.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between rounded-card bg-studio-900/70 px-3 py-2">
              <span className="text-studio-400">{desc}</span>
              <kbd className="rounded-badge border border-studio-600 bg-studio-700 px-2 py-0.5 font-mono text-xs text-studio-300">
                {key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-card border border-studio-700/70 bg-studio-900/50 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-studio-400">Data Safety</h3>
          <p className="text-xs text-studio-500">
            Every change saves locally. Automatic backups run every 30 minutes, and you can export a snapshot at any
            time with <kbd className="mx-1 rounded-badge bg-studio-700 px-1.5 py-0.5 font-mono text-studio-400">E</kbd>.
          </p>
        </div>

        <div className="mt-4 flex items-center gap-4 text-xs">
          <a href="/setup" className="text-accent-blue transition-colors hover:text-accent-blue/80">
            Open control surface setup
          </a>
          <Link href="/" className="text-studio-500 transition-colors hover:text-studio-300">
            Return to console home
          </Link>
        </div>
      </div>
    </Modal>
  );
}
