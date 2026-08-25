import { useMemo } from "react";
import type { Card, CardInclusionEntry } from "@gatcg/shared";
import type { SuggestedBuild, SuggestedCard } from "./useSuggestedBuild";

/** Same fallback defaults `useSuggestedBuild`'s `modalTotal` uses when a population can't supply its
 * own modal section size — ShoutAtYourDecks analytics don't publish an average deck size at all, so
 * these are the only targets available here. */
const MATERIAL_TARGET = 12;
const MAIN_TARGET = 48;
const MAX_EXTRA_SUGGESTIONS = 8;

function legalMaxCopies(card: Card | undefined): number {
  return card?.types.includes("UNIQUE") ? 1 : 4;
}

function toSuggested(cardName: string, quantity: number, locked: boolean, entry: CardInclusionEntry | undefined, section: SuggestedCard["section"]): SuggestedCard {
  return {
    cardName,
    quantity,
    locked,
    section,
    adjustedLift: null,
    sample: null,
    optimizedFrom: null,
    quantityEvidence: { source: "matching population", sampleSize: entry?.deckCount ?? 0 },
    reason: "ranked",
  };
}

/**
 * A much simpler counterpart to `useSuggestedBuild`, for when the viewer wants Shout At Your Decks'
 * full community deck list instead of real tournament win-rate data (see docs/CALCULATIONS.md,
 * "Community population"). Ranks by `percentOfDecks` (popularity) instead of `adjustedLift`
 * (performance), since ShoutAtYourDecks decks carry no win/loss data at all — every `SuggestedCard`
 * this returns has `adjustedLift`/`sample` permanently null, so the UI's existing "only show lift
 * when present" guards hide the Card-Impact-specific figures on their own. Deliberately doesn't
 * touch `useSuggestedBuild.ts` or its win-rate math — a separate, additive hook.
 */
export function useCommunitySuggestedBuild(
  champData: { deckCount: number; cards: CardInclusionEntry[] } | undefined,
  lockedCards: Map<string, number>,
  rejectedCards: Set<string>,
  cardsByName: Map<string, Card>,
  loading: boolean,
): SuggestedBuild {
  return useMemo((): SuggestedBuild => {
    const empty: SuggestedBuild = {
      material: [],
      main: [],
      sideboard: [],
      suggestions: [],
      removalSuggestions: [],
      hasQuantityOptimizations: false,
      rankingPopulationSize: 0,
      usedFallback: false,
      usedSpiritElementFallback: false,
      spiritElementFallbackSpirits: [],
      conditionalWinRate: null,
      baselineWinRate: null,
      matchingDeckCount: 0,
      unresolved: { main: 0, material: 0, sideboard: 0 },
      loading,
    };
    if (loading || !champData) return empty;

    const entryByName = new Map(champData.cards.map((c) => [c.name, c]));
    const material: SuggestedCard[] = [];
    const main: SuggestedCard[] = [];
    const sideboard: SuggestedCard[] = [];
    const placed = new Set<string>();

    // Locked cards go in first, at the viewer's own quantity — same precedence as
    // useSuggestedBuild. Sectioned by the card's own primarySection when known (falls back to main
    // for a card ShoutAtYourDecks has never seen at all).
    for (const [name, qty] of lockedCards) {
      const entry = entryByName.get(name);
      const section: SuggestedCard["section"] = entry?.primarySection === "material" ? "material" : entry?.primarySection === "sideboard" ? "sideboard" : "main";
      (section === "material" ? material : section === "sideboard" ? sideboard : main).push(toSuggested(name, qty, true, entry, section));
      placed.add(name);
    }

    let materialTotal = material.reduce((sum, c) => sum + c.quantity, 0);
    let mainTotal = main.reduce((sum, c) => sum + c.quantity, 0);

    // champData.cards already comes sorted by deckCount descending (pipeline/src/shoutatyourdecks/
    // analytics/cardInclusion.ts's tally()), same order as percentOfDecks for a fixed champion.
    const ranked = champData.cards.filter(
      (c) => !placed.has(c.name) && !rejectedCards.has(c.name) && cardsByName.get(c.name)?.legality?.STANDARD?.limit !== 0,
    );

    for (const entry of ranked) {
      if (materialTotal >= MATERIAL_TARGET && mainTotal >= MAIN_TARGET) break;
      const card = cardsByName.get(entry.name);
      if (card?.types.includes("CHAMPION") && entry.primarySection !== "material") continue;
      const section: SuggestedCard["section"] = entry.primarySection === "material" ? "material" : "main";
      if (section === "material") {
        if (materialTotal >= MATERIAL_TARGET) continue;
        material.push(toSuggested(entry.name, 1, false, entry, "material"));
        materialTotal += 1;
      } else {
        if (mainTotal >= MAIN_TARGET) continue;
        const qty = Math.min(Math.max(1, Math.round(entry.avgCopiesWhenIncluded)), legalMaxCopies(card), MAIN_TARGET - mainTotal);
        main.push(toSuggested(entry.name, qty, false, entry, "main"));
        mainTotal += qty;
      }
      placed.add(entry.name);
    }

    // Top ranked cards that didn't make the assembled build — mirrors useSuggestedBuild.suggestions.
    const suggestions = champData.cards
      .filter((c) => !placed.has(c.name) && !rejectedCards.has(c.name))
      .slice(0, MAX_EXTRA_SUGGESTIONS)
      .map((entry) => {
        const card = cardsByName.get(entry.name);
        const section: SuggestedCard["section"] = entry.primarySection === "material" ? "material" : entry.primarySection === "sideboard" ? "sideboard" : "main";
        const qty = section === "material" ? 1 : Math.min(Math.max(1, Math.round(entry.avgCopiesWhenIncluded)), legalMaxCopies(card));
        return toSuggested(entry.name, qty, false, entry, section);
      });

    return {
      material,
      main,
      sideboard,
      suggestions,
      // Meaningless without win/loss data — always empty here, so the existing
      // `build.removalSuggestions.length > 0` render guard hides "Cards that might hurt" on its own.
      removalSuggestions: [],
      hasQuantityOptimizations: false,
      rankingPopulationSize: champData.deckCount,
      usedFallback: false,
      usedSpiritElementFallback: false,
      spiritElementFallbackSpirits: [],
      conditionalWinRate: null,
      baselineWinRate: null,
      matchingDeckCount: champData.deckCount,
      unresolved: { main: Math.max(0, MAIN_TARGET - mainTotal), material: Math.max(0, MATERIAL_TARGET - materialTotal), sideboard: 0 },
      loading: false,
    };
  }, [champData, lockedCards, rejectedCards, cardsByName, loading]);
}
