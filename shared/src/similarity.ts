/**
 * Weighted Jaccard (Ruzicka similarity) over each side's card-copy multiset. Iterates the smaller
 * map and does direct lookups against the larger one, rather than building a `new Set([...a, ...b])`
 * union every call — that allocation was pure overhead paid millions of times across a champion
 * group in the pipeline's own pairwise-similarity pass, and this does the identical math without it.
 *
 * Used by both `pipeline` (deck-to-deck similarity, archetype clustering) and `app` (Guided Deck
 * Builder nearest-deck/suggestion scoring, Archetypes "Variants" tab) — previously duplicated by
 * hand between `pipeline/src/analysis/similarity.ts` and `app/src/lib/decodedDecks.ts` with a
 * "keep in sync by hand" comment; moved here so there's exactly one copy.
 */
export function weightedJaccard(a: Map<string, number>, b: Map<string, number>): number {
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
  // union of a multiset max(a,b) summed over all keys == aTotal + bTotal - intersection (each
  // shared key's min gets double-counted once in aTotal and once in bTotal, so subtract it back out once).
  const union = aTotal + bTotal - intersection;
  return union === 0 ? 0 : intersection / union;
}
