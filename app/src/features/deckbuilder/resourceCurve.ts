import type { Card } from "@gatcg/shared";
import { earliestReserveCostTurn } from "../../lib/turnToPlay";
import { probabilityAtLeast } from "./synergyReadiness";

export interface ResourceCurvePoint {
  cost: number;
  copies: number;
  turn: number;
  seen: number;
  probability: number;
}

export function computeResourceCurveReliability(
  mainLines: { name: string; quantity: number }[],
  cardsByName: ReadonlyMap<string, Card>,
  startingHandSize: number,
): ResourceCurvePoint[] {
  const deckSize = mainLines.reduce((sum, line) => sum + line.quantity, 0);
  const copiesByCost = new Map<number, number>();
  for (const line of mainLines) {
    const card = cardsByName.get(line.name);
    if (!card || card.cost.type !== "reserve" || card.cost_reserve === null || card.cost_reserve < 0) continue;
    copiesByCost.set(card.cost_reserve, (copiesByCost.get(card.cost_reserve) ?? 0) + line.quantity);
  }
  return Array.from(copiesByCost, ([cost, copies]) => {
    const turn = earliestReserveCostTurn(cost, startingHandSize);
    const seen = Math.min(deckSize, startingHandSize + Math.max(0, turn - 1));
    return { cost, copies, turn, seen, probability: probabilityAtLeast(deckSize, copies, seen, 1) };
  }).sort((a, b) => a.cost - b.cost);
}
