import { writeFile, rename } from "node:fs/promises";

/**
 * A plain writeFile can leave a truncated/corrupt file if the process dies mid-write (power loss,
 * OOM kill, `kill -9` — none of which a signal handler can intercept). Write-to-temp-then-rename
 * is atomic on POSIX as long as both paths are on the same filesystem (true here — always the same
 * directory), so a reader never observes a partial file: it's either the old complete version or
 * the new complete version, never in between. Matters most for the small, frequently-rewritten
 * checkpoint files (harvest-meta.json, progress.json) that a resume depends on being parseable.
 */
export async function writeJsonAtomic(path: string, data: unknown): Promise<void> {
  const tmpPath = `${path}.tmp-${process.pid}`;
  await writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  await rename(tmpPath, path);
}
