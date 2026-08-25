import type { CardDeckReferencesData, ShoutAtYourDecksDeck, ShoutAtYourDecksDeckSummary } from "@gatcg/shared";
import { resolveCard, type CardSignature } from "../../cards/catalog.js";

/** How many real decks to link out to per card — this is a browsing convenience, not a stat, so no
 * min-sample-size gate applies (unlike every other ShoutAtYourDecks analytic in this directory):
 * each entry already is one real deck, not an aggregate needing enough evidence to trust. */
const MAX_REFERENCES_PER_CARD = 8;

function deckSummary(deck: ShoutAtYourDecksDeck): ShoutAtYourDecksDeckSummary {
  return {
    id: deck.id,
    url: deck.url,
    title: deck.title,
    author: deck.author,
    champion: deck.champion,
    priceLow: deck.priceLow,
    materialCount: deck.materialCount,
    mainCount: deck.mainCount,
    sideCount: deck.sideCount,
    fetchedAt: deck.fetchedAt,
  };
}

/**
 * Per card, a capped list of real decks that include it — for linking out to the actual
 * ShoutAtYourDecks.com deck page, not for any aggregate stat. Checks all three sections
 * (material+main+sideboard), unlike the deck-identity convention used elsewhere in this codebase
 * (main+material only) — the question here is just "does this specific real deck contain the
 * card," not "is this part of the deck's identity." Deliberately unordered (capped in whatever
 * order `decks` is iterated) — ShoutAtYourDecks doesn't record when a deck was actually built or
 * last updated, so there's no real basis to claim these are the "most recent" ones; see
 * docs/CALCULATIONS.md.
 */
export function computeCardDeckReferences(decks: ShoutAtYourDecksDeck[], cardIndex: Map<string, CardSignature>): CardDeckReferencesData {
  const byCardName: Record<string, ShoutAtYourDecksDeckSummary[]> = {};

  for (const deck of decks) {
    const names = new Set<string>();
    for (const line of [...deck.materialDeck, ...deck.mainDeck, ...deck.sideDeck]) {
      names.add(resolveCard(cardIndex, line.name)?.name ?? line.name);
    }
    for (const name of names) {
      const list = byCardName[name] ?? (byCardName[name] = []);
      if (list.length < MAX_REFERENCES_PER_CARD) list.push(deckSummary(deck));
    }
  }

  return { generatedAt: new Date().toISOString(), decksConsidered: decks.length, byCardName };
}
