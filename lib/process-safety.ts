/** Global process error handlers — prevent crashes during live sessions. */

let installed = false;

export function installProcessSafetyHandlers(): void {
  if (installed) return;
  installed = true;

  process.on("uncaughtException", (err) => {
    console.error("[CRITICAL] Uncaught exception — process kept alive:", err);
    if (process.env.SENTRY_DSN) {
      // Fire-and-forget — must not throw or block the handler
      import("@sentry/nextjs").then(({ captureException }) => captureException(err)).catch(() => {});
    }
  });

  process.on("unhandledRejection", (reason) => {
    console.error("[CRITICAL] Unhandled rejection — process kept alive:", reason);
    if (process.env.SENTRY_DSN) {
      import("@sentry/nextjs").then(({ captureException }) => captureException(reason)).catch(() => {});
    }
  });
}
