import type { Card } from "@gatcg/shared";

export interface ReserveSequenceStep { name: string; turn: number; effectiveReserveCost?: number; }
export interface ReservePressureTurn { turn: number; cards: string[]; reserveCost: number; handCeiling: number; cardsNeeded: number; margin: number; floatingPotential: number; }
export interface ReserveSequenceResult { probability: number; playableProbability: number; feasible: boolean; pressure: ReservePressureTurn[]; }

function stateKey(counts: number[]): string { return counts.join(","); }

/** Exact without-replacement odds that every selected card is drawn by its assigned turn. */
export function sequenceDrawProbability(deckSize: number, copiesByName: ReadonlyMap<string, number>, steps: ReserveSequenceStep[], startingHandSize: number): number {
  if (deckSize <= 0 || steps.length === 0) return 0;
  const names = [...new Set(steps.map((step) => step.name))];
  const copies = names.map((name) => copiesByName.get(name) ?? 0);
  const totalRequired = names.map((name) => steps.filter((step) => step.name === name).length);
  if (copies.some((count, index) => count < totalRequired[index])) return 0;
  const maxSeen = Math.min(deckSize, Math.max(...steps.map((step) => startingHandSize + Math.max(0, step.turn - 1))));
  const requirementsAtSeen = new Map<number, number[]>();
  for (const step of steps) {
    const checkpoint = Math.min(deckSize, startingHandSize + Math.max(0, step.turn - 1));
    const requirements = requirementsAtSeen.get(checkpoint) ?? names.map(() => 0);
    requirements[names.indexOf(step.name)] += 1;
    requirementsAtSeen.set(checkpoint, requirements);
  }
  const orderedCheckpoints = [...requirementsAtSeen.keys()].sort((a, b) => a - b);
  const cumulative = names.map(() => 0);
  for (const checkpoint of orderedCheckpoints) {
    const additions = requirementsAtSeen.get(checkpoint)!;
    requirementsAtSeen.set(checkpoint, additions.map((value, index) => (cumulative[index] += value)));
  }

  let states = new Map<string, { counts: number[]; probability: number }>([[stateKey(names.map(() => 0)), { counts: names.map(() => 0), probability: 1 }]]);
  for (let drawn = 0; drawn < maxSeen; drawn++) {
    const next = new Map<string, { counts: number[]; probability: number }>();
    const remainingDeck = deckSize - drawn;
    for (const state of states.values()) {
      let advancingCopies = 0;
      state.counts.forEach((count, index) => { if (count < totalRequired[index]) advancingCopies += copies[index] - count; });
      const stayProbability = Math.max(0, remainingDeck - advancingCopies) / remainingDeck;
      if (stayProbability > 0) addState(next, state.counts, state.probability * stayProbability);
      state.counts.forEach((count, index) => {
        if (count >= totalRequired[index]) return;
        const nextCounts = [...state.counts];
        nextCounts[index] += 1;
        addState(next, nextCounts, state.probability * (copies[index] - count) / remainingDeck);
      });
    }
    states = next;
    const requirement = requirementsAtSeen.get(drawn + 1);
    if (requirement) states = new Map([...states].filter(([, state]) => state.counts.every((count, index) => count >= requirement[index])));
  }
  return Math.max(0, Math.min(1, [...states.values()].reduce((sum, state) => sum + state.probability, 0)));
}

function addState(states: Map<string, { counts: number[]; probability: number }>, counts: number[], probability: number): void {
  const key = stateKey(counts);
  const current = states.get(key);
  if (current) current.probability += probability;
  else states.set(key, { counts, probability });
}

export function computeReserveSequence(mainLines: { name: string; quantity: number }[], cardsByName: ReadonlyMap<string, Card>, steps: ReserveSequenceStep[], startingHandSize: number): ReserveSequenceResult {
  const deckSize = mainLines.reduce((sum, line) => sum + line.quantity, 0);
  const copiesByName = new Map(mainLines.map((line) => [line.name, line.quantity]));
  const probability = sequenceDrawProbability(deckSize, copiesByName, steps, startingHandSize);
  const turns = [...new Set(steps.map((step) => step.turn))].sort((a, b) => a - b);
  let previouslyPlayed = 0;
  const priorSteps: ReserveSequenceStep[] = [];
  const pressure = turns.map((turn) => {
    const current = steps.filter((step) => step.turn === turn);
    const reserveCost = current.reduce((sum, step) => sum + Math.max(0, step.effectiveReserveCost ?? cardsByName.get(step.name)?.cost_reserve ?? 0), 0);
    const handCeiling = startingHandSize + Math.max(0, turn - 1) - previouslyPlayed;
    const cardsNeeded = reserveCost + current.length;
    const floatingPotential = priorSteps.filter((step) => {
      const card = cardsByName.get(step.name);
      return card?.types.includes("ACTION") && /\*\*Floating Memory\*\*/i.test(card.effect ?? "");
    }).length;
    previouslyPlayed += current.length;
    priorSteps.push(...current);
    return { turn, cards: current.map((step) => step.name), reserveCost, handCeiling, cardsNeeded, margin: handCeiling - cardsNeeded, floatingPotential };
  });
  const feasible = pressure.every((point) => point.margin >= 0);
  return { probability, playableProbability: feasible ? probability : 0, feasible, pressure };
}
