import { useMemo } from "react";
import type { Card, CardStatsData } from "@gatcg/shared";
import { isElementCompatible } from "./useSuggestedBuild";

/** Below this many decks, a card's `adjustedWinRate` is mostly shrinkage noise — same floor Card Impact uses everywhere else for "is this enough data to trust." */
const MIN_DECK_COUNT = 20;
const MAX_SUGGESTIONS = 30;

export interface GlobalSuggestion {
  cardName: string;
  adjustedWinRate: number;
  deckCount: number;
}

/**
 * Cards matching the required element(s), ranked by their overall (not Champion-scoped)
 * win rate — the last-resort pool, for when there's no real deck population to rank against at
 * all (not even a cross-Champion one). Deliberately **not** placed into Material/Main/Sideboard
 * like every other pool: `CardStat` (`cards.json`) has no section/role or co-occurrence data
 * (confirmed — it's aggregate-only), so there's no reliable way to guess where a card belongs
 * without real decklists to check against (the same 80%-in-one-section heuristic every other pool
 * uses needs real rows). Rendered as a flat "generic strong picks for these elements" list instead
 * of a pretend assembled build. Champion and Spirit cards are excluded — those are the viewer's own
 * dropdown picks, not something this pool should suggest.
 */
export function useGlobalElementSuggestions(
  cardStatsData: CardStatsData | undefined,
  identityElements: Set<string>,
  cardsByName: Map<string, Card>,
  lockedCards: Map<string, number>,
  rejectedCards: Set<string>,
): GlobalSuggestion[] {
  return useMemo(() => {
    if (!cardStatsData) return [];
    return cardStatsData.cards
      .filter((c) => c.deckCount >= MIN_DECK_COUNT && !lockedCards.has(c.name) && !rejectedCards.has(c.name))
      .filter((c) => {
        const card = cardsByName.get(c.name);
        if (card?.types.includes("CHAMPION")) return false;
        return isElementCompatible(card, identityElements);
      })
      .sort((a, b) => b.adjustedWinRate - a.adjustedWinRate)
      .slice(0, MAX_SUGGESTIONS)
      .map((c) => ({ cardName: c.name, adjustedWinRate: c.adjustedWinRate, deckCount: c.deckCount }));
  }, [cardStatsData, identityElements, cardsByName, lockedCards, rejectedCards]);
}
