import { DEFAULT_STARTING_HAND_SIZE, earliestReserveCostTurn } from "../../lib/turnToPlay";
import { probabilityAtLeast } from "./synergyReadiness";

export interface CardPlayOdds {
  probability: number;
  turn: number;
  cardsSeen: number;
}

/**
 * Chance to see at least one copy of a Main Deck card by the first turn its Reserve cost can be
 * paid. This deliberately models only the two facts the card row can prove: copies in the current
 * deck and printed Reserve cost. It does not guess champion-level requirements, mulligans, draw
 * effects, or resources already spent on other cards.
 */
export function computeCardPlayOdds(
  deckSize: number,
  copies: number,
  reserveCost: number | null,
  startingHandSize = DEFAULT_STARTING_HAND_SIZE,
): CardPlayOdds | null {
  if (deckSize <= 0 || copies <= 0) return null;
  const turn = earliestReserveCostTurn(reserveCost, startingHandSize);
  const cardsSeen = Math.min(deckSize, startingHandSize + Math.max(0, turn - 1));
  return {
    probability: probabilityAtLeast(deckSize, Math.min(copies, deckSize), cardsSeen, 1),
    turn,
    cardsSeen,
  };
}
