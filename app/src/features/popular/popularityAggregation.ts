import { decodeCardLines, type Card, type DeckCardIndexLine, type DeckPopularityEntry, type DeckCardIndexData, type DeckPopularityIndexData } from "@gatcg/shared";
import { computeDeckIdentity } from "../../lib/deckIdentity";
export interface PopularDeck {
  signature: string;
  championName: string | null;
  classes: string[];
  elements: string[];
  main: DeckCardIndexLine[];
  material: DeckCardIndexLine[];
  deckIds: string[];
  playerCount: number;
  sightingCount: number;
  eventCount: number;
  bestPlacement: number | null;
  avgWinRate: number;
  /** Average of each instance's Phase-18 weightedScore (placement percentile x event tier) – how well this exact list tends to perform, not just how often it's played. */
  avgWeightedScore: number;
  lastPlayedDate: string;
  lastEventId: number | null;
}

/** Same identity convention used everywhere else (cardStats, decklists, deckSightings): main+material define what a deck "is"; sideboard is situational and excluded from the grouping key. */
export function canonicalSignature(main: DeckCardIndexLine[], material: DeckCardIndexLine[]): string {
  const combined = new Map<string, number>();
  for (const line of [...main, ...material]) {
    combined.set(line.name, (combined.get(line.name) ?? 0) + line.quantity);
  }
  return Array.from(combined.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, qty]) => `${name}:${qty}`)
    .join("|");
}

/**
 * Assembles one `PopularDeck` from its already-decoded card lines and the popularity-index
 * sightings that share its signature – the same aggregation `useDeckPopularity`'s full-universe
 * grouping loop does per group below, factored out so a caller that already knows which sightings
 * belong together (e.g. `DeckDetail`'s `deckHash` fast path, which resolves one specific deck
 * without decoding and grouping all ~57k) doesn't have to duplicate it.
 */
export function buildPopularDeck(
  main: DeckCardIndexLine[],
  material: DeckCardIndexLine[],
  championName: string | null,
  deckIds: string[],
  sightings: DeckPopularityEntry[],
  cardsByName: Map<string, Card>,
): PopularDeck {
  const players = new Set(sightings.map((s) => s.player));
  const events = new Set(sightings.map((s) => s.eventId));
  const placements = sightings.map((s) => s.placement).filter((p): p is number => p !== null);
  const lastPlayedDate = sightings.reduce((max, s) => (s.eventDate > max ? s.eventDate : max), "");
  const latestSighting = sightings.reduce<(typeof sightings)[number] | null>(
    (latest, sighting) => (!latest || sighting.eventDate > latest.eventDate ? sighting : latest),
    null,
  );
  const identity = computeDeckIdentity([...main, ...material], cardsByName);
  return {
    signature: canonicalSignature(main, material),
    championName,
    classes: identity.classes,
    elements: identity.elements,
    main,
    material,
    deckIds,
    playerCount: players.size,
    sightingCount: sightings.length,
    eventCount: events.size,
    bestPlacement: placements.length > 0 ? Math.min(...placements) : null,
    avgWinRate: sightings.reduce((sum, s) => sum + s.winRate, 0) / sightings.length,
    avgWeightedScore: sightings.reduce((sum, s) => sum + s.weightedScore, 0) / sightings.length,
    lastPlayedDate,
    lastEventId: latestSighting?.eventId ?? null,
  };
}

export function aggregatePopularDecks(cardIndexData: DeckCardIndexData, sightingsData: DeckPopularityIndexData, cardsByName: Map<string, Card>): PopularDeck[] {
  const sightingByDeckId = new Map<string, DeckPopularityEntry>(sightingsData.entries.map((s) => [s.deckId, s]));

  interface Group {
    main: DeckCardIndexLine[];
    material: DeckCardIndexLine[];
    championName: string | null;
    deckIds: string[];
  }
  const groups = new Map<string, Group>();

  for (const entry of cardIndexData.decks) {
    if (entry.main.length === 0 && entry.material.length === 0) continue;
    const sighting = sightingByDeckId.get(entry.deckId);
    const main = decodeCardLines(entry.main, cardIndexData.cardNames);
    const material = decodeCardLines(entry.material, cardIndexData.cardNames);
    const signature = canonicalSignature(main, material);
    let group = groups.get(signature);
    if (!group) {
      group = { main, material, championName: sighting?.championName ?? null, deckIds: [] };
      groups.set(signature, group);
    }
    group.deckIds.push(entry.deckId);
  }

  const result: PopularDeck[] = [];
  for (const group of groups.values()) {
    const sightings = group.deckIds.map((id) => sightingByDeckId.get(id)).filter((s): s is DeckPopularityEntry => !!s);
    result.push(buildPopularDeck(group.main, group.material, group.championName, group.deckIds, sightings, cardsByName));
  }

  return result;
}

// Retain only the latest aggregate, not its large decoded source datasets. Published
// generations survive IndexedDB rereads and route remounts, unlike object identity.
let cached: { cardGeneration: string; sightingGeneration: string; catalogIdentity: string; decks: PopularDeck[] } | undefined;

export function getPopularDecks(
  cardIndexData: DeckCardIndexData,
  sightingsData: DeckPopularityIndexData,
  catalog: Card[],
): PopularDeck[] {
  // Only these catalog fields affect computeDeckIdentity. Include their full values
  // so classification edits and a progressively loaded catalog invalidate the cache.
  const catalogIdentity = JSON.stringify(catalog.map(({ name, classes, elements }) => [name, classes, elements]));
  if (cached && cached.cardGeneration === cardIndexData.generatedAt &&
      cached.sightingGeneration === sightingsData.generatedAt && cached.catalogIdentity === catalogIdentity) {
    return cached.decks;
  }
  const decks = aggregatePopularDecks(cardIndexData, sightingsData, new Map(catalog.map(card => [card.name, card])));
  cached = { cardGeneration: cardIndexData.generatedAt, sightingGeneration: sightingsData.generatedAt, catalogIdentity, decks };
  return decks;
}
