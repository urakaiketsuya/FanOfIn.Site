import { useMemo } from "react";
import { decodeCardLines, type DeckCardIndexLine, type DeckPopularityEntry } from "@gatcg/shared";
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
function canonicalSignature(main: DeckCardIndexLine[], material: DeckCardIndexLine[]): string {
  const combined = new Map<string, number>();
  for (const line of [...main, ...material]) {
    combined.set(line.name, (combined.get(line.name) ?? 0) + line.quantity);
  }
  return Array.from(combined.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, qty]) => `${name}:${qty}`)
    .join("|");
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
export function useDeckPopularity(championFilter: string | null, minPlayers: number = MIN_PLAYERS): PopularityResult {
  const rawCardIndexData = useDeckCardIndexData();
  // Guards against a stale IndexedDB copy from before dictionary-encoding shipped — see the same
  // guard in useCardCombination.ts for why.
  const cardIndexData = rawCardIndexData?.cardNames ? rawCardIndexData : undefined;
  const sightingsData = useDeckPopularityIndexData();
  const cardCatalog = useCardCatalog();
  const cardsByName = useMemo(() => new Map(cardCatalog.map((c) => [c.name, c])), [cardCatalog]);

  // Build the expensive all-decks aggregation once per published dataset. Champion and minimum-
  // player filters are applied afterward so changing either control does not decode and regroup
  // the entire 20MB+ card index again.
  const allDecks = useMemo(() => {
    if (!cardIndexData || !sightingsData) return [];

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
    for (const [signature, group] of groups) {
      const sightings = group.deckIds.map((id) => sightingByDeckId.get(id)).filter((s): s is DeckPopularityEntry => !!s);
      const players = new Set(sightings.map((s) => s.player));
      const events = new Set(sightings.map((s) => s.eventId));
      const placements = sightings.map((s) => s.placement).filter((p): p is number => p !== null);
      const lastPlayedDate = sightings.reduce((max, s) => (s.eventDate > max ? s.eventDate : max), "");
      const identity = computeDeckIdentity([...group.main, ...group.material], cardsByName);

      result.push({
        signature,
        championName: group.championName,
        classes: identity.classes,
        elements: identity.elements,
        main: group.main,
        material: group.material,
        deckIds: group.deckIds,
        playerCount: players.size,
        sightingCount: sightings.length,
        eventCount: events.size,
        bestPlacement: placements.length > 0 ? Math.min(...placements) : null,
        avgWinRate: sightings.reduce((sum, s) => sum + s.winRate, 0) / sightings.length,
        avgWeightedScore: sightings.reduce((sum, s) => sum + s.weightedScore, 0) / sightings.length,
        lastPlayedDate,
      });
    }

    return result;
  }, [cardIndexData, sightingsData, cardsByName]);

  const decks = useMemo(
    () =>
      allDecks.filter(
        (deck) => deck.playerCount >= minPlayers && (!championFilter || deck.championName === championFilter),
      ),
    [allDecks, championFilter, minPlayers],
  );

  return { decks, loading: !cardIndexData || !sightingsData };
}
