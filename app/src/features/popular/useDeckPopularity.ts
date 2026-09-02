import { useMemo } from "react";
import { decodeCardLines, type Card, type DeckCardIndexLine, type DeckPopularityEntry } from "@gatcg/shared";
import { useDeckCardIndexData } from "../archetypes/data";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { useCardCatalog } from "../cards/useCardCatalog";
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
  /** Average of each instance's Phase-18 weightedScore (placement percentile x event tier) — how well this exact list tends to perform, not just how often it's played. */
  avgWeightedScore: number;
  lastPlayedDate: string;
}

/** Popular Decks' own default — "netdecked more than once" bar. Callers that want every distinct decklist (e.g. the deck-page hash lookup, or the all-decks search page) pass `minPlayers: 1` instead. */
const MIN_PLAYERS = 2;

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
 * sightings that share its signature — the same aggregation `useDeckPopularity`'s full-universe
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
  };
}

interface PopularityResult {
  decks: PopularDeck[];
  loading: boolean;
}

/**
 * Groups every public decklist by its exact main+material card list — distinct from Champions
 * (character-level) and Archetypes (class+element-level), this surfaces specific builds multiple
 * different players independently converged on (or netdecked). Computed client-side from the
 * already-published deck-card-index + deck-popularity-index datasets, same pattern as
 * useCardCombination. Uses the lean popularity index (not the full deck-sightings.json, 40MB+)
 * since this only needs championName/winRate/event-context, not every sighting's full detail —
 * a real mobile-crash cause when this and deck-card-index.json were both required in full just to
 * render Popular Decks / All Decks (see git history around the fix).
 */
export function useDeckPopularity(
  championFilter: string | null,
  minPlayers: number = MIN_PLAYERS,
  /** Skips the expensive decode-and-group-all-~57k-decks pass entirely when the caller doesn't
   * need the full universe this render — e.g. `DeckDetail`'s `deckHash` fast path only falls back
   * to this for the rare deck with no precomputed hash, or when its Similar Decks tab is open. */
  enabled = true,
): PopularityResult {
  const rawCardIndexData = useDeckCardIndexData();
  // Guards against a stale IndexedDB copy from before dictionary-encoding shipped — see the same
  // guard in useCardCombination.ts for why.
  const cardIndexData = enabled && rawCardIndexData?.cardNames ? rawCardIndexData : undefined;
  const sightingsData = useDeckPopularityIndexData();
  const cardCatalog = useCardCatalog();
  const cardsByName = useMemo(() => new Map(cardCatalog.map((c) => [c.name, c])), [cardCatalog]);

  // Build the expensive all-decks aggregation once per published dataset. Champion and minimum-
  // player filters are applied afterward so changing either control does not decode and regroup
  // the entire 20MB+ card index again.
  const allDecks = useMemo(() => {
    if (!enabled || !cardIndexData || !sightingsData) return [];

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
  }, [enabled, cardIndexData, sightingsData, cardsByName]);

  const decks = useMemo(
    () =>
      allDecks.filter(
        (deck) => deck.playerCount >= minPlayers && (!championFilter || deck.championName === championFilter),
      ),
    [allDecks, championFilter, minPlayers],
  );

  return { decks, loading: enabled && (!cardIndexData || !sightingsData) };
}
