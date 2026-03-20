"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="mb-2 text-xl font-semibold text-white">Something went wrong</h1>
        <p className="mb-6 text-sm text-gray-400">{error.message || "An unexpected error occurred."}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-500"
          >
            Try Again
          </button>
          <a
            href="/"
            className="rounded bg-gray-700 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-600"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
