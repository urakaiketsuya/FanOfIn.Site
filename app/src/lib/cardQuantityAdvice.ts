import type { Card, CardQuantityBucket } from "@gatcg/shared";

/** A quantity's own bucket must have at least this many decks behind it globally before its win rate is trusted to outrank another quantity — a card-level property (e.g. "Dungeon Guide wins more at 4x than 2x"), not scoped to any one Champion. */
export const MIN_GLOBAL_QUANTITY_SAMPLE = 30;
/** The best eligible bucket must beat the reference quantity's own win rate by at least this much before it's worth disclosing as an override — guards against reordering two buckets that are really a statistical tie. */
export const QUANTITY_OPTIMIZATION_MARGIN = 0.01;

export function legalMaxCopies(card: Card | undefined): number {
  return card?.legality?.STANDARD?.limit ?? 4;
}

export interface QuantityAdvice {
  quantity: number;
  optimizedFrom: number;
  sampleSize: number;
  adjustedWinRate: number;
}

/**
 * Compares `reference` copies (the population's modal count in the Guided Deck Builder, or a
 * decklist's own actual count elsewhere) against a card's global win-rate-by-quantity data
 * (`data/analysis/card-quantity-stats.json`) and returns a better-supported quantity within the
 * legal max — or null when `reference` is already the best-supported choice, or there isn't
 * enough global data to say. Shared by `useSuggestedBuild.ts` (the builder's own assembly) and
 * `DeckTuningEvidence.tsx` (an existing decklist's own quantities) so the sample-size floor and
 * margin stay defined once.
 */
export function pickBetterQuantity(reference: number, buckets: CardQuantityBucket[] | undefined, max: number): QuantityAdvice | null {
  if (!buckets) return null;
  const eligible = buckets.filter((b) => b.deckCount >= MIN_GLOBAL_QUANTITY_SAMPLE && b.quantity >= 1 && b.quantity <= max);
  if (eligible.length === 0) return null;

  const best = eligible.reduce((a, b) => (b.adjustedWinRate > a.adjustedWinRate ? b : a));
  if (best.quantity === reference) return null;

  const referenceWinRate = eligible.find((b) => b.quantity === reference)?.adjustedWinRate ?? null;
  if (referenceWinRate !== null && best.adjustedWinRate - referenceWinRate < QUANTITY_OPTIMIZATION_MARGIN) return null;

  return { quantity: best.quantity, optimizedFrom: reference, sampleSize: best.deckCount, adjustedWinRate: best.adjustedWinRate };
}
