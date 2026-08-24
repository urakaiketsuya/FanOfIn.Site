/**
 * By default, Ctrl+C (SIGINT) or a process manager's stop signal (SIGTERM) kills a long-running
 * Node process before any pending `finally`/checkpoint write gets a chance to run — for a
 * multi-hour crawl, that means losing up to a full checkpoint interval of progress for no reason,
 * since the process *could* have shut down cleanly. This installs a flag-based cooperative
 * shutdown instead: loops in harvest.ts/run.ts check `isShuttingDown()` between units of work
 * (one deck, one page) and break out to their existing checkpoint-then-return path rather than
 * being killed mid-operation. A second signal force-exits immediately, for an impatient user or a
 * genuinely stuck run.
 */
/**
 * Playwright's own `chromium.launch()` installs its own SIGINT/SIGTERM/SIGHUP handlers by default
 * (to make sure the browser subprocess gets killed) — confirmed by testing that it force-exits the
 * whole process immediately on SIGINT, before the cooperative shutdown flag below ever gets
 * noticed by a running loop. Pass this to every `chromium.launch()` call in this module so ours is
 * the only signal handling in effect.
 */
export const PLAYWRIGHT_LAUNCH_OPTIONS = { headless: true, handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false };

let shuttingDown = false;
let installed = false;

export function isShuttingDown(): boolean {
  return shuttingDown;
}

export function installGracefulShutdown(): void {
  if (installed) return;
  installed = true;

  const handle = (signal: string) => {
    if (shuttingDown) {
      console.error(`shoutatyourdecks: second ${signal} received — forcing exit now`);
      process.exit(1);
    }
    shuttingDown = true;
    console.log(`shoutatyourdecks: ${signal} received — finishing the current deck/page, then checkpointing and exiting`);
  };

  process.on("SIGINT", () => handle("SIGINT"));
  process.on("SIGTERM", () => handle("SIGTERM"));
}
