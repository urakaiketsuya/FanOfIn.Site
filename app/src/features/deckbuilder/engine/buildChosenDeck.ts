import type { Card } from "@gatcg/shared";
import type { LockedSection } from "../model/builderTypes";
import type { SuggestedBuild, SuggestedCard } from "../useSuggestedBuild";

/** The editable deck is exclusively user selections, independent of evidence availability. */
export function buildChosenDeck(
  choices: ReadonlyMap<string, number>,
  sections: ReadonlyMap<string, LockedSection>,
  spirit: string | null,
  catalog: ReadonlyMap<string, Card>,
): SuggestedBuild {
  const selected = new Map(choices);
  if (spirit && !selected.has(spirit)) selected.set(spirit, 1);
  const cards: SuggestedCard[] = Array.from(selected, ([cardName, quantity]) => ({
    cardName, quantity, locked: true,
    section: cardName === spirit ? "material" : sections.get(cardName)
      ?? (catalog.get(cardName)?.types.some((type) => type === "CHAMPION" || type === "REGALIA") ? "material" : "main"),
    adjustedLift: null, sample: null, optimizedFrom: null,
    quantityEvidence: { source: "matching population", sampleSize: 0 },
    reason: cardName === spirit ? "spirit" : "ranked",
  }));
  return {
    rankingPopulationSize: 0, matchingDeckCount: 0, conditionalWinRate: null, baselineWinRate: null,
    main: cards.filter((card) => card.section === "main"),
    material: cards.filter((card) => card.section === "material"),
    sideboard: cards.filter((card) => card.section === "sideboard"),
    suggestions: [], removalSuggestions: [], protectedRemovalSuggestions: [],
    protectedPackages: [], packageCatalog: [], hasQuantityOptimizations: false,
    usedFallback: false, usedSpiritElementFallback: false, spiritElementFallbackSpirits: [],
    unresolved: { main: 0, material: 0, sideboard: 0 }, loading: false,
  };
}
