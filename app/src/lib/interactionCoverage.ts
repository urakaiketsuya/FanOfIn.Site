import { probabilityOfRecipe } from "./comboOdds";
import { naturalCardsSeenByTurn, type PlayOrder } from "./turnToPlay";

export interface InteractionCoverageResult { seen: number; mainCopies: number; postboardCopies: number; preboardProbability: number; postboardProbability: number; gain: number }

export function computeInteractionCoverage(deckSize: number, startingHandSize: number, criticalTurn: number, playOrder: PlayOrder, mainCopies: number, sideboardCopies: number): InteractionCoverageResult {
  const seen = Math.min(deckSize, naturalCardsSeenByTurn(criticalTurn, startingHandSize, playOrder));
  const main = Math.max(0, Math.min(deckSize, Math.floor(mainCopies)));
  const postboard = Math.max(0, Math.min(deckSize, main + Math.max(0, Math.floor(sideboardCopies))));
  const preboardProbability = probabilityOfRecipe(deckSize, [{ copies: main, required: 1 }], seen);
  const postboardProbability = probabilityOfRecipe(deckSize, [{ copies: postboard, required: 1 }], seen);
  return { seen, mainCopies: main, postboardCopies: postboard, preboardProbability, postboardProbability, gain: postboardProbability - preboardProbability };
}
