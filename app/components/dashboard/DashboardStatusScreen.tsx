"use client";

interface DashboardStatusScreenProps {
  mode: "loading" | "error";
  onRetry?: () => void;
}

export default function DashboardStatusScreen({ mode, onRetry }: DashboardStatusScreenProps) {
  return (
    <div className="flex min-h-screen animate-fade-in items-center justify-center px-6">
      <div className="w-full max-w-md rounded-[22px] border border-studio-700/80 bg-studio-900/80 p-8 text-center shadow-modal backdrop-blur">
        <div className="mb-3 text-xxs font-semibold uppercase tracking-[0.24em] text-accent-blue/80">
          Studio Console
        </div>

        {mode === "loading" ? (
          <>
            <div className="mx-auto mb-4 inline-block h-10 w-10 animate-spin rounded-full border-2 border-studio-700 border-t-accent-blue" />
            <p className="text-lg font-semibold text-studio-100">Starting the local control stack</p>
            <p className="mt-2 text-sm text-studio-400">
              Loading studio data, device status, and the latest planning board state.
            </p>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-studio-100">The console could not finish loading</p>
            <p className="mt-2 text-sm text-studio-400">
              The internal server may still be starting up or recovering from a previous session.
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-5 rounded-badge bg-accent-blue px-4 py-2 text-sm font-medium text-studio-950 transition-colors hover:bg-accent-blue/80"
            >
              Retry startup
            </button>
          </>
        )}
      </div>
    </div>
  );
}
