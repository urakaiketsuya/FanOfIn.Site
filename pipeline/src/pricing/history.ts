import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PRICE_HISTORY_MAX_POINTS, type PriceData, type PriceHistoryData, type PriceHistoryPoint } from "@gatcg/shared";

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../data");
const HISTORY_PATH = path.join(DATA_DIR, "priceHistory.json");

async function readExistingHistory(): Promise<Record<string, PriceHistoryPoint[]>> {
  try {
    const raw = await readFile(HISTORY_PATH, "utf-8");
    return (JSON.parse(raw) as PriceHistoryData).history;
  } catch {
    return {}; // first run, or the file hasn't been published yet
  }
}

/**
 * Appends one snapshot per priced edition to the already-published `data/priceHistory.json` (the
 * file on disk before this run *is* last run's published state — this pipeline commits `data/`
 * directly, no separate cache needed here). Trims each edition's array to the most recent
 * `PRICE_HISTORY_MAX_POINTS` so the file settles into a flat steady-state size instead of growing
 * forever. Editions present in a prior run's history but missing from `current.prices` (e.g.
 * TCGCSV briefly missing a product) are left untouched — a gap in that edition's series, not a
 * forced null point or a deletion.
 */
export async function updatePriceHistory(current: PriceData): Promise<PriceHistoryData> {
  const history = await readExistingHistory();

  for (const [key, entry] of Object.entries(current.prices)) {
    const points = history[key] ?? [];
    points.push({ date: current.generatedAt, normalMarket: entry.normal?.market ?? null, foilMarket: entry.foil?.market ?? null });
    history[key] = points.length > PRICE_HISTORY_MAX_POINTS ? points.slice(-PRICE_HISTORY_MAX_POINTS) : points;
  }

  return { generatedAt: current.generatedAt, history };
}

export async function writePriceHistory(data: PriceHistoryData): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(HISTORY_PATH, JSON.stringify(data), "utf-8");
}
