import type { DeckLine, PopularityBucket, PopularityData, ShoutAtYourDecksDeck, ShoutAtYourDecksDeckSummary } from "@gatcg/shared";
import { resolveCard, type CardSignature } from "../../cards/catalog.js";

function toBuckets(counts: Map<string, number>, total: number): PopularityBucket[] {
  return Array.from(counts.entries())
    .map(([key, deckCount]) => ({ key, deckCount, percentOfDecks: total > 0 ? deckCount / total : 0 }))
    .sort((a, b) => b.deckCount - a.deckCount);
}

function computeChampionPopularity(summaries: ShoutAtYourDecksDeckSummary[]): PopularityBucket[] {
  const counts = new Map<string, number>();
  for (const s of summaries) {
    const key = s.champion ?? "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return toBuckets(counts, summaries.length);
}

function topKeys(counts: Map<string, number>, limit: number, exclude: Set<string>): string[] {
  return Array.from(counts.entries())
    .filter(([key]) => !exclude.has(key))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}

/**
 * A deck's element *identity* — top 2 elements by copies, NORM excluded — same convention as
 * `computeDeckIdentity` in app/src/lib/deckIdentity.ts (can't import it directly: that's the app
 * workspace, pipeline can only share code through `shared`, so this ~10-line weighted-top-2
 * algorithm is reimplemented here rather than duplicated via a cross-workspace hack).
 */
function deckElementIdentity(lines: DeckLine[], cardIndex: Map<string, CardSignature>): string[] {
  const elementCounts = new Map<string, number>();
  for (const line of lines) {
    const card = resolveCard(cardIndex, line.name);
    if (!card) continue;
    for (const e of card.elements) elementCounts.set(e, (elementCounts.get(e) ?? 0) + line.quantity);
  }
  return topKeys(elementCounts, 2, new Set(["NORM"]));
}

/** Counts a deck once per element in its top-2 identity (so a two-element deck contributes to both buckets) — matches how the app already treats "this deck's elements" everywhere else. */
function computeElementPopularity(decksWithLists: ShoutAtYourDecksDeck[], cardIndex: Map<string, CardSignature>): PopularityBucket[] {
  const counts = new Map<string, number>();
  for (const deck of decksWithLists) {
    const identity = deckElementIdentity([...deck.materialDeck, ...deck.mainDeck], cardIndex);
    for (const e of identity) counts.set(e, (counts.get(e) ?? 0) + 1);
  }
  return toBuckets(counts, decksWithLists.length);
}

export function computePopularity(
  summaries: ShoutAtYourDecksDeckSummary[],
  decksWithLists: ShoutAtYourDecksDeck[],
  cardIndex: Map<string, CardSignature>,
): PopularityData {
  return {
    generatedAt: new Date().toISOString(),
    championDecksConsidered: summaries.length,
    champion: computeChampionPopularity(summaries),
    elementDecksConsidered: decksWithLists.length,
    element: computeElementPopularity(decksWithLists, cardIndex),
  };
}
