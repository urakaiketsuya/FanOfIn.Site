import { useMemo } from "react";
import { computeCardImpactEntries, decodeCardLines, type CardImpactEntry, type CardSectionRow, type DeckSections } from "@gatcg/shared";
import { useDeckCardIndexData } from "../archetypes/data";
import { useDeckPopularityIndexData } from "../topdecks/data";

/** Mirrors pipeline/src/config.ts's defaults — see useChampionCardImpact.ts for why these are plain literals here. */
const PRIOR_WEIGHT = 10;
const MIN_SAMPLE_SIZE = 5;
const MAX_RESULTS = 15;

export interface CardSynergyResult {
  cards: CardImpactEntry[];
  totalDecks: number;
  loading: boolean;
}

/**
 * For every deck running this card, does *also* running a given other card correlate with a
 * higher win rate than running this card without it? Global, champion-agnostic version of the
 * same with/without/shrink core used everywhere else (`computeCardImpactEntries`) — the population
 * here is simply "every deck containing this card" rather than a Champion, Champion+Spirit, or
 * named-build cluster. The card itself never appears in its own results: every row in this
 * population already has it, so its own "without" bucket is always empty and fails the sample bar
 * automatically, no special-casing needed.
 */
export function useCardSynergy(cardName: string | null): CardSynergyResult {
  const rawCardIndexData = useDeckCardIndexData();
  const cardIndexData = rawCardIndexData?.cardNames ? rawCardIndexData : undefined;
  const popularityIndexData = useDeckPopularityIndexData();

  return useMemo((): CardSynergyResult => {
    if (!cardName || !cardIndexData || !popularityIndexData)
      return { cards: [], totalDecks: 0, loading: !cardIndexData || !popularityIndexData };

    const winRateByDeckId = new Map(popularityIndexData.entries.map((s) => [s.deckId, s.winRate]));

    const rows: CardSectionRow[] = [];
    for (const entry of cardIndexData.decks) {
      const winRate = winRateByDeckId.get(entry.deckId);
      if (winRate === undefined) continue;

      const main = decodeCardLines(entry.main, cardIndexData.cardNames);
      const material = decodeCardLines(entry.material, cardIndexData.cardNames);
      const sideboard = decodeCardLines(entry.sideboard, cardIndexData.cardNames);
      if (!main.some((l) => l.name === cardName) && !material.some((l) => l.name === cardName) && !sideboard.some((l) => l.name === cardName))
        continue;

      const sections: DeckSections = {
        main: new Set(main.map((l) => l.name)),
        material: new Set(material.map((l) => l.name)),
        sideboard: new Set(sideboard.map((l) => l.name)),
      };
      rows.push({ sections, outcome: winRate });
    }

    if (rows.length === 0) return { cards: [], totalDecks: 0, loading: false };

    const baseline = rows.reduce((sum, r) => sum + r.outcome, 0) / rows.length;
    const cards = computeCardImpactEntries(rows, baseline, PRIOR_WEIGHT, MIN_SAMPLE_SIZE).slice(0, MAX_RESULTS);

    return { cards, totalDecks: rows.length, loading: false };
  }, [cardName, cardIndexData, popularityIndexData]);
}
