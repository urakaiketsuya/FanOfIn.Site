import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ArchetypeTaxonomyData, ChampionTrendsData, OmnidexIndexData } from "@gatcg/shared";
import { loadCardCatalog } from "./cards/catalog.js";

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../data");
const OUT_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../app/public/sitemap.xml");
const SITE_URL = "https://fanofin.site";

const STATIC_ROUTES = [
  "/",
  "/cards",
  "/cards/stats",
  "/sets",
  "/thema",
  "/tournaments",
  "/seasons",
  "/players",
  "/judges",
  "/teams",
  "/achievements",
  "/archetypes",
  "/battle-chart",
  "/top-decks",
  "/champions",
  "/compare",
  "/popular-decks",
];

/** Store Championships and up only — the ~18k weekly "regular" events add little independent search value and would dwarf every other URL in the file. */
const SITEMAP_EVENT_CATEGORIES = new Set(["worlds", "nationals", "ascent", "regionals", "store-championships"]);

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path.join(DATA_DIR, file), "utf-8")) as T;
  } catch {
    return null;
  }
}

/**
 * Publishes app/public/sitemap.xml — scoped to pages with real independent search value (card
 * names, champions, named archetype builds, higher-tier tournaments, seasons) rather than every
 * URL the site can generate. Deliberately excludes individual player profiles (13k+, low search
 * intent for a personal stats page) and the ~18k weekly "regular"-tier events (little independent
 * value, would dominate the file well past what's useful). Reads already-published JSON directly
 * rather than recomputing, except the card catalog — that's cache-backed (see catalog.ts) and
 * isn't otherwise published as a standalone list. See docs/CALCULATIONS.md.
 */
export async function writeSitemap(): Promise<void> {
  const urls = STATIC_ROUTES.map((route) => `${SITE_URL}${route}`);

  const catalog = await loadCardCatalog();
  for (const card of catalog) urls.push(`${SITE_URL}/cards/${card.slug}`);

  const index = await readJson<OmnidexIndexData>("omnidex/index.json");
  if (index) {
    for (const event of index.events) {
      if (SITEMAP_EVENT_CATEGORIES.has(event.category)) urls.push(`${SITE_URL}/events/${event.id}`);
    }
    for (const season of index.seasons) urls.push(`${SITE_URL}/seasons/${season.slug}`);
  }

  const championTrends = await readJson<ChampionTrendsData>("analysis/champion-trends.json");
  if (championTrends) {
    for (const c of championTrends.champions) urls.push(`${SITE_URL}/champions/${encodeURIComponent(c.championName)}`);
  }

  const taxonomy = await readJson<ArchetypeTaxonomyData>("analysis/archetype-taxonomy.json");
  if (taxonomy) {
    for (const cluster of taxonomy.clusters) urls.push(`${SITE_URL}/archetypes/${cluster.id}`);
  }

  const body = urls.map((u) => `  <url><loc>${xmlEscape(u)}</loc></url>`).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  await writeFile(OUT_PATH, xml, "utf-8");
  console.log(`sitemap: wrote ${urls.length} URLs to app/public/sitemap.xml`);
}
