import { useMemo } from "react";
import { useCardStatsData } from "../archetypes/data";
import type { RegionDecodedDecks } from "./useRegionDecodedDecks";

/** Mirrors pipeline/src/config.ts's winRateShrinkagePriorWeight default — that config reads process.env, which doesn't exist client-side, same reasoning useChampionCardImpact.ts already documents for its own literal copies. */
const PRIOR_WEIGHT = 10;
const MIN_SAMPLE_SIZE = 5;
const MAX_RESULTS = 15;

export interface RegionalCardRow {
  cardName: string;
  regionRate: number;
  globalRate: number;
  lift: number;
  deckCountInRegion: number;
  /** Global figures (not region-scoped — no per-region sample is large enough to shrink a per-card win rate meaningfully) from cards.json, for context alongside the region/global usage rates. */
  avgWinRate: number;
  marketPrice: number | null;
}

export interface RegionalCardComposition {
  overRepresented: RegionalCardRow[];
  underRepresented: RegionalCardRow[];
  /** Every card clearing the sample-size bar, not just the capped over/under lists — for joining two regions' rates directly against each other (see the Compare Regions view), where capping to the top movers vs. the GLOBAL average would drop cards that differ most between the two regions specifically. */
  allEntries: RegionalCardRow[];
  regionDeckCount: number;
  loading: boolean;
}

/**
 * Which cards show up more or less often in a region's decks than in the overall meta — a
 * region-vs-global rate comparison, unlike Card Impact's within-population with/without lift.
 * Takes the region's already-decoded decks from `useRegionDecodedDecks` (shared with
 * `useRegionalKeywords`, which needs the same decode) rather than decoding its own copy — the
 * global side still reuses cards.json's already-published `deckCount` instead of a second full
 * decode pass, same "filter before decode" optimization useChampionCardImpact.ts uses for its
 * champion filter.
 */
export function useRegionalCardComposition(regionDecks: RegionDecodedDecks): RegionalCardComposition {
  const cardStatsData = useCardStatsData();

  return useMemo((): RegionalCardComposition => {
    if (regionDecks.loading || !cardStatsData) {
      return { overRepresented: [], underRepresented: [], allEntries: [], regionDeckCount: 0, loading: regionDecks.loading || !cardStatsData };
    }

    const globalDeckTotal = regionDecks.globalDeckTotal;
    const globalRateByName = new Map<string, number>();
    const statByName = new Map(cardStatsData.cards.map((s) => [s.name, s]));
    for (const stat of cardStatsData.cards) {
      globalRateByName.set(stat.name, globalDeckTotal > 0 ? stat.deckCount / globalDeckTotal : 0);
    }

    const regionCount = new Map<string, number>();
    const regionDeckCount = regionDecks.decks.length;
    for (const deck of regionDecks.decks) {
      const names = new Set<string>();
      for (const line of deck.main) names.add(line.name);
      for (const line of deck.material) names.add(line.name);
      for (const line of deck.sideboard) names.add(line.name);
      for (const name of names) regionCount.set(name, (regionCount.get(name) ?? 0) + 1);
    }

    if (regionDeckCount === 0) return { overRepresented: [], underRepresented: [], allEntries: [], regionDeckCount: 0, loading: false };

    const entries: RegionalCardRow[] = [];
    for (const [cardName, deckCountInRegion] of regionCount.entries()) {
      if (deckCountInRegion < MIN_SAMPLE_SIZE) continue;
      const globalRate = globalRateByName.get(cardName) ?? 0;
      // Bayesian-shrink the region rate toward the global rate proportional to sample size — same
      // (sum + prior*baseline)/(n+prior) convention docs/CALCULATIONS.md documents elsewhere, so a
      // card seen in 5 regional decks at 100% doesn't outrank one seen in 200 at 65%.
      const shrunkRegionRate = (deckCountInRegion + PRIOR_WEIGHT * globalRate) / (regionDeckCount + PRIOR_WEIGHT);
      const stat = statByName.get(cardName);
      entries.push({
        cardName,
        regionRate: shrunkRegionRate,
        globalRate,
        lift: shrunkRegionRate - globalRate,
        deckCountInRegion,
        avgWinRate: stat?.avgWinRate ?? 0,
        marketPrice: stat?.marketPrice ?? null,
      });
    }

    entries.sort((a, b) => b.lift - a.lift);
    const overRepresented = entries.slice(0, MAX_RESULTS);
    const underRepresented = entries.slice(-MAX_RESULTS).reverse();

    return { overRepresented, underRepresented, allEntries: entries, regionDeckCount, loading: false };
  }, [regionDecks, cardStatsData]);
}
