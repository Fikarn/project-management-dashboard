const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            // 'unsafe-inline' is required in both script-src and style-src:
            //   - style-src: Next.js 14 injects inline <style> tags for CSS-in-JS and Tailwind
            //   - script-src: Next.js 14 hydration uses inline scripts for __NEXT_DATA__ and chunk preloading
            // Next.js 15+ supports nonce-based CSP (strict-dynamic), which would remove the
            // need for unsafe-inline. Revisit when upgrading from 14.2.
            // Dev mode additionally needs 'unsafe-eval' for Fast Refresh / hot-reload.
            value:
              process.env.NODE_ENV === "development"
                ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; font-src 'self'"
                : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; font-src 'self'",
          },
        ],
      },
    ];
  },
};

// Wrap with Sentry only when SENTRY_DSN is configured (inert in local dev by default)
let exportConfig = nextConfig;
if (process.env.SENTRY_DSN) {
  const { withSentryConfig } = require("@sentry/nextjs");
  exportConfig = withSentryConfig(exportConfig, {
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  });
}

module.exports = withBundleAnalyzer(exportConfig);
