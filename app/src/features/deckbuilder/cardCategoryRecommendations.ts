import type { Card, DeckFormat } from "@gatcg/shared";
import type { PopulationSource } from "./model/builderTypes";
import type { DeckBuilderRow } from "./useDeckBuilderPopulation";
import { isElementCompatible } from "./suggestedBuild/identityRules";

export interface CardCategoryRecommendation {
  card: Card;
  subtype: string;
  recommendedQuantity: number;
  tournamentDecks: number;
  tournamentRate: number;
  communityRate: number;
  score: number;
}

function legalLimit(card: Card, format: DeckFormat): number {
  return card.legality?.[format]?.limit ?? 4;
}

/** Ranks subtype cards inside the builder's current Champion/Spirit evidence population. */
export function buildCardCategoryRecommendations({
  catalog,
  rows,
  communityRateByName,
  identityElements,
  format,
  source,
}: {
  catalog: Card[];
  rows: DeckBuilderRow[];
  communityRateByName?: Map<string, number>;
  identityElements: Set<string>;
  format: DeckFormat;
  source: PopulationSource;
}): CardCategoryRecommendation[] {
  const appearances = new Map<string, { decks: number; copies: number }>();
  for (const row of rows) {
    const seen = new Set<string>();
    for (const section of [row.main, row.material, row.sideboard]) {
      for (const [name, quantity] of section) {
        const stats = appearances.get(name) ?? { decks: 0, copies: 0 };
        stats.copies += quantity;
        if (!seen.has(name)) {
          stats.decks += 1;
          seen.add(name);
        }
        appearances.set(name, stats);
      }
    }
  }

  return catalog.flatMap((card) => {
    if (card.types.includes("CHAMPION") || card.subtypes.includes("SPIRIT")) return [];
    const limit = legalLimit(card, format);
    if (limit === 0 || !isElementCompatible(card, identityElements)) return [];
    const tournament = appearances.get(card.name);
    const tournamentRate = rows.length > 0 ? (tournament?.decks ?? 0) / rows.length : 0;
    const communityRate = communityRateByName?.get(card.name) ?? 0;
    const score = source === "community" || source === "simulator"
      ? communityRate
      : source === "tournament"
        ? tournamentRate
        : tournamentRate * 0.7 + communityRate * 0.3;
    if (score === 0) return [];
    const recommendedQuantity = Math.max(1, Math.min(limit, Math.round((tournament?.copies ?? 0) / Math.max(1, tournament?.decks ?? 0)) || Math.min(4, limit)));
    return card.subtypes.map((subtype) => ({
      card,
      subtype,
      recommendedQuantity,
      tournamentDecks: tournament?.decks ?? 0,
      tournamentRate,
      communityRate,
      score,
    }));
  }).sort((a, b) => b.score - a.score || b.tournamentDecks - a.tournamentDecks || a.card.name.localeCompare(b.card.name));
}
