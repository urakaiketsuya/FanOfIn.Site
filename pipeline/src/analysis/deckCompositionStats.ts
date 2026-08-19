import type { CompositionWinRateStat } from "@gatcg/shared";
import type { OmnidexEventBundle } from "../omnidex/cache.js";
import type { CardSignature } from "../cards/catalog.js";
import { config } from "../config.js";

interface BucketAccum {
  deckCount: number;
  winRateSum: number;
  winRateN: number;
}

const BUCKET_WIDTH = 10; // percentage points

function bucketLabel(pct: number): string {
  const lower = Math.min(90, Math.floor(pct / BUCKET_WIDTH) * BUCKET_WIDTH);
  return `${lower}-${lower + BUCKET_WIDTH}%`;
}

/**
 * For each main-deck card type (Ally, Action, Attack, Item, ...), buckets decks by what
 * percentage of their main deck (by copies) that type makes up, then averages win rate per
 * bucket — answers "does running more Allies, as a share of the deck, actually correlate with
 * winning more," the deck-composition sibling of computeCardQuantityStats' per-card question.
 * Scoped to the main deck only — "composition ratio" is a main-deck gameplan question; the
 * material deck is a different, mostly-fixed-count category (Champion prints, relics) that would
 * dilute the signal, and sideboard is situational tech excluded from "deck identity" everywhere
 * else in this codebase.
 */
export function computeCompositionWinRates(bundles: OmnidexEventBundle[], cardIndex: Map<string, CardSignature>): CompositionWinRateStat[] {
  const accum = new Map<string, Map<string, BucketAccum>>(); // type -> bucket label -> accum

  for (const bundle of bundles) {
    if ("error" in bundle.decklists) continue;

    const winByPlayer = new Map<number, number>();
    if (!("error" in bundle.standings)) {
      for (const s of bundle.standings.standings) {
        if (s.id === undefined) continue;
        const total = s.statsWins + s.statsLosses + s.statsTies;
        if (total > 0) winByPlayer.set(s.id, (s.statsWins + s.statsTies * 0.5) / total);
      }
    }

    for (const entry of bundle.decklists) {
      const winRate = winByPlayer.get(entry.player);
      if (winRate === undefined) continue; // purpose-built for win-rate correlation — no signal without a known outcome

      const typeCounts = new Map<string, number>();
      let totalCopies = 0;
      for (const line of entry.decklist.main) {
        const card = cardIndex.get(line.card);
        if (!card) continue;
        totalCopies += line.quantity;
        for (const t of card.types) typeCounts.set(t, (typeCounts.get(t) ?? 0) + line.quantity);
      }
      if (totalCopies === 0) continue;

      for (const [type, copies] of typeCounts) {
        const bucket = bucketLabel((copies / totalCopies) * 100);
        let byBucket = accum.get(type);
        if (!byBucket) {
          byBucket = new Map<string, BucketAccum>();
          accum.set(type, byBucket);
        }
        const a = byBucket.get(bucket) ?? { deckCount: 0, winRateSum: 0, winRateN: 0 };
        a.deckCount += 1;
        a.winRateSum += winRate;
        a.winRateN += 1;
        byBucket.set(bucket, a);
      }
    }
  }

  const prior = config.winRateShrinkagePriorWeight;
  const result: CompositionWinRateStat[] = [];
  for (const [type, byBucket] of accum) {
    for (const [bucket, a] of byBucket) {
      result.push({
        type,
        bucket,
        deckCount: a.deckCount,
        avgWinRate: a.winRateSum / a.winRateN,
        adjustedWinRate: (a.winRateSum + prior * 0.5) / (a.winRateN + prior),
      });
    }
  }

  return result.sort((a, b) => (a.type === b.type ? a.bucket.localeCompare(b.bucket) : a.type.localeCompare(b.type)));
}
