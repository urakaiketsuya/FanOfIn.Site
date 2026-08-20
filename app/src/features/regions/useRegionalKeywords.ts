import { useMemo } from "react";
import { computeKeywordComposition, decodeCardLines } from "@gatcg/shared";
import { useDeckCardIndexData, useKeywordStatsData } from "../archetypes/data";
import { useCardCatalog } from "../cards/useCardCatalog";

const PRIOR_WEIGHT = 10;
const MIN_SAMPLE_SIZE = 5;
const MAX_RESULTS = 15;

export interface RegionalKeywordRow {
  keyword: string;
  regionRate: number;
  globalRate: number;
  lift: number;
  deckCountInRegion: number;
  avgWinRate: number;
}

export interface RegionalKeywords {
  overRepresented: RegionalKeywordRow[];
  underRepresented: RegionalKeywordRow[];
  /** Every keyword clearing the sample-size bar — see the matching field on RegionalCardComposition for why. */
  allEntries: RegionalKeywordRow[];
  regionDeckCount: number;
  loading: boolean;
}

/**
 * Same region-vs-global rate/lift methodology as `useRegionalCardComposition.ts`, but keyed by
 * ability keyword (Ranged, Swift, Bulwark, ...) instead of exact card name — a coarser lens on
 * "what kind of deck wins here." Reuses `computeKeywordComposition` (@gatcg/shared), the exact
 * same function the pipeline uses to tag each DeckSighting's keyword composition, so this stays
 * consistent with the site-wide Keyword Stats numbers without touching the 40MB+
 * deck-sightings.json — only main+material card names (already available from deck-card-index.json,
 * which this page already loads for the Card Composition tab) plus each card's own effect text
 * (from the local card catalog) are needed to re-derive it client-side.
 */
export function useRegionalKeywords(regionByDeckId: Map<string, string>, regionKey: string | null): RegionalKeywords {
  const cardIndexData = useDeckCardIndexData();
  const keywordStatsData = useKeywordStatsData();
  const cardCatalog = useCardCatalog();

  const cardsByName = useMemo(() => new Map(cardCatalog.map((c) => [c.name, c])), [cardCatalog]);

  return useMemo((): RegionalKeywords => {
    if (!cardIndexData || !keywordStatsData || cardsByName.size === 0 || !regionKey) {
      return {
        overRepresented: [],
        underRepresented: [],
        allEntries: [],
        regionDeckCount: 0,
        loading: !cardIndexData || !keywordStatsData || cardsByName.size === 0,
      };
    }

    const globalDeckTotal = cardIndexData.decks.length;
    const statByKeyword = new Map(keywordStatsData.keywords.map((k) => [k.keyword, k]));
    const globalRateByKeyword = new Map<string, number>();
    for (const stat of keywordStatsData.keywords) {
      globalRateByKeyword.set(stat.keyword, globalDeckTotal > 0 ? stat.deckCount / globalDeckTotal : 0);
    }

    const regionCount = new Map<string, number>();
    let regionDeckCount = 0;
    for (const entry of cardIndexData.decks) {
      if (regionByDeckId.get(entry.deckId) !== regionKey) continue;
      regionDeckCount += 1;
      const lines = [...decodeCardLines(entry.main, cardIndexData.cardNames), ...decodeCardLines(entry.material, cardIndexData.cardNames)];
      const composition = computeKeywordComposition(lines, cardsByName);
      for (const keyword of composition.keys()) regionCount.set(keyword, (regionCount.get(keyword) ?? 0) + 1);
    }

    if (regionDeckCount === 0) return { overRepresented: [], underRepresented: [], allEntries: [], regionDeckCount: 0, loading: false };

    const entries: RegionalKeywordRow[] = [];
    for (const [keyword, deckCountInRegion] of regionCount.entries()) {
      if (deckCountInRegion < MIN_SAMPLE_SIZE) continue;
      const globalRate = globalRateByKeyword.get(keyword) ?? 0;
      const shrunkRegionRate = (deckCountInRegion + PRIOR_WEIGHT * globalRate) / (regionDeckCount + PRIOR_WEIGHT);
      entries.push({
        keyword,
        regionRate: shrunkRegionRate,
        globalRate,
        lift: shrunkRegionRate - globalRate,
        deckCountInRegion,
        avgWinRate: statByKeyword.get(keyword)?.avgWinRate ?? 0,
      });
    }

    entries.sort((a, b) => b.lift - a.lift);
    const overRepresented = entries.slice(0, MAX_RESULTS);
    const underRepresented = entries.slice(-MAX_RESULTS).reverse();

    return { overRepresented, underRepresented, allEntries: entries, regionDeckCount, loading: false };
  }, [cardIndexData, keywordStatsData, cardsByName, regionByDeckId, regionKey]);
}
