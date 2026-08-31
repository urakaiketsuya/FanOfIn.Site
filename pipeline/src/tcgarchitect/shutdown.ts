/** Same cooperative-shutdown reasoning as shoutatyourdecks/shutdown.ts (see that file's doc
 * comment) — kept as its own small copy rather than a shared import so each source's log lines
 * stay unambiguous about which crawl is shutting down. */
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
      console.error(`tcgarchitect: second ${signal} received — forcing exit now`);
      process.exit(1);
    }
    shuttingDown = true;
    console.log(`tcgarchitect: ${signal} received — finishing the current page, then checkpointing and exiting`);
  };

  process.on("SIGINT", () => handle("SIGINT"));
  process.on("SIGTERM", () => handle("SIGTERM"));
}
