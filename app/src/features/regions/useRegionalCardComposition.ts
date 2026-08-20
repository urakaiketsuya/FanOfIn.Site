import { useMemo } from "react";
import { decodeCardLines } from "@gatcg/shared";
import { useDeckCardIndexData, useCardStatsData } from "../archetypes/data";

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
  regionDeckCount: number;
  loading: boolean;
}

/**
 * Which cards show up more or less often in a region's decks than in the overall meta — a
 * region-vs-global rate comparison, unlike Card Impact's within-population with/without lift.
 * Only the region's own decks are decoded (deck-card-index.json's card lines are dictionary-
 * encoded and expensive to decode at scale, ~57k decks) — the global side reuses cards.json's
 * already-published `deckCount` instead of a second full decode pass, same "filter before decode"
 * optimization useChampionCardImpact.ts uses for its champion filter.
 */
export function useRegionalCardComposition(regionByDeckId: Map<string, string>, regionKey: string | null): RegionalCardComposition {
  const cardIndexData = useDeckCardIndexData();
  const cardStatsData = useCardStatsData();

  return useMemo((): RegionalCardComposition => {
    if (!cardIndexData || !cardStatsData || !regionKey) {
      return { overRepresented: [], underRepresented: [], regionDeckCount: 0, loading: !cardIndexData || !cardStatsData };
    }

    const globalDeckTotal = cardIndexData.decks.length;
    const globalRateByName = new Map<string, number>();
    const statByName = new Map(cardStatsData.cards.map((s) => [s.name, s]));
    for (const stat of cardStatsData.cards) {
      globalRateByName.set(stat.name, globalDeckTotal > 0 ? stat.deckCount / globalDeckTotal : 0);
    }

    const regionCount = new Map<string, number>();
    let regionDeckCount = 0;
    for (const entry of cardIndexData.decks) {
      if (regionByDeckId.get(entry.deckId) !== regionKey) continue;
      regionDeckCount += 1;
      const names = new Set<string>();
      for (const line of decodeCardLines(entry.main, cardIndexData.cardNames)) names.add(line.name);
      for (const line of decodeCardLines(entry.material, cardIndexData.cardNames)) names.add(line.name);
      for (const line of decodeCardLines(entry.sideboard, cardIndexData.cardNames)) names.add(line.name);
      for (const name of names) regionCount.set(name, (regionCount.get(name) ?? 0) + 1);
    }

    if (regionDeckCount === 0) return { overRepresented: [], underRepresented: [], regionDeckCount: 0, loading: false };

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

    return { overRepresented, underRepresented, regionDeckCount, loading: false };
  }, [cardIndexData, cardStatsData, regionByDeckId, regionKey]);
}
