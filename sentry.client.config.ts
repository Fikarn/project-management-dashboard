import * as Sentry from "@sentry/nextjs";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    // Only send events in production builds — dev stays clean
    enabled: process.env.NODE_ENV === "production",
    tracesSampleRate: 0, // No performance tracing
    replaysSessionSampleRate: 0, // No session replays
  });
}
