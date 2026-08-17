import { useMemo } from "react";
import type { DeckCardIndexEntry, DeckCardIndexLine } from "@gatcg/shared";
import { useDeckCardIndexData } from "../archetypes/data";

const MAX_RESULTS_PER_SECTION = 20;

export interface RawCardCount {
  name: string;
  deckCount: number;
  totalCopies: number;
}

export interface CardCombinationResult {
  /** Decks containing every selected card, in any section. Undefined while the (large) dataset is still loading. */
  deckCount: number | undefined;
  /** `deckId`s of the matching decks, joinable against DeckSightingsData/HipsterData for event/player context. */
  deckIds: string[];
  main: RawCardCount[];
  material: RawCardCount[];
  sideboard: RawCardCount[];
}

/** Every deck's card names (any section), for fast "does this deck contain X" membership tests. */
function buildPresenceIndex(decks: DeckCardIndexEntry[]): Map<string, Set<number>> {
  const index = new Map<string, Set<number>>();
  decks.forEach((deck, i) => {
    const seen = new Set<string>();
    for (const line of [...deck.main, ...deck.material, ...deck.sideboard]) {
      if (seen.has(line.name)) continue;
      seen.add(line.name);
      let bucket = index.get(line.name);
      if (!bucket) {
        bucket = new Set<number>();
        index.set(line.name, bucket);
      }
      bucket.add(i);
    }
  });
  return index;
}

function intersectDeckIndices(names: string[], presenceIndex: Map<string, Set<number>>): Set<number> {
  const sets = names.map((n) => presenceIndex.get(n) ?? new Set<number>()).sort((a, b) => a.size - b.size);
  if (sets.length === 0) return new Set();
  let result = sets[0];
  for (let i = 1; i < sets.length; i++) {
    const next = sets[i];
    const narrowed = new Set<number>();
    for (const idx of result) if (next.has(idx)) narrowed.add(idx);
    result = narrowed;
  }
  return result;
}

function tallySection(lines: DeckCardIndexLine[], exclude: Set<string>, counts: Map<string, RawCardCount>): void {
  const copiesByName = new Map<string, number>();
  for (const line of lines) {
    if (exclude.has(line.name)) continue;
    copiesByName.set(line.name, (copiesByName.get(line.name) ?? 0) + line.quantity);
  }
  for (const [name, copies] of copiesByName) {
    const c = counts.get(name) ?? { name, deckCount: 0, totalCopies: 0 };
    c.deckCount += 1;
    c.totalCopies += copies;
    counts.set(name, c);
  }
}

function topN(counts: Map<string, RawCardCount>, limit: number): RawCardCount[] {
  return Array.from(counts.values())
    .sort((a, b) => b.deckCount - a.deckCount)
    .slice(0, limit);
}

/**
 * Given a set of chosen card names, finds every deck containing all of them (in any section) and
 * ranks the other cards played alongside — the multi-card generalization of "used with" browsing.
 * All computed client-side against the published deck-card-index dataset, so arbitrary
 * combinations work without a server round-trip.
 */
export function useCardCombination(selectedCards: string[]): CardCombinationResult {
  const data = useDeckCardIndexData();

  const presenceIndex = useMemo(() => {
    if (!data) return null;
    return buildPresenceIndex(data.decks);
  }, [data]);

  return useMemo(() => {
    if (!data || !presenceIndex || selectedCards.length === 0) {
      return { deckCount: data ? 0 : undefined, deckIds: [], main: [], material: [], sideboard: [] };
    }

    const matchingIndices = intersectDeckIndices(selectedCards, presenceIndex);
    const exclude = new Set(selectedCards);

    const mainCounts = new Map<string, RawCardCount>();
    const materialCounts = new Map<string, RawCardCount>();
    const sideboardCounts = new Map<string, RawCardCount>();

    for (const idx of matchingIndices) {
      const deck = data.decks[idx];
      tallySection(deck.main, exclude, mainCounts);
      tallySection(deck.material, exclude, materialCounts);
      tallySection(deck.sideboard, exclude, sideboardCounts);
    }

    return {
      deckCount: matchingIndices.size,
      deckIds: Array.from(matchingIndices, (idx) => data.decks[idx].deckId),
      main: topN(mainCounts, MAX_RESULTS_PER_SECTION),
      material: topN(materialCounts, MAX_RESULTS_PER_SECTION),
      sideboard: topN(sideboardCounts, MAX_RESULTS_PER_SECTION),
    };
  }, [data, presenceIndex, selectedCards]);
}
