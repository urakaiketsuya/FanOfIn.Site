import { useMemo } from "react";
import { decodeCardLines, type CardQuantityBucket } from "@gatcg/shared";
import { computeLocalQuantityBuckets, type QuantitySample } from "../../lib/cardQuantityAdvice";
import { useDeckCardIndexData } from "../archetypes/data";
import { useDeckPopularityIndexData } from "../topdecks/data";

/**
 * Card quantity-vs-win-rate buckets scoped to one named-build cluster's own decks, computed
 * client-side from already-published per-deck data — mirrors `useChampionCardImpact.ts`'s shape
 * (same two datasets, same lean-index-first filtering) but keyed by (card, copy count) instead of
 * with/without, and scoped to one specific cluster (via `CardImpactData.deckClusterIndex`) instead
 * of a whole Champion. Exists to give `pickBetterQuantityScoped` a narrower, less-confounded
 * comparison than the flat global `card-quantity-stats.json` dataset (pooled across every
 * archetype meta-wide) can offer on its own — see docs/CALCULATIONS.md.
 */
export function useClusterCardQuantityStats(
  clusterId: string | null,
  deckClusterIndex: Record<string, string> | undefined,
): Map<string, CardQuantityBucket[]> | undefined {
  const rawCardIndexData = useDeckCardIndexData();
  // Guards against a stale IndexedDB copy from before dictionary-encoding shipped — see the same
  // guard in useChampionCardImpact.ts/useCardCombination.ts for why.
  const cardIndexData = rawCardIndexData?.cardNames ? rawCardIndexData : undefined;
  const popularityIndexData = useDeckPopularityIndexData();

  return useMemo(() => {
    if (!clusterId || !deckClusterIndex || !cardIndexData || !popularityIndexData) return undefined;

    // Filter by cluster first, via the cheap lean-index lookup, before touching the (20MB+)
    // deck-card-index dataset — same ordering useChampionCardImpact.ts already uses for its own
    // Champion filter.
    const winRateByDeckId = new Map<string, number>();
    for (const s of popularityIndexData.entries) {
      if (deckClusterIndex[s.deckId] === clusterId) winRateByDeckId.set(s.deckId, s.winRate);
    }
    if (winRateByDeckId.size === 0) return undefined;

    const samples: QuantitySample[] = [];
    for (const entry of cardIndexData.decks) {
      const winRate = winRateByDeckId.get(entry.deckId);
      if (winRate === undefined) continue;

      const copiesByName = new Map<string, number>();
      for (const line of decodeCardLines(entry.main, cardIndexData.cardNames)) {
        copiesByName.set(line.name, (copiesByName.get(line.name) ?? 0) + line.quantity);
      }
      for (const line of decodeCardLines(entry.material, cardIndexData.cardNames)) {
        copiesByName.set(line.name, (copiesByName.get(line.name) ?? 0) + line.quantity);
      }
      samples.push({ copiesByName, winRate });
    }

    return computeLocalQuantityBuckets(samples);
  }, [clusterId, deckClusterIndex, cardIndexData, popularityIndexData]);
}
