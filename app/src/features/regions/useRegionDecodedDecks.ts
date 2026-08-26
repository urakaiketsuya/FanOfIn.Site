import { useMemo } from "react";
import { decodeCardLines, type DeckCardIndexLine } from "@gatcg/shared";
import { useDeckCardIndexData } from "../archetypes/data";

export interface RegionDeckLines {
  deckId: string;
  main: DeckCardIndexLine[];
  material: DeckCardIndexLine[];
  sideboard: DeckCardIndexLine[];
}

export interface RegionDecodedDecks {
  decks: RegionDeckLines[];
  /** Total decks in the published index (unfiltered) — the denominator every global rate is computed against. */
  globalDeckTotal: number;
  loading: boolean;
}

/**
 * Decodes one region's decks (main/material/sideboard) once, shared by
 * `useRegionalCardComposition` and `useRegionalKeywords` — both used to independently decode the
 * same region's decks from scratch (doubled on every Regions page view, quadrupled on Compare
 * Regions, which mounts both hooks once per region). Callers pass the same result into both hooks
 * instead of each calling this internally, since a `useMemo` inside a shared custom hook still
 * runs once per call site, not once per distinct input — only lifting the decode to a single
 * shared call actually dedupes it.
 */
export function useRegionDecodedDecks(regionByDeckId: Map<string, string> | undefined, regionKey: string | null): RegionDecodedDecks {
  const cardIndexData = useDeckCardIndexData();

  return useMemo((): RegionDecodedDecks => {
    if (!cardIndexData) return { decks: [], globalDeckTotal: 0, loading: true };
    const globalDeckTotal = cardIndexData.decks.length;
    if (!regionByDeckId || !regionKey) return { decks: [], globalDeckTotal, loading: false };

    const decks: RegionDeckLines[] = [];
    for (const entry of cardIndexData.decks) {
      if (regionByDeckId.get(entry.deckId) !== regionKey) continue;
      decks.push({
        deckId: entry.deckId,
        main: decodeCardLines(entry.main, cardIndexData.cardNames),
        material: decodeCardLines(entry.material, cardIndexData.cardNames),
        sideboard: decodeCardLines(entry.sideboard, cardIndexData.cardNames),
      });
    }

    return { decks, globalDeckTotal, loading: false };
  }, [cardIndexData, regionByDeckId, regionKey]);
}
