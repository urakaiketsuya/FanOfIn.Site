import type { SleevedDeck } from "@gatcg/shared";
import { config } from "../config.js";

/** Same deck-identity floor as ShoutAtYourDecks' `shouldKeepDeck` — see docs/CALCULATIONS.md.
 * No title-junk filter needed here: Sleeved has nothing like ShoutAtYourDecks' "Untitled Deck - Copy"
 * scratch-duplicate problem. */
export function shouldKeepSleevedDeck(deck: SleevedDeck): boolean {
  return deck.mainCount !== null && deck.mainCount >= config.sleevedMinMainDeckSize;
}
