import { useMemo } from "react";
import type { Card } from "@gatcg/shared";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useSimulatorSummaryData } from "./data";
import type { SimulatorCardEvidence } from "../deckbuilder/useSimulatorSuggestedBuild";

/**
 * Anonymous Clarent simulator evidence keyed by card name. `SimulatorSummary.cardStats` is keyed
 * by cardId (uuid or slug), not name, so this resolves through the catalog once per caller rather
 * than repeating that lookup inline at every card-grid call site (DecklistView's Visual mode
 * originally computed this itself; TopCardsSections' grid layout needs the same map).
 */
export function useSimulatorEvidenceByName(): Map<string, SimulatorCardEvidence> {
  const catalog = useCardCatalog();
  const simulatorSummary = useSimulatorSummaryData();
  return useMemo(() => {
    const cardById = new Map<string, Card>();
    for (const c of catalog) {
      cardById.set(c.uuid, c);
      cardById.set(c.slug, c);
    }
    const byName = new Map<string, SimulatorCardEvidence>();
    for (const stat of simulatorSummary?.cardStats ?? []) {
      const card = cardById.get(stat.cardId);
      if (card) byName.set(card.name, stat);
    }
    return byName;
  }, [catalog, simulatorSummary]);
}
