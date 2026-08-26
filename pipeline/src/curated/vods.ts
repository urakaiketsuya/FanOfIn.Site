import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { VodLink, VodsData } from "@gatcg/shared";
import type { OmnidexEventBundle } from "../omnidex/cache.js";

const CURATED_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../curated/vods.json");
const OUT_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../data/omnidex/vods.json");

/**
 * Publishes the hand-curated event-id -> VOD-link map (pipeline/curated/vods.json, checked into
 * git and edited by hand — Omnidex has no video-link field, so there's no API source for this) as
 * data/omnidex/vods.json. Format: `{ "<eventId>": [{ "label": "Finals", "url": "https://..." }] }`.
 * Pure local transform, no network fetch — runs unconditionally regardless of fetch/analysis mode,
 * same as writeManifest. Warns (doesn't fail the build) about curated ids missing from the crawled
 * cache, since a typo'd event id would otherwise silently produce a dead link with no feedback.
 * Takes the bundle array as a parameter (see buildOmnidexIndex's doc comment) instead of reading
 * the Omnidex cache itself.
 */
export async function publishVods(bundles: OmnidexEventBundle[]): Promise<void> {
  let raw: Record<string, VodLink[]>;
  try {
    raw = JSON.parse(await readFile(CURATED_PATH, "utf-8")) as Record<string, VodLink[]>;
  } catch {
    raw = {}; // curated/vods.json is optional — fine if it doesn't exist yet
  }

  const knownIds = new Set(bundles.map((b) => b.id));
  for (const idStr of Object.keys(raw)) {
    if (!knownIds.has(Number(idStr))) {
      console.warn(`curated/vods.json: event ${idStr} isn't in the crawled cache — check for a typo`);
    }
  }

  const data: VodsData = { generatedAt: new Date().toISOString(), vods: raw };
  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(data), "utf-8");
}
