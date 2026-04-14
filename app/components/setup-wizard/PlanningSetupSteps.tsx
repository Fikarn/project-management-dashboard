"use client";

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <>
      <h2 className="mb-2 text-lg font-semibold text-studio-100">Welcome to SSE ExEd Studio Control</h2>
      <p className="mb-2 text-sm text-studio-400">
        This workstation runs your live lighting control, audio snapshots, Stream Deck actions, and a planning board for
        prep work.
      </p>
      <div className="mb-6 mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-card border border-studio-700 bg-studio-900/50 p-3 text-center">
          <div className="mb-1 text-2xl">&#128161;</div>
          <div className="text-xs font-medium text-studio-300">Lighting Control</div>
          <div className="text-xs text-studio-500">DMX patching, scenes, and fixture testing</div>
        </div>
        <div className="rounded-card border border-studio-700 bg-studio-900/50 p-3 text-center">
          <div className="mb-1 text-2xl">&#127911;</div>
          <div className="text-xs font-medium text-studio-300">Audio + Hardware</div>
          <div className="text-xs text-studio-500">OSC snapshots and Stream Deck workflows</div>
        </div>
        <div className="rounded-card border border-studio-700 bg-studio-900/50 p-3 text-center">
          <div className="mb-1 text-2xl">&#128203;</div>
          <div className="text-xs font-medium text-studio-300">Planning Board</div>
          <div className="text-xs text-studio-500">Prep tasks, timers, and run-of-show notes</div>
        </div>
      </div>
      <button
        type="button"
        onClick={onNext}
        className="w-full rounded-badge bg-accent-blue px-4 py-2 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80"
      >
        Get Started
      </button>
    </>
  );
}

interface UseCaseStepProps {
  onChoosePlanningOnly: () => void;
  onChooseStudioControl: () => void;
}

export function UseCaseStep({ onChoosePlanningOnly, onChooseStudioControl }: UseCaseStepProps) {
  return (
    <>
      <h2 className="mb-2 text-lg font-semibold text-studio-100">What do you want to configure right now?</h2>
      <p className="mb-4 text-sm text-studio-400">
        Keep this lightweight if you only need planning today. Full studio commissioning can happen now or later.
      </p>
      <div className="space-y-3">
        <button
          type="button"
          onClick={onChoosePlanningOnly}
          className="w-full rounded-card border border-studio-700 bg-studio-900/50 p-4 text-left transition-colors hover:border-studio-600"
        >
          <div className="text-sm font-medium text-studio-100">Planning board only</div>
          <div className="text-xs text-studio-400">
            Projects, tasks, timers, and backup protection without DMX setup
          </div>
        </button>
        <button
          type="button"
          onClick={onChooseStudioControl}
          className="w-full rounded-card border border-studio-700 bg-studio-900/50 p-4 text-left transition-colors hover:border-studio-600"
        >
          <div className="text-sm font-medium text-studio-100">Studio control + planning board</div>
          <div className="text-xs text-studio-400">
            Lighting setup now, plus the planning board for prep and run-of-show support
          </div>
        </button>
      </div>
    </>
  );
}

interface PlanningSeedStepProps {
  seeding: boolean;
  onSeed: () => void;
  onStartEmpty: () => void;
  onPrev: () => void;
}

export function PlanningSeedStep({ seeding, onSeed, onStartEmpty, onPrev }: PlanningSeedStepProps) {
  return (
    <>
      <h2 className="mb-2 text-lg font-semibold text-studio-100">Load a sample planning board</h2>
      <p className="mb-4 text-sm text-studio-400">
        Load example projects and tasks so the planning workspace is useful immediately after commissioning.
      </p>
      <div className="space-y-3">
        <button
          type="button"
          onClick={onSeed}
          disabled={seeding}
          className="w-full rounded-badge bg-accent-blue px-4 py-2 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80 disabled:opacity-50"
        >
          {seeding ? "Loading..." : "Load Sample Planning Data"}
        </button>
        <button
          type="button"
          onClick={onStartEmpty}
          className="w-full rounded-badge bg-studio-700 px-4 py-2 text-sm font-medium text-studio-200 transition-colors hover:bg-studio-600"
        >
          Start Empty
        </button>
      </div>
      <div className="mt-4 flex justify-start">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-badge bg-studio-700 px-3 py-1.5 text-sm text-studio-300 transition-colors hover:bg-studio-600"
        >
          Back
        </button>
      </div>
    </>
  );
}

interface TipsStepProps {
  onFinish: () => void;
  onPrev: () => void;
}

export function TipsStep({ onFinish, onPrev }: TipsStepProps) {
  return (
    <>
      <h2 className="mb-2 text-lg font-semibold text-studio-100">Console ready</h2>
      <p className="mb-4 text-sm text-studio-400">A few shortcuts to get you started:</p>
      <div className="space-y-2 text-sm">
        {[
          ["N", "Create a new project"],
          ["L", "Toggle lighting view"],
          ["K", "Open the planning board"],
          ["?", "Show all keyboard shortcuts"],
        ].map(([key, description]) => (
          <div key={key} className="flex items-center justify-between rounded-badge bg-studio-900/50 px-3 py-2">
            <span className="text-studio-300">{description}</span>
            <kbd className="rounded-badge bg-studio-700 px-2 py-0.5 font-mono text-xs text-studio-300">{key}</kbd>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-studio-500">
        Your data saves automatically on every change. Backups are created every 30 minutes (last 10 kept). Press{" "}
        <kbd className="rounded-badge bg-studio-700 px-1 py-0.5 font-mono text-xs text-studio-400">E</kbd> to export
        anytime.
      </p>
      <button
        type="button"
        onClick={onFinish}
        className="mt-4 w-full rounded-badge bg-accent-blue px-4 py-2 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80"
      >
        Done
      </button>
      <div className="mt-3 flex justify-start">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-badge bg-studio-700 px-3 py-1.5 text-sm text-studio-300 transition-colors hover:bg-studio-600"
        >
          Back
        </button>
      </div>
    </>
  );
}
