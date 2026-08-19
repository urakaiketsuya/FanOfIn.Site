import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { SiteChangelogData, SiteChangelogEntry } from "@gatcg/shared";

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_PATH = path.join(REPO_ROOT, "data/changelog.json");

const RECORD_SEP = "\x1f";
const ENTRY_SEP = "\x1e";
const MAX_ENTRIES = 500;

/** Automated weekly data-refresh commits (see .github/workflows/data-refresh.yml) aren't a real site change to show visitors. */
const NOISE_PREFIXES = ["chore: weekly data refresh"];

/**
 * Publishes recent commit history as a lightweight changelog — "for now," per explicit direction,
 * each entry is just the commit's own subject line, not a curated/rewritten description. Pure
 * local `git log` read (no network fetch), runs unconditionally alongside sitemap/manifest/vods.
 *
 * Requires full git history in whichever checkout runs this — a shallow clone (GitHub Actions'
 * `actions/checkout` default, depth 1) only has the latest commit, so `data-refresh.yml`'s
 * checkout step needs `fetch-depth: 0`. Missing/shallow history fails soft (warns, skips) rather
 * than breaking the whole pipeline run over a changelog.
 */
export async function publishChangelog(): Promise<void> {
  let output: string;
  try {
    output = execFileSync(
      "git",
      ["log", `-n`, String(MAX_ENTRIES), "--no-merges", `--pretty=format:%h${RECORD_SEP}%aI${RECORD_SEP}%s${ENTRY_SEP}`],
      { cwd: REPO_ROOT, encoding: "utf-8", maxBuffer: 1024 * 1024 * 16 },
    );
  } catch (err) {
    console.warn("changelog: `git log` failed (not a git checkout, or history unavailable) — skipping", err);
    return;
  }

  const entries: SiteChangelogEntry[] = output
    .split(ENTRY_SEP)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [hash, date, summary] = line.split(RECORD_SEP);
      return { hash, date, summary };
    })
    .filter((e) => !NOISE_PREFIXES.some((prefix) => e.summary.startsWith(prefix)));

  const data: SiteChangelogData = { generatedAt: new Date().toISOString(), entries };
  await writeFile(OUT_PATH, JSON.stringify(data), "utf-8");
}
