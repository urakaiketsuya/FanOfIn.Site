export interface ShrunkWinRate {
  avgWinRate: number;
  adjustedWinRate: number;
}

/**
 * Bayesian-shrinks a raw win rate toward a flat 50% baseline, proportional to sample size — the
 * standard "small samples shouldn't look as confident as large ones" adjustment used everywhere a
 * per-item win rate is published in this codebase (cards, keywords, copy-count buckets, deck-
 * composition buckets). `prior` is the shrinkage weight (how many phantom 50%-win-rate
 * observations to blend in) — pipeline callers pass `config.winRateShrinkagePriorWeight`;
 * client-side callers can't read that (pipeline config reads `process.env`, which doesn't exist in
 * the browser) and mirror its literal default value by hand instead, same as `useChampionCardImpact.ts`
 * already does for `computeCardImpactEntries`'s own prior weight.
 */
export function shrinkWinRate(winRateSum: number, winRateN: number, prior: number): ShrunkWinRate {
  return {
    avgWinRate: winRateN > 0 ? winRateSum / winRateN : 0,
    adjustedWinRate: (winRateSum + prior * 0.5) / (winRateN + prior),
  };
}
