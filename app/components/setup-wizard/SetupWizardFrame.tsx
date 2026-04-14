"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import ConfirmDialog from "../shared/ConfirmDialog";
import Modal from "../shared/Modal";

interface SetupWizardFrameProps {
  step: number;
  totalSteps: number;
  stepLabels: string[];
  currentStepLabel: string;
  showSkipConfirm: boolean;
  onRequestClose: () => void;
  onConfirmSkip: () => void;
  onCancelSkip: () => void;
  children: ReactNode;
}

export default function SetupWizardFrame({
  step,
  totalSteps,
  stepLabels,
  currentStepLabel,
  showSkipConfirm,
  onRequestClose,
  onConfirmSkip,
  onCancelSkip,
  children,
}: SetupWizardFrameProps) {
  const progressPercent = ((step + 1) / totalSteps) * 100;

  return (
    <Modal onClose={onRequestClose} ariaLabel="Setup Wizard">
      <div className="relative w-full max-w-5xl animate-scale-in overflow-hidden rounded-[26px] border border-studio-700/80 bg-[radial-gradient(circle_at_top_left,_rgba(153,186,146,0.12),_transparent_35%),linear-gradient(180deg,_rgba(22,22,31,0.97),_rgba(8,10,14,0.99))] shadow-modal backdrop-blur">
        <button
          type="button"
          onClick={onRequestClose}
          className="absolute right-3 top-3 z-10 rounded-badge p-1 text-studio-500 transition-colors hover:text-studio-200"
          title="Skip setup"
        >
          <X size={16} />
        </button>

        {showSkipConfirm && (
          <ConfirmDialog
            title="Skip setup?"
            message="You can access these settings later from the Lights and Audio views."
            confirmLabel="Skip"
            onConfirm={onConfirmSkip}
            onCancel={onCancelSkip}
          />
        )}

        <div className="grid max-h-[min(880px,calc(100vh-2.5rem))] min-h-[640px] grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="border-b border-studio-800/70 bg-studio-950/55 px-4 py-5 xl:border-b-0 xl:border-r">
            <div className="pr-8">
              <p className="text-xxs font-semibold uppercase tracking-[0.24em] text-accent-blue/80">
                Studio Console Commissioning
              </p>
              <p className="mt-1 text-xs text-studio-500">
                Step {step + 1} of {totalSteps} · {currentStepLabel}
              </p>
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-studio-900">
              <div
                className="h-full rounded-full bg-accent-blue transition-[width] duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="mt-5 space-y-2">
              {stepLabels.map((label, index) => {
                const active = index === step;
                const complete = index < step;

                return (
                  <div
                    key={`${label}-${index}`}
                    className={`rounded-[14px] border px-3 py-2.5 ${
                      active
                        ? "border-accent-blue/35 bg-accent-blue/10"
                        : complete
                          ? "bg-emerald-500/8 border-emerald-500/20"
                          : "border-studio-800 bg-studio-950/35"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-pill text-[11px] font-semibold ${
                          active
                            ? "bg-accent-blue/15 text-accent-blue"
                            : complete
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-studio-800 text-studio-400"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className={`text-sm font-medium ${active ? "text-studio-50" : "text-studio-300"}`}>
                        {label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-5 text-xxs leading-5 text-studio-500">
              Configure only what this workstation needs today. The rest can be revisited later from the main console.
            </p>
          </aside>

          <div className="flex min-h-0 flex-col px-5 py-5">
            <div className="mb-4 pr-8">
              <div className="console-label">Current Step</div>
              <div className="mt-1 text-lg font-semibold text-studio-100">{currentStepLabel}</div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>

            <div className="mt-4 border-t border-studio-800 pt-3 text-center text-xxs text-studio-500">
              You can reopen this commissioning flow later from the console if the studio hardware changes.
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
