/** Runs once when the server starts. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  const { runRetention } = await import("@/lib/retention");
  const run = () => void runRetention();
  run();
  setInterval(run, 6 * 60 * 60 * 1000).unref();
}
