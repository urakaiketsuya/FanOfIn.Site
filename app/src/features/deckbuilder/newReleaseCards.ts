import type { Card } from "@gatcg/shared";
import { PRODUCTS } from "../products/data";
import { isElementCompatible } from "./useSuggestedBuild";
import { intentCards } from "../../lib/cardIntent";

export interface NewReleaseCombo {
  /** The already-in-the-build card this candidate connects to. */
  with: Card;
  /** Token name / subtype / "Empower" / "named reference" — same `via` vocabulary as Intent Cards. */
  via: string;
}

export interface NewReleaseCard {
  card: Card;
  setName: string;
  setPrefix: string;
  releaseDate: string;
  combos: NewReleaseCombo[];
}

const MAX_RESULTS = 8;

/**
 * Surfaces cards from the most recently released real product (`products/data.ts`, which already
 * excludes promo-only prints) that have a real designed connection — shared token economy, a
 * tribal/subtype reference, Empower, or a named card mention (`cardIntent.ts`'s "validated" tier
 * only) — to a card already in this build, and fit the deck's element identity. A just-released
 * set has no tournament sightings yet, so this can't be ranked by evidence the way the rest of the
 * Deck Builder is (fabricating one was already tried and rejected once, see "Predicted Power" in
 * docs/CALCULATIONS.md); requiring an actual structural connection is what keeps this from being
 * "any card in the right colors," which is too weak a signal to call a recommendation. Deliberately
 * scoped to connections with the build itself (not new-set cards combo-ing with each other) — that
 * wider check surfaced too much to be useful in practice.
 */
export function computeNewReleaseCards(
  catalog: Iterable<Card>,
  deckCards: Card[],
  identityElements: Set<string>,
  includedNames: Set<string>,
): NewReleaseCard[] {
  const today = new Date().toISOString().slice(0, 10);
  const latestProduct = PRODUCTS.filter((p) => p.releaseDate <= today).sort((a, b) => (a.releaseDate < b.releaseDate ? 1 : -1))[0];
  if (!latestProduct || deckCards.length === 0) return [];

  const results: NewReleaseCard[] = [];
  for (const card of catalog) {
    if (card.types.includes("CHAMPION") || includedNames.has(card.name)) continue;
    if (!isElementCompatible(card, identityElements)) continue;
    if (!card.editions.some((edition) => edition.set.prefix === latestProduct.prefix)) continue;

    // Only check against deckCards (a few dozen cards), not the full catalog — intentCards() is
    // O(catalog passed in), and we only care about connections to what's actually in this build.
    const intent = intentCards(card, deckCards);
    const combos: NewReleaseCombo[] = [];
    const seen = new Set<string>();
    for (const match of [...intent.feeds, ...intent.poweredBy]) {
      if (match.tier !== "validated" || seen.has(match.card.name)) continue;
      seen.add(match.card.name);
      combos.push({ with: match.card, via: match.via });
    }
    if (combos.length === 0) continue;
    results.push({ card, setName: latestProduct.name, setPrefix: latestProduct.prefix, releaseDate: latestProduct.releaseDate, combos });
  }
  results.sort((a, b) => b.combos.length - a.combos.length || a.card.name.localeCompare(b.card.name));
  return results.slice(0, MAX_RESULTS);
}
