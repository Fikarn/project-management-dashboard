"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "./ToastContext";
import Modal from "./Modal";

interface WelcomeModalProps {
  onClose: () => void;
  onSeeded: () => void;
}

type Step = "welcome" | "data" | "deck";

export default function WelcomeModal({ onClose, onSeeded }: WelcomeModalProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [seeding, setSeeding] = useState(false);
  const toast = useToast();

  async function handleSeed() {
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      if (res.ok) {
        toast("success", "Sample projects loaded");
        onSeeded();
        setStep("deck");
      } else {
        toast("error", "Failed to load sample data");
        setSeeding(false);
      }
    } catch {
      toast("error", "Failed to load sample data");
      setSeeding(false);
    }
  }

  function handleStartEmpty() {
    setStep("deck");
  }

  function handleFinish() {
    localStorage.setItem("hasSeenWelcome", "1");
    onClose();
  }

  return (
    <Modal onClose={onClose} ariaLabel="Welcome to Project Manager">
      <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 p-6">
        {step === "welcome" && (
          <>
            <h2 className="mb-2 text-lg font-semibold text-white">Welcome to Project Manager</h2>
            <p className="mb-6 text-sm text-gray-400">
              A Kanban dashboard for tracking projects and tasks. Drag and drop between columns, track time, and
              optionally control everything from a Stream Deck+.
            </p>
            <button
              onClick={() => setStep("data")}
              className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
            >
              Get Started
            </button>
          </>
        )}

        {step === "data" && (
          <>
            <h2 className="mb-2 text-lg font-semibold text-white">Set Up Your Board</h2>
            <p className="mb-6 text-sm text-gray-400">
              Start with sample projects to explore the features, or jump right in with an empty board.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                {seeding ? "Loading..." : "Load Sample Projects"}
              </button>
              <button
                onClick={handleStartEmpty}
                className="w-full rounded bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-gray-600"
              >
                Start Empty
              </button>
            </div>
          </>
        )}

        {step === "deck" && (
          <>
            <h2 className="mb-2 text-lg font-semibold text-white">Connect Stream Deck+</h2>
            <p className="mb-4 text-sm text-gray-400">
              If you have a Stream Deck+ and Bitfocus Companion, you can download a pre-built config to control the
              dashboard with physical buttons and dials.
            </p>
            <div className="space-y-3">
              <Link
                href="/setup"
                onClick={handleFinish}
                className="block w-full rounded bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-500"
              >
                Set Up Stream Deck
              </Link>
              <button
                onClick={handleFinish}
                className="w-full rounded bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-gray-600"
              >
                Skip for Now
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
