export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-white mb-2">Page not found</h1>
        <p className="text-sm text-gray-400 mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
        <a
          href="/"
          className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors"
        >
          Return to Dashboard
        </a>
      </div>
    </div>
  );
}
