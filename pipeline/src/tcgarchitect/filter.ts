import type { TcgArchitectDeck } from "@gatcg/shared";
import { config } from "../config.js";

/**
 * The site's own discover listing already skews toward complete decks (its `meta.min_cards`
 * echoes 60), but that's not strictly enforced — real listing pages have contained decks with a
 * Main deck under 60 (e.g. an in-progress "Untitled Deck"). Same identity floor as ShoutAtYourDecks/
 * Sleeved (see docs/CALCULATIONS.md) applied explicitly rather than trusting the API's default.
 */
export function shouldKeepTcgArchitectDeck(deck: TcgArchitectDeck): boolean {
  return deck.mainCount !== null && deck.mainCount >= config.tcgaMinMainDeckSize;
}
