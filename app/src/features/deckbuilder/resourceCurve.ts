import type { Card } from "@gatcg/shared";
import { earliestReserveCostTurn, naturalCardsSeenByTurn, type PlayOrder } from "../../lib/turnToPlay";
import { probabilityAtLeast } from "./synergyReadiness";

export interface ResourceCurveTiming {
  order: PlayOrder;
  turn: number;
  seen: number;
  probability: number;
}

export interface ResourceCurvePoint {
  cost: number;
  copies: number;
  first: ResourceCurveTiming;
  second: ResourceCurveTiming;
}

export function computeResourceCurveReliability(
  mainLines: { name: string; quantity: number }[],
  cardsByName: ReadonlyMap<string, Card>,
  startingHandSize: number,
  effectiveCosts: Readonly<Record<string, number>> = {},
): ResourceCurvePoint[] {
  const deckSize = mainLines.reduce((sum, line) => sum + line.quantity, 0);
  const copiesByCost = new Map<number, number>();
  for (const line of mainLines) {
    const card = cardsByName.get(line.name);
    if (!card || card.cost.type !== "reserve" || card.cost_reserve === null || card.cost_reserve < 0) continue;
    const entered = effectiveCosts[line.name];
    const cost = Number.isFinite(entered) ? Math.max(0, Math.floor(entered)) : card.cost_reserve;
    copiesByCost.set(cost, (copiesByCost.get(cost) ?? 0) + line.quantity);
  }
  return Array.from(copiesByCost, ([cost, copies]) => {
    const timing = (order: PlayOrder): ResourceCurveTiming => {
      const turn = earliestReserveCostTurn(cost, startingHandSize, order);
      const seen = Math.min(deckSize, naturalCardsSeenByTurn(turn, startingHandSize, order));
      return { order, turn, seen, probability: probabilityAtLeast(deckSize, copies, seen, 1) };
    };
    return { cost, copies, first: timing("first"), second: timing("second") };
  }).sort((a, b) => a.cost - b.cost);
}
