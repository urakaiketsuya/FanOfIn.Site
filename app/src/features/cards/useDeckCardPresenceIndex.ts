import { useMemo } from "react";
import type { DeckCardIndexData, DeckCardIndexEntry } from "@gatcg/shared";
import { useDeckCardIndexData } from "../archetypes/data";

export interface DeckCardPresenceIndex {
  data: DeckCardIndexData;
  nameToIndex: Map<string, number>;
  /** Card-name index -> positional indices into `data.decks` of every deck containing that card (any section). */
  presenceIndex: Map<number, Set<number>>;
}

/** Every deck's card-name indices (any section), for fast "does this deck contain X" membership tests — works directly against the dictionary-encoded tuples, no need to decode names first. */
function buildPresenceIndex(decks: DeckCardIndexEntry[]): Map<number, Set<number>> {
  const index = new Map<number, Set<number>>();
  decks.forEach((deck, i) => {
    const seen = new Set<number>();
    for (const [nameIndex] of [...deck.main, ...deck.material, ...deck.sideboard]) {
      if (seen.has(nameIndex)) continue;
      seen.add(nameIndex);
      let bucket = index.get(nameIndex);
      if (!bucket) {
        bucket = new Set<number>();
        index.set(nameIndex, bucket);
      }
      bucket.add(i);
    }
  });
  return index;
}

/**
 * Shared derived index over the published deck-card-index dataset, so any consumer that needs
 * "which decks contain card X" can look it up directly instead of decoding and string-matching
 * every one of the ~57k decks (see useCardSynergy's original implementation, before this was
 * extracted from useCardCombination.ts where the same structure was already being built).
 */
export function useDeckCardPresenceIndex(): DeckCardPresenceIndex | undefined {
  const rawData = useDeckCardIndexData();
  // `cardNames` guards against a stale IndexedDB copy from before dictionary-encoding shipped —
  // during the rollout window, a returning visitor's cache briefly holds the old `{name,quantity}`
  // shape until usePublishedData's generatedAt check catches up and refetches. Treating it the
  // same as "not loaded yet" avoids a crash in that window instead of assuming the new shape.
  const data = rawData?.cardNames ? rawData : undefined;

  const nameToIndex = useMemo(() => {
    if (!data) return null;
    return new Map(data.cardNames.map((name, i) => [name, i]));
  }, [data]);

  const presenceIndex = useMemo(() => {
    if (!data) return null;
    return buildPresenceIndex(data.decks);
  }, [data]);

  return useMemo(() => {
    if (!data || !nameToIndex || !presenceIndex) return undefined;
    return { data, nameToIndex, presenceIndex };
  }, [data, nameToIndex, presenceIndex]);
}
