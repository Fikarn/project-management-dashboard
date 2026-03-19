"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-semibold text-white mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-400 mb-6">{error.message || "An unexpected error occurred."}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          >
            Try Again
          </button>
          <a
            href="/"
            className="px-4 py-2 text-sm rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
