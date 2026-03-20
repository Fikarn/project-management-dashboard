export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-2 text-xl font-semibold text-white">Page not found</h1>
        <p className="mb-6 text-sm text-gray-400">The page you&apos;re looking for doesn&apos;t exist.</p>
        <a href="/" className="rounded bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-500">
          Return to Dashboard
        </a>
      </div>
    </div>
  );
}
