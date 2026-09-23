import { probabilityOfTimedRecipe } from "./comboOdds";
import { naturalCardsSeenByTurn, type PlayOrder } from "./turnToPlay";

export interface EngineBalanceInput { producerCopies: number; producerRequired: number; payoffCopies: number; payoffRequired: number }
export interface EngineBalancePoint { turn: number; payoffSeen: number; onlineProbability: number }
export interface EngineBalanceResult {
  points: EngineBalancePoint[]; onlineProbability: number; payoffStrandedProbability: number;
  setupUnusedProbability: number; payoffGivenSetup: number; bottleneck: "producer" | "payoff" | null;
  bestAdditionalCopy: { role: "producer" | "payoff"; gain: number } | null;
}

export function computeEngineBalance(deckSize: number, startingHandSize: number, input: EngineBalanceInput, setupTurn: number, payoffTurn: number, playOrder: PlayOrder, throughTurn = 8): EngineBalanceResult {
  const producer = { copies: Math.max(0, Math.floor(input.producerCopies)), required: Math.max(1, Math.floor(input.producerRequired)) };
  const payoff = { copies: Math.max(0, Math.floor(input.payoffCopies)), required: Math.max(1, Math.floor(input.payoffRequired)) };
  const setupSeen = Math.min(deckSize, naturalCardsSeenByTurn(setupTurn, startingHandSize, playOrder));
  const payoffSeen = (turn: number) => Math.min(deckSize, naturalCardsSeenByTurn(turn, startingHandSize, playOrder));
  const onlineAt = (turn: number, producerCopies = producer.copies, payoffCopies = payoff.copies) => probabilityOfTimedRecipe(deckSize, [
    { copies: producerCopies, required: producer.required, seen: setupSeen },
    { copies: payoffCopies, required: payoff.required, seen: payoffSeen(turn) },
  ]);
  const producerOdds = probabilityOfTimedRecipe(deckSize, [{ ...producer, seen: setupSeen }]);
  const payoffOdds = probabilityOfTimedRecipe(deckSize, [{ ...payoff, seen: payoffSeen(payoffTurn) }]);
  const onlineProbability = payoffTurn >= setupTurn ? onlineAt(payoffTurn) : 0;
  const gains = (["producer", "payoff"] as const).map((role) => ({
    role,
    gain: role === "producer" ? onlineAt(payoffTurn, producer.copies + 1) - onlineProbability : onlineAt(payoffTurn, producer.copies, payoff.copies + 1) - onlineProbability,
  })).sort((a, b) => b.gain - a.gain);
  const best = producer.copies + payoff.copies < deckSize ? gains[0] : null;
  return {
    points: Array.from({ length: Math.max(1, throughTurn - setupTurn + 1) }, (_, index) => { const turn = setupTurn + index; return { turn, payoffSeen: payoffSeen(turn), onlineProbability: onlineAt(turn) }; }),
    onlineProbability,
    payoffStrandedProbability: Math.max(0, payoffOdds - onlineProbability),
    setupUnusedProbability: Math.max(0, producerOdds - onlineProbability),
    payoffGivenSetup: producerOdds > 0 ? onlineProbability / producerOdds : 0,
    bottleneck: producerOdds === payoffOdds ? null : producerOdds < payoffOdds ? "producer" : "payoff",
    bestAdditionalCopy: best && best.gain > 0 ? best : null,
  };
}
