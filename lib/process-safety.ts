/** Global process error handlers — prevent crashes during live sessions. */

let installed = false;

export function installProcessSafetyHandlers(): void {
  if (installed) return;
  installed = true;

  process.on("uncaughtException", (err) => {
    console.error("[CRITICAL] Uncaught exception — process kept alive:", err);
  });

  process.on("unhandledRejection", (reason) => {
    console.error("[CRITICAL] Unhandled rejection — process kept alive:", reason);
  });
}
