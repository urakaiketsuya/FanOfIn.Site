import { naturalCardsSeenByTurn, type PlayOrder } from "./turnToPlay";

export interface LevelRunwayPoint { turn: number; handCeiling: number; cardsNeeded: number; margin: number }
export interface LevelRunwayResult { points: LevelRunwayPoint[]; recoveryTurn: number | null }

/** Conservative hand-capacity companion to the rules-aware level goal calculator. */
export function computeLevelRunway(startingHandSize: number, playOrder: PlayOrder, targetTurn: number, followUpReserve: number, throughTurn = 8): LevelRunwayResult {
  const reserve = Math.max(0, Math.floor(followUpReserve));
  const cardsNeeded = reserve + 1;
  const points = Array.from({ length: Math.max(1, throughTurn) }, (_, index) => {
    const turn = index + 1;
    const handCeiling = naturalCardsSeenByTurn(turn, startingHandSize, playOrder);
    return { turn, handCeiling, cardsNeeded, margin: handCeiling - cardsNeeded };
  });
  return { points, recoveryTurn: points.find((point) => point.turn >= targetTurn && point.margin >= 0)?.turn ?? null };
}
