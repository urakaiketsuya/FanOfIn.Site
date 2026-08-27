import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { CommunitySourceCounts, ShoutAtYourDecksDeck, ShoutAtYourDecksDeckSummary, SleevedDeck } from "@gatcg/shared";
import { slugify } from "@gatcg/shared";
import { loadCardCatalog, buildCardIndex } from "../cards/catalog.js";
import { listCachedDecks } from "../shoutatyourdecks/cache.js";
import { shouldKeepDeck } from "../shoutatyourdecks/filter.js";
import { withClassifiedFormat } from "../shoutatyourdecks/format.js";
import { computeCardInclusion } from "../shoutatyourdecks/analytics/cardInclusion.js";
import { computePopularity } from "../shoutatyourdecks/analytics/popularity.js";
import { computeArchetypeClustering } from "../shoutatyourdecks/analytics/archetypeClustering.js";
import { computeDeckEra } from "../shoutatyourdecks/analytics/deckEra.js";
import { computeCoOccurrence } from "../shoutatyourdecks/analytics/coOccurrence.js";
import { computeCardDeckReferences } from "../shoutatyourdecks/analytics/deckReferences.js";
import { listCachedSleevedDecks, listPublishedSleevedDecks, type CachedSleevedDeckRecord } from "../sleeved/cache.js";
import { shouldKeepSleevedDeck } from "../sleeved/filter.js";

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../data/community");

/**
 * Blends both community deck-builder sources (ShoutAtYourDecks + Sleeved) into one population for
 * every site-facing community stat (Community usage badges, Card Stats "Hype gap", Guided Deck
 * Builder's Community population — see app/src/features/community/data.ts's blended hooks), while
 * each source's own raw cache/index/analytics stays fully separate (data/shoutatyourdecks/,
 * data/sleeved/). User-confirmed direction: "keep separate locally and then have a blended one used
 * on the site." Pure local transform, no network — safe to run every day regardless of how often
 * either underlying harvest itself runs, same as shoutatyourdecks/analytics/build.ts.
 *
 * Reuses the exact same compute* functions ShoutAtYourDecks-only analytics already use — both
 * `ShoutAtYourDecksDeck` and `SleevedDeck` share the same field shape (see shared/src/sleeved-types.ts's
 * doc comment), so a concatenation of both is structurally a valid `ShoutAtYourDecksDeck[]`. Price
 * distribution is deliberately NOT blended: Sleeved decks always carry `priceLow: null` (Sleeved has
 * no price data), so a Sleeved-only population would just look like 100% missing prices — ShoutAtYourDecks
 * still publishes its own price-distribution.json unblended, and there's no combined equivalent.
 *
 * `champion` field mismatch, corrected here: ShoutAtYourDecks stores it pre-slugified (e.g.
 * "diao-chan" — confirmed against real cache data), while a transformed Sleeved deck's `champion`
 * is a proper display name from our own catalog (e.g. "Diao Chan", see sleeved/transform.ts). Every
 * function below that *groups* by champion (cardInclusion/popularity/archetypes/coOccurrence) needs
 * both sources under the identical key or the same champion fragments into two buckets — `slugify`
 * normalizes both (a no-op on ShoutAtYourDecks' already-slug values). `deckReferences` is the one
 * exception: it only ever *displays* a deck's champion (app/src/features/cards/CardDetail.tsx),
 * never groups by it, and the app already knows how to display each source's native format
 * correctly — so it's computed from the un-normalized decks instead.
 */
function withNormalizedChampion<T extends { champion: string | null }>(deck: T): T {
  return deck.champion ? { ...deck, champion: slugify(deck.champion) } : deck;
}

/** Cache wins when present because it may contain a newer authenticated harvest. A completely
 * empty cache falls back to committed data; see listPublishedSleevedDecks. Exported for the
 * regression test without exposing either filesystem location. */
export function chooseSleevedRecords(
  cached: CachedSleevedDeckRecord[],
  published: CachedSleevedDeckRecord[],
): CachedSleevedDeckRecord[] {
  return cached.length > 0 ? cached : published;
}

/** Writes generated JSON only when its substantive content changed. All analytics functions
 * create a fresh top-level generatedAt timestamp, so comparing them directly would churn ~18 MB
 * into every daily refresh commit and invalidate every client's cache even with identical source
 * decks. Preserve the prior timestamp when everything else is byte-for-byte equivalent. */
