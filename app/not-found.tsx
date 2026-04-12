export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-2 text-xl font-semibold text-studio-100">Page not found</h1>
        <p className="mb-6 text-sm text-studio-400">The page you&apos;re looking for doesn&apos;t exist.</p>
        <a
          href="/"
          className="rounded-badge bg-accent-blue px-4 py-2 text-sm text-studio-950 transition-colors hover:bg-accent-blue/80"
        >
          Return to Dashboard
        </a>
      </div>
    </div>
  );
}
