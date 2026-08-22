import { useMemo } from "react";
import type { DecodedDeck } from "./decodedDecks";

const MAX_RESULTS = 8;

export interface NearestDeck extends DecodedDeck {
  similarity: number;
}

/**
 * Weighted Jaccard (Ruzicka similarity) over each side's card-copy multiset — verbatim port of
 * `pipeline/src/analysis/similarity.ts`'s function of the same name (plain TS, no dependencies,
 * so this is a straight copy; keep the two in sync by hand if the formula ever changes). Iterates
 * the smaller map and does direct lookups against the larger one, same reasoning as the pipeline
 * version: avoids allocating a union `Set` on every one of the ~57k comparisons this hook does.
 */
function weightedJaccard(a: Map<string, number>, b: Map<string, number>): number {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let intersection = 0;
  for (const [key, smallValue] of small) {
    const largeValue = large.get(key);
    if (largeValue === undefined) continue;
    intersection += Math.min(smallValue, largeValue);
  }
  let aTotal = 0;
  for (const v of a.values()) aTotal += v;
  let bTotal = 0;
  for (const v of b.values()) bTotal += v;
  const union = aTotal + bTotal - intersection;
  return union === 0 ? 0 : intersection / union;
}

function combinedCardCounts(deck: DecodedDeck): Map<string, number> {
  const combined = new Map(deck.main);
  for (const [name, qty] of deck.material) combined.set(name, (combined.get(name) ?? 0) + qty);
  return combined;
}

/**
 * The most similar real decks (main+material, sideboard excluded per this codebase's "deck
 * identity" convention) to whatever's currently locked in, across every Champion — for when a
 * Champion+Spirit combo has too little data for population-level ranking to mean anything, but a
 * few real decks still look close to what the viewer is building. Not routed through
 * `useSuggestedBuild`'s with/without-lift ranking at all (real-data-verified: a ~10-50-deck
 * shortlist would fail that ranking's own sample thresholds almost everywhere) — surfaced as
 * browsable/importable examples instead.
 *
 * Cost: the expensive part (combining every deck's main+material into one multiset) is memoized on
 * `decks` alone, not on `lockedCards` — so it only re-runs when the underlying dataset changes, not
 * on every lock toggle. Scoring against `lockedCards` is then ~57k cheap Map-lookup comparisons,
 * verified against the real published dataset size to be comfortably sub-frame (see
 * docs/CALCULATIONS.md's Guided Deck Builder section).
 */
export function useNearestDecks(decks: DecodedDeck[], lockedCards: Map<string, number>): NearestDeck[] {
  const combinedByDeck = useMemo(() => decks.map((deck) => ({ deck, combined: combinedCardCounts(deck) })), [decks]);

  return useMemo(() => {
    if (lockedCards.size === 0) return [];
    const scored: NearestDeck[] = [];
    for (const { deck, combined } of combinedByDeck) {
      const similarity = weightedJaccard(lockedCards, combined);
      if (similarity > 0) scored.push({ ...deck, similarity });
    }
    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, MAX_RESULTS);
  }, [combinedByDeck, lockedCards]);
}
