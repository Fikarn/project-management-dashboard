export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { installProcessSafetyHandlers } = await import("./lib/process-safety");
    installProcessSafetyHandlers();
    await import("./sentry.server.config");
  }
}

export const onRequestError = async (err: unknown) => {
  if (process.env.SENTRY_DSN) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(err);
  }
};
