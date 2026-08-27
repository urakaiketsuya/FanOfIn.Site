import { useMemo } from "react";
import type { Card, SimulatorSummary } from "@gatcg/shared";
import type { SuggestedBuild, SuggestedCard } from "./useSuggestedBuild";

export type SimulatorCardEvidence = SimulatorSummary["cardStats"][number];

/**
 * Simulator telemetry does not currently carry complete submitted decklists or a Champion→card
 * population, so it cannot safely assemble a legal shell by itself. Community construction is the
 * disclosed baseline; qualifying simulator card rows only reorder cards already supported for the
 * selected Champion. IDs are resolved against both catalog UUID and slug so this starts working as
 * soon as Clarent publishes either public identifier. Unresolved TCGEngine-only IDs are ignored.
 */
export function useSimulatorSuggestedBuild(
  baseline: SuggestedBuild,
  summary: SimulatorSummary | undefined,
  catalog: Card[],
): { build: SuggestedBuild; evidenceByName: Map<string, SimulatorCardEvidence>; matchedCards: number } {
  return useMemo(() => {
    const cardById = new Map<string, Card>();
    for (const card of catalog) {
      cardById.set(card.uuid, card);
      cardById.set(card.slug, card);
    }
    const evidenceByName = new Map<string, SimulatorCardEvidence>();
    for (const stat of summary?.cardStats ?? []) {
      const card = cardById.get(stat.cardId);
      if (card) evidenceByName.set(card.name, stat);
    }

    const rank = (a: SuggestedCard, b: SuggestedCard) => {
      if (a.locked !== b.locked) return a.locked ? -1 : 1;
      const left = evidenceByName.get(a.cardName);
      const right = evidenceByName.get(b.cardName);
      if (Boolean(left) !== Boolean(right)) return left ? -1 : 1;
      if (!left || !right) return 0;
      const leftRate = left.winRate ?? 0.5;
      const rightRate = right.winRate ?? 0.5;
      // Ten neutral pseudo-games keep the experimental ordering from treating a 5-game row as
      // certainty. Activity only breaks equal evidence; it is usage, not a performance claim.
      const leftScore = (leftRate * left.games + 5) / (left.games + 10);
      const rightScore = (rightRate * right.games + 5) / (right.games + 10);
      return rightScore - leftScore
        || right.games - left.games
        || (right.avgActivated + right.avgDrawn) - (left.avgActivated + left.avgDrawn);
    };

    return {
      evidenceByName,
      matchedCards: evidenceByName.size,
      build: {
        ...baseline,
        material: [...baseline.material].sort(rank),
        main: [...baseline.main].sort(rank),
        sideboard: [...baseline.sideboard].sort(rank),
        suggestions: [...baseline.suggestions].sort(rank),
        matchingDeckCount: summary?.games ?? 0,
        rankingPopulationSize: summary?.games ?? 0,
        conditionalWinRate: null,
        baselineWinRate: null,
        loading: !summary || baseline.loading,
      },
    };
  }, [baseline, summary, catalog]);
}
