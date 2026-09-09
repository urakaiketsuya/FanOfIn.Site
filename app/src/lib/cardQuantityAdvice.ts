import type { Card, CardQuantityBucket } from "@gatcg/shared";

/** A quantity's own bucket must have at least this many decks behind it before its win rate is trusted in a comparison at all — below this, even the widened Wilson interval is too data-starved to mean anything. Far lower than the old flat 30-deck floor because the Wilson interval below already scales its own rigor with sample size; this is just a sanity floor under it. */
export const MIN_QUANTITY_SAMPLE = 8;
/** Confidence level (two-sided) used for each bucket's win-rate interval. Comparing two 95% intervals for non-overlap is itself more conservative than a single two-proportion test at the same confidence level — a deliberate margin of safety, since this runs once per card across the whole catalog. */
const CONFIDENCE_Z = 1.96;

export function legalMaxCopies(card: Card | undefined): number {
  return card?.legality?.STANDARD?.limit ?? 4;
}

export interface QuantityAdvice {
  quantity: number;
  optimizedFrom: number;
  sampleSize: number;
  adjustedWinRate: number;
}

interface WilsonInterval {
  lower: number;
  upper: number;
}

/**
 * Wilson score interval for a binomial proportion — unlike the naive `p ± z*sqrt(p(1-p)/n)` interval,
 * it stays well-behaved (bounded, non-degenerate) at small n and at p near 0 or 1, which a flat
 * deck-count/margin heuristic has no way to express. Confidence widens automatically as `n` shrinks,
 * so a 1pp gap on 30 decks and a 1pp gap on 3000 decks are no longer treated as equally meaningful.
 */
function wilsonInterval(p: number, n: number, z: number): WilsonInterval {
  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denominator;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denominator;
  return { lower: center - margin, upper: center + margin };
}

/**
 * Compares `reference` copies (the population's modal count in the Guided Deck Builder, or a
 * decklist's own actual count elsewhere) against a card's global win-rate-by-quantity data
 * (`data/analysis/card-quantity-stats.json`) and returns a better-supported quantity within the
 * legal max — or null when `reference` is already the best-supported choice, or the gap isn't
 * statistically real. "Real" is judged by building a 95% confidence interval (Wilson score, on each
 * bucket's raw, unshrunk win rate) around both the reference quantity and every candidate, and only
 * recommending a candidate whose interval sits entirely above the reference's — i.e. the two
 * quantities' win rates don't just look different, they're unlikely to be a coincidence of sample
 * noise. This replaces a flat "≥30 decks, ≥1pp gap" rule, which treated every gap the same
 * regardless of how many decks actually backed it. Shared by `useSuggestedBuild.ts` (the builder's
 * own assembly) and `DeckTuningEvidence.tsx` (an existing decklist's own quantities) so the sample
 * floor and confidence level stay defined once.
 *
 * Note: this only tests "is quantity real" — it does not, and cannot from this data alone, separate
 * a genuine quantity effect from archetype-selection confounding (decks that run 4x might just be a
 * different, generally-stronger archetype than decks that run 2x). See docs/CALCULATIONS.md.
 */
export function pickBetterQuantity(reference: number, buckets: CardQuantityBucket[] | undefined, max: number): QuantityAdvice | null {
  if (!buckets) return null;
  const eligible = buckets.filter((b) => b.deckCount >= MIN_QUANTITY_SAMPLE && b.quantity >= 1 && b.quantity <= max);

  const referenceBucket = eligible.find((b) => b.quantity === reference);
  if (!referenceBucket) return null;
  const referenceInterval = wilsonInterval(referenceBucket.avgWinRate, referenceBucket.deckCount, CONFIDENCE_Z);

  let best: CardQuantityBucket | null = null;
  for (const bucket of eligible) {
    if (bucket.quantity === reference) continue;
    const interval = wilsonInterval(bucket.avgWinRate, bucket.deckCount, CONFIDENCE_Z);
    if (interval.lower <= referenceInterval.upper) continue; // intervals overlap — not a significant gap
    if (!best || bucket.avgWinRate > best.avgWinRate) best = bucket;
  }
  if (!best) return null;

  return { quantity: best.quantity, optimizedFrom: reference, sampleSize: best.deckCount, adjustedWinRate: best.adjustedWinRate };
}

