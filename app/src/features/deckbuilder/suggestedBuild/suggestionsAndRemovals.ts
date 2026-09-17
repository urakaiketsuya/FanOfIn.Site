import type { Card } from "@gatcg/shared";
import { computeDeckIdentity, computeDeckRating, type RatingPillar } from "../../../lib/deckIdentity";
import type { DependencyReadiness, SynergyReadiness } from "../synergyReadiness";
import type { SuggestedCard } from "./buildTournamentSuggestedDeck";

export function annotateSuggestions(
  suggestions: SuggestedCard[],
  material: SuggestedCard[],
  main: SuggestedCard[],
  cardsByName: Map<string, Card>,
  championIdentity: string | null,
  synergyReadiness: SynergyReadiness[],
  dependencyReadiness: DependencyReadiness[],
  limit: number,
): SuggestedCard[] {
  const readinessReasonsByName = new Map<string, string[]>();
  const addReason = (name: string, reason: string) => {
    const reasons = readinessReasonsByName.get(name) ?? [];
    if (!reasons.includes(reason)) reasons.push(reason);
    readinessReasonsByName.set(name, reasons);
  };
  for (const group of synergyReadiness) for (const name of group.recommendations) addReason(name, `Supports ${group.label}`);
  for (const group of dependencyReadiness) for (const name of group.recommendations) addReason(name, `Supports ${group.label}`);

  const ratingLines = [...material, ...main].map((card) => ({ name: card.cardName, quantity: card.quantity }));
  const ratingIdentity = computeDeckIdentity(ratingLines, cardsByName);
  const baseRating = computeDeckRating(ratingLines, cardsByName, championIdentity, ratingIdentity.classes);
  return suggestions
    .map((card) => {
      const withReasons = { ...card, readinessReasons: readinessReasonsByName.get(card.cardName) };
      if (card.section === "sideboard") return withReasons;
      const nextLines = [...ratingLines, { name: card.cardName, quantity: card.quantity }];
      const nextIdentity = computeDeckIdentity(nextLines, cardsByName);
      const nextRating = computeDeckRating(nextLines, cardsByName, championIdentity, nextIdentity.classes);
      const diaoMetricChanges = (Object.keys(baseRating.points) as RatingPillar[]).reduce<Partial<Record<RatingPillar, number>>>((changes, pillar) => {
        const delta = nextRating.points[pillar] - baseRating.points[pillar];
        if (Math.abs(delta) >= 0.05) changes[pillar] = +delta.toFixed(2);
        return changes;
      }, {});
      return { ...withReasons, diaoMetricChanges };
    })
    .sort((a, b) => Number((b.readinessReasons?.length ?? 0) > 0) - Number((a.readinessReasons?.length ?? 0) > 0))
    .slice(0, limit);
}

export function removalHarmsReadiness(
  candidate: SuggestedCard,
  synergyReadiness: SynergyReadiness[],
  dependencyReadiness: DependencyReadiness[],
): boolean {
  if (candidate.section !== "main") return false;
  for (const group of synergyReadiness) {
    if (!group.enablerCards.some((line) => line.name === candidate.cardName)) continue;
    const removedPayoffCopies = group.payoffCards.find((line) => line.name === candidate.cardName)?.quantity ?? 0;
    if (group.payoffCopies - removedPayoffCopies > 0) return true;
  }
  const statusRank = { "Missing support": 0, Thin: 1, Supported: 2 } as const;
  for (const group of dependencyReadiness) {
    if (!group.producers.some((line) => line.name === candidate.cardName)) continue;
    const removedProducerCopies = group.producers.find((line) => line.name === candidate.cardName)?.quantity ?? 0;
    const removedConsumerCopies = group.consumers.find((line) => line.name === candidate.cardName)?.quantity ?? 0;
    const nextProducerCopies = group.producerCopies - removedProducerCopies;
    const nextConsumerCopies = group.consumerCopies - removedConsumerCopies;
    if (nextConsumerCopies <= 0) continue;
    const nextStatus = nextProducerCopies === 0 ? "Missing support" : nextProducerCopies < nextConsumerCopies ? "Thin" : "Supported";
    if (statusRank[nextStatus] < statusRank[group.status]) return true;
  }
  return false;
}
