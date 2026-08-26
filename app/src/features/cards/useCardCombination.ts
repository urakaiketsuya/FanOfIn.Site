import { useMemo } from "react";
import type { DeckCardIndexEntry } from "@gatcg/shared";
import { useDeckCardPresenceIndex } from "./useDeckCardPresenceIndex";

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

function intersectDeckIndices(nameIndices: number[], presenceIndex: Map<number, Set<number>>): Set<number> {
  const sets = nameIndices.map((n) => presenceIndex.get(n) ?? new Set<number>()).sort((a, b) => a.size - b.size);
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

function tallySection(
  lines: DeckCardIndexEntry["main"],
  exclude: Set<number>,
  cardNames: string[],
  counts: Map<number, RawCardCount>,
): void {
  const copiesByNameIndex = new Map<number, number>();
  for (const [nameIndex, quantity] of lines) {
    if (exclude.has(nameIndex)) continue;
    copiesByNameIndex.set(nameIndex, (copiesByNameIndex.get(nameIndex) ?? 0) + quantity);
  }
  for (const [nameIndex, copies] of copiesByNameIndex) {
    const c = counts.get(nameIndex) ?? { name: cardNames[nameIndex], deckCount: 0, totalCopies: 0 };
    c.deckCount += 1;
    c.totalCopies += copies;
    counts.set(nameIndex, c);
  }
}

function topN(counts: Map<number, RawCardCount>, limit: number): RawCardCount[] {
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
  const presence = useDeckCardPresenceIndex();
  const data = presence?.data;
  const nameToIndex = presence?.nameToIndex;
  const presenceIndex = presence?.presenceIndex;

  return useMemo(() => {
    if (!data || !nameToIndex || !presenceIndex || selectedCards.length === 0) {
      return { deckCount: data ? 0 : undefined, deckIds: [], main: [], material: [], sideboard: [] };
    }

    const selectedIndices = selectedCards.map((name) => nameToIndex.get(name) ?? -1);
    const matchingIndices = intersectDeckIndices(selectedIndices, presenceIndex);
    const exclude = new Set(selectedIndices);

    const mainCounts = new Map<number, RawCardCount>();
    const materialCounts = new Map<number, RawCardCount>();
    const sideboardCounts = new Map<number, RawCardCount>();

    for (const idx of matchingIndices) {
      const deck = data.decks[idx];
      tallySection(deck.main, exclude, data.cardNames, mainCounts);
      tallySection(deck.material, exclude, data.cardNames, materialCounts);
      tallySection(deck.sideboard, exclude, data.cardNames, sideboardCounts);
    }

    return {
      deckCount: matchingIndices.size,
      deckIds: Array.from(matchingIndices, (idx) => data.decks[idx].deckId),
      main: topN(mainCounts, MAX_RESULTS_PER_SECTION),
      material: topN(materialCounts, MAX_RESULTS_PER_SECTION),
      sideboard: topN(sideboardCounts, MAX_RESULTS_PER_SECTION),
    };
  }, [data, nameToIndex, presenceIndex, selectedCards]);
}