export async function writeGeneratedJsonIfChanged<T extends { generatedAt: string }>(filePath: string, value: T): Promise<boolean> {
  try {
    const existing = JSON.parse(await readFile(filePath, "utf-8")) as { generatedAt?: string };
    if (existing.generatedAt) {
      const withPreservedTimestamp = { ...value, generatedAt: existing.generatedAt };
      if (JSON.stringify(existing) === JSON.stringify(withPreservedTimestamp)) return false;
    }
  } catch {
    // Missing or malformed output is replaced below.
  }
  await writeFile(filePath, JSON.stringify(value), "utf-8");
  return true;
}

export async function runCommunityBlend(): Promise<void> {
  const [saydRecords, cachedSleevedRecords, publishedSleevedRecords] = await Promise.all([
    listCachedDecks(),
    listCachedSleevedDecks(),
    listPublishedSleevedDecks(),
  ]);
  const sleevedRecords = chooseSleevedRecords(cachedSleevedRecords, publishedSleevedRecords);

  const saydSummaries: ShoutAtYourDecksDeckSummary[] = [];
  const saydDecks: ShoutAtYourDecksDeck[] = [];
  for (const record of saydRecords) {
    if (!record.summary || !shouldKeepDeck(record.summary)) continue;
    const summary = withClassifiedFormat(record.summary, record.deck);
    saydSummaries.push(summary);
    if (record.deck) saydDecks.push({ ...record.deck, format: summary.format, formatConfidence: summary.formatConfidence });
  }

  const sleevedDecks: SleevedDeck[] = [];
  for (const record of sleevedRecords) {
    if (record.deck && shouldKeepSleevedDeck(record.deck)) sleevedDecks.push(record.deck);
  }

  console.log(`community: blending ${saydDecks.length} ShoutAtYourDecks decks + ${sleevedDecks.length} Sleeved decks`);

  const catalog = await loadCardCatalog();
  const cardIndex = buildCardIndex(catalog);

  await mkdir(DATA_DIR, { recursive: true });

  const byFormatCounts = { STANDARD: { shoutatyourdecks: 0, sleeved: 0 }, PANTHEON: { shoutatyourdecks: 0, sleeved: 0 }, UNKNOWN: { shoutatyourdecks: 0, sleeved: 0 } } satisfies CommunitySourceCounts["byFormat"];

  for (const format of ["STANDARD", "PANTHEON"] as const) {
    const decksWithLists: ShoutAtYourDecksDeck[] = [
      ...saydDecks.filter((d) => d.format === format),
      ...sleevedDecks.filter((d) => d.format === format),
    ];
    const summaries: ShoutAtYourDecksDeckSummary[] = [
      ...saydSummaries.filter((d) => d.format === format),
      ...sleevedDecks.filter((d) => d.format === format),
    ];
    byFormatCounts[format] = {
      shoutatyourdecks: saydDecks.filter((d) => d.format === format).length,
      sleeved: sleevedDecks.filter((d) => d.format === format).length,
    };

    const normalizedDecks = decksWithLists.map(withNormalizedChampion);
    const normalizedSummaries = summaries.map(withNormalizedChampion);

    const cardInclusion = computeCardInclusion(normalizedDecks, cardIndex);
    const popularity = computePopularity(normalizedSummaries, normalizedDecks, cardIndex);
    const archetypes = computeArchetypeClustering(normalizedDecks, format === "PANTHEON" ? "fuzzy" : "exact");
    const deckEra = computeDeckEra(decksWithLists, cardIndex);
    const coOccurrence = computeCoOccurrence(normalizedDecks, cardIndex);
    // Unnormalized: this one displays champion as text (CardDetail.tsx), never groups by it.
    const deckReferences = computeCardDeckReferences(decksWithLists, cardIndex);

    const dir = format === "STANDARD" ? DATA_DIR : path.join(DATA_DIR, "pantheon");
    await mkdir(dir, { recursive: true });
    await Promise.all([
      writeGeneratedJsonIfChanged(path.join(dir, "card-inclusion.json"), cardInclusion),
      writeGeneratedJsonIfChanged(path.join(dir, "popularity.json"), popularity),
      writeGeneratedJsonIfChanged(path.join(dir, "archetypes.json"), archetypes),
      writeGeneratedJsonIfChanged(path.join(dir, "deck-era.json"), deckEra),
      writeGeneratedJsonIfChanged(path.join(dir, "co-occurrence.json"), coOccurrence),
      writeGeneratedJsonIfChanged(path.join(dir, "deck-references.json"), deckReferences),
    ]);
    console.log(`community: ${format.toLowerCase()} — ${decksWithLists.length} lists blended, ${cardInclusion.overall.length} cards`);
  }

  const sourceCounts: CommunitySourceCounts = { generatedAt: new Date().toISOString(), byFormat: byFormatCounts };
  await writeGeneratedJsonIfChanged(path.join(DATA_DIR, "sources.json"), sourceCounts);
}
