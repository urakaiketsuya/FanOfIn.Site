import { useMemo } from "react";
import type { DeckCardIndexLine, DeckSighting } from "@gatcg/shared";
import { useDeckCardIndexData } from "../archetypes/data";
import { useDeckSightingsData } from "../topdecks/data";
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
 * already-published deck-card-index + deck-sightings datasets, same pattern as useCardCombination.
 */
export function useDeckPopularity(championFilter: string | null): PopularityResult {
  const cardIndexData = useDeckCardIndexData();
  const sightingsData = useDeckSightingsData();
  const cardCatalog = useCardCatalog();
  const cardsByName = useMemo(() => new Map(cardCatalog.map((c) => [c.name, c])), [cardCatalog]);

  const decks = useMemo(() => {
    if (!cardIndexData || !sightingsData) return [];

    const sightingByDeckId = new Map<string, DeckSighting>(sightingsData.sightings.map((s) => [s.deckId, s]));

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
      if (championFilter && sighting?.championName !== championFilter) continue;

      const signature = canonicalSignature(entry.main, entry.material);
      let group = groups.get(signature);
      if (!group) {
        group = { main: entry.main, material: entry.material, championName: sighting?.championName ?? null, deckIds: [] };
        groups.set(signature, group);
      }
      group.deckIds.push(entry.deckId);
    }

    const result: PopularDeck[] = [];
    for (const [signature, group] of groups) {
      const sightings = group.deckIds.map((id) => sightingByDeckId.get(id)).filter((s): s is DeckSighting => !!s);
      const players = new Set(sightings.map((s) => s.player));
      if (players.size < MIN_PLAYERS) continue;

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
  }, [cardIndexData, sightingsData, championFilter, cardsByName]);

  return { decks, loading: !cardIndexData || !sightingsData };
}
