"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import ConfirmDialog from "../shared/ConfirmDialog";
import Modal from "../shared/Modal";

interface SetupWizardFrameProps {
  step: number;
  totalSteps: number;
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
      <div className="relative w-full max-w-2xl animate-scale-in rounded-[24px] border border-studio-700/80 bg-[radial-gradient(circle_at_top_left,_rgba(153,186,146,0.12),_transparent_35%),linear-gradient(180deg,_rgba(22,22,31,0.96),_rgba(22,22,31,0.98))] p-6 shadow-modal backdrop-blur">
        <button
          type="button"
          onClick={onRequestClose}
          className="absolute right-3 top-3 rounded-badge p-1 text-studio-500 transition-colors hover:text-studio-200"
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

        <div className="mb-6 pr-10">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-xxs font-semibold uppercase tracking-[0.24em] text-accent-blue/80">
                Studio Console Commissioning
              </p>
              <p className="mt-1 text-xs text-studio-500">
                Step {step + 1} of {totalSteps} · {currentStepLabel}
              </p>
            </div>
            <p className="max-w-[220px] text-right text-xxs text-studio-500">
              Configure only what this workstation needs today. You can revisit the rest later.
            </p>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-studio-900">
            <div
              className="h-full rounded-full bg-accent-blue transition-[width] duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {children}

        <div className="mt-4 text-center text-xxs text-studio-500">
          You can reopen this commissioning flow later from the console if the studio hardware changes.
        </div>
      </div>
    </Modal>
  );
}
