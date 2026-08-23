import { writeFile, open } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../data");

/** Every published dataset the app fetches via `usePublishedData` — key must match the `key` argument used at each call site (see app/src/features/.../data.ts), or the app won't recognize a change. */
const MANIFEST_ENTRIES: { key: string; file: string }[] = [
  { key: "price-history", file: "priceHistory.json" },
  { key: "omnidex-index", file: "omnidex/index.json" },
  { key: "omnidex-players", file: "omnidex/players.json" },
  { key: "omnidex-judges", file: "omnidex/judges.json" },
  { key: "omnidex-teams", file: "omnidex/teams.json" },
  { key: "omnidex-vods", file: "omnidex/vods.json" },
  { key: "changelog", file: "changelog.json" },
  { key: "analysis-elo", file: "analysis/elo.json" },
  { key: "analysis-elo-history", file: "analysis/elo-history.json" },
  { key: "analysis-rivals", file: "analysis/rivals.json" },
  { key: "analysis-cards", file: "analysis/cards.json" },
  { key: "analysis-keyword-stats", file: "analysis/keyword-stats.json" },
  { key: "analysis-card-quantity-stats", file: "analysis/card-quantity-stats.json" },
  { key: "analysis-composition-win-rates", file: "analysis/composition-win-rates.json" },
  { key: "analysis-archetypes", file: "analysis/archetypes.json" },
  { key: "analysis-champion-trends", file: "analysis/champion-trends.json" },
  { key: "analysis-archetype-taxonomy", file: "analysis/archetype-taxonomy.json" },
  { key: "analysis-achievements", file: "analysis/achievements.json" },
  { key: "analysis-hipster", file: "analysis/hipster.json" },
  { key: "analysis-similarity", file: "analysis/similarity.json" },
  { key: "analysis-player-decks", file: "analysis/player-decks.json" },
  { key: "analysis-deck-sightings", file: "analysis/deck-sightings.json" },
  { key: "analysis-deck-popularity-index", file: "analysis/deck-popularity-index.json" },
  { key: "analysis-deck-card-index", file: "analysis/deck-card-index.json" },
  { key: "analysis-card-impact", file: "analysis/card-impact.json" },
  { key: "analysis-matchup-card-impact", file: "analysis/matchup-card-impact.json" },
];

/**
 * Reads just the first ~200 bytes of a published dataset to pull out its `generatedAt` value,
 * rather than JSON.parse-ing the whole file — some of these are 90MB+, and every dataset writer
 * always emits `generatedAt` as the first key, so a small prefix read is enough.
 */
async function readGeneratedAt(filePath: string): Promise<string | null> {
  try {
    const handle = await open(filePath, "r");
    const buf = Buffer.alloc(200);
    const { bytesRead } = await handle.read(buf, 0, 200, 0);
    await handle.close();
    return buf.subarray(0, bytesRead).toString("utf-8").match(/"generatedAt":"([^"]+)"/)?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Writes `data/manifest.json` — a tiny `{key: generatedAt}` map the app checks before deciding
 * whether to fetch+parse a (possibly huge) dataset file at all. Without this, `usePublishedData`
 * had no way to know a dataset was unchanged without downloading and parsing the whole thing
 * first, so every page visit re-paid that cost even when nothing had changed since the last one —
 * worst case, deck-card-index.json (93MB) on every visit to a card's "Combos" tab.
 *
 * Always re-reads whatever's currently on disk rather than tracking state through the run, so it
 * reflects reality regardless of which steps this particular invocation ran (fetch-only,
 * analysis-only, or both) — call at the very end of the pipeline, unconditionally.
 */
export async function writeManifest(): Promise<void> {
  const manifest: Record<string, string> = {};
  for (const { key, file } of MANIFEST_ENTRIES) {
    const generatedAt = await readGeneratedAt(path.join(DATA_DIR, file));
    if (generatedAt) manifest[key] = generatedAt;
  }
  await writeFile(path.join(DATA_DIR, "manifest.json"), JSON.stringify(manifest), "utf-8");
}
