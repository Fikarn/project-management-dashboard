export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { installProcessSafetyHandlers } = await import("./lib/process-safety");
    installProcessSafetyHandlers();
  }
}
