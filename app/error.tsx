"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="mb-2 text-xl font-semibold text-studio-100">Something went wrong</h1>
        <p className="mb-6 text-sm text-studio-400">{error.message || "An unexpected error occurred."}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-badge bg-accent-blue px-4 py-2 text-sm text-studio-950 transition-colors hover:bg-accent-blue/80"
          >
            Try Again
          </button>
          <a
            href="/"
            className="rounded-badge bg-studio-700 px-4 py-2 text-sm text-studio-300 transition-colors hover:bg-studio-600"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
