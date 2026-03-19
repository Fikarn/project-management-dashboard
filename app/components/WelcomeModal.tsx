"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "./ToastContext";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
        {step === "welcome" && (
          <>
            <h2 className="text-lg font-semibold text-white mb-2">
              Welcome to Project Manager
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              A Kanban dashboard for tracking projects and tasks. Drag and drop
              between columns, track time, and optionally control everything from
              a Stream Deck+.
            </p>
            <button
              onClick={() => setStep("data")}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors"
            >
              Get Started
            </button>
          </>
        )}

        {step === "data" && (
          <>
            <h2 className="text-lg font-semibold text-white mb-2">
              Set Up Your Board
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              Start with sample projects to explore the features, or jump right
              in with an empty board.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors disabled:opacity-50"
              >
                {seeding ? "Loading..." : "Load Sample Projects"}
              </button>
              <button
                onClick={handleStartEmpty}
                className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium rounded transition-colors"
              >
                Start Empty
              </button>
            </div>
          </>
        )}

        {step === "deck" && (
          <>
            <h2 className="text-lg font-semibold text-white mb-2">
              Connect Stream Deck+
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              If you have a Stream Deck+ and Bitfocus Companion, you can
              download a pre-built config to control the dashboard with physical
              buttons and dials.
            </p>
            <div className="space-y-3">
              <Link
                href="/setup"
                onClick={handleFinish}
                className="block w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors text-center"
              >
                Set Up Stream Deck
              </Link>
              <button
                onClick={handleFinish}
                className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium rounded transition-colors"
              >
                Skip for Now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
