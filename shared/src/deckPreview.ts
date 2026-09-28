import type { OmnidexDecklist, OmnidexDecklistCardLine } from "./omnidex-types";

/** A bounded sample of the published Main deck, not a recommended core or full list. */
export function deckPreviewCards(deck: OmnidexDecklist): OmnidexDecklistCardLine[] {
  const quantities = new Map<string, number>();
  for (const line of deck.main) {
    if (line.quantity > 0) quantities.set(line.card, (quantities.get(line.card) ?? 0) + line.quantity);
  }
  return [...quantities].map(([card, quantity]) => ({ card, quantity }))
    .sort((a, b) => b.quantity - a.quantity || a.card.localeCompare(b.card)).slice(0, 3);
}