/** Shrinkage prior for `computeLocalQuantityBuckets` — mirrors `pipeline/src/config.ts`'s default (`winRateShrinkagePriorWeight`) and the same literal `useChampionCardImpact.ts` already keeps in sync by hand for the same reason (client-side code can't read `process.env`). */
const LOCAL_PRIOR_WEIGHT = 10;

export interface QuantitySample {
  /** Card name -> total copies across main + material for one deck — sideboard excluded, same "deck identity" convention `computeCardQuantityStats` itself uses. */
  copiesByName: Map<string, number>;
  winRate: number;
}

/**
 * Builds per-(card, quantity) win-rate buckets from a caller-chosen set of decks — the same shape
 * `computeCardQuantityStats` publishes meta-wide (`CardQuantityBucket`), computed on the fly over a
 * narrower population instead. Feeds `pickBetterQuantityScoped`'s `localBuckets` argument: a named-
 * build cluster's own decks (`DeckTuningEvidence.tsx`, via `useClusterCardQuantityStats`) or the
 * Guided Deck Builder's own already-filtered ranking population (`useSuggestedBuild.ts`). Shrinks
 * each bucket toward the *population's own* average win rate, not a flat 50% — same reasoning
 * `cardImpact.ts`/`useChampionCardImpact.ts` document for why a flat prior is wrong once the
 * population is no longer the whole tournament field.
 */
export function computeLocalQuantityBuckets(samples: QuantitySample[]): Map<string, CardQuantityBucket[]> {
  const result = new Map<string, CardQuantityBucket[]>();
  if (samples.length === 0) return result;

  const accum = new Map<string, Map<number, { deckCount: number; winRateSum: number; winRateN: number }>>();
  let baselineSum = 0;
  for (const { copiesByName, winRate } of samples) {
    baselineSum += winRate;
    for (const [name, copies] of copiesByName) {
      let byQuantity = accum.get(name);
      if (!byQuantity) {
        byQuantity = new Map();
        accum.set(name, byQuantity);
      }
      const a = byQuantity.get(copies) ?? { deckCount: 0, winRateSum: 0, winRateN: 0 };
      a.deckCount += 1;
      a.winRateSum += winRate;
      a.winRateN += 1;
      byQuantity.set(copies, a);
    }
  }
  const baseline = baselineSum / samples.length;

  for (const [name, byQuantity] of accum) {
    const quantities = Array.from(byQuantity.entries())
      .map(([quantity, a]) => ({
        quantity,
        deckCount: a.deckCount,
        avgWinRate: a.winRateSum / a.winRateN,
        adjustedWinRate: (a.winRateSum + LOCAL_PRIOR_WEIGHT * baseline) / (a.winRateN + LOCAL_PRIOR_WEIGHT),
      }))
      .sort((a, b) => a.quantity - b.quantity);
    // Same "nothing to compare against" reasoning as computeCardQuantityStats.
    if (quantities.length >= 2) result.set(name, quantities);
  }
  return result;
}

export interface ScopedQuantityAdvice extends QuantityAdvice {
  scope: "local" | "global";
}

/**
 * Tries a narrower, less-confounded bucket set (`localBuckets`) before falling back to a card's
 * flat global buckets. This is what actually addresses the confounding gap the significance test
 * above can't on its own: `computeCardQuantityStats` pools every deck meta-wide per (card,
 * quantity), so a card that "wins more at 4x" globally might just be run at 4x disproportionately
 * by an already-stronger archetype — not because 4 copies is mechanically better than 2. Comparing
 * within one narrower population (a named-build cluster, or the builder's own already-filtered
 * ranking population) removes most of that archetype-selection confound, at the cost of a much
 * smaller sample — hence trying it first and falling back to global (never worse than the
 * global-only test) rather than using it exclusively. See docs/CALCULATIONS.md.
 */
export function pickBetterQuantityScoped(
  reference: number,
  localBuckets: CardQuantityBucket[] | undefined,
  globalBuckets: CardQuantityBucket[] | undefined,
  max: number,
): ScopedQuantityAdvice | null {
  const local = pickBetterQuantity(reference, localBuckets, max);
  if (local) return { ...local, scope: "local" };
  const global = pickBetterQuantity(reference, globalBuckets, max);
  return global ? { ...global, scope: "global" } : null;
}
