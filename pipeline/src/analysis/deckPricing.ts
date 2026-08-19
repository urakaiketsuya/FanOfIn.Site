/**
 * Sum of known card prices for a card-count map (main+material — same deck-identity convention
 * used everywhere else in this codebase; sideboard excluded). Missing-price cards are simply
 * excluded from the sum, not treated as $0 — `null` means no card in the map had a known price
 * at all, not "this deck is free."
 */
export function computeDeckPrice(cardCounts: Map<string, number>, priceByName: Map<string, number>): number | null {
  let total = 0;
  let sawAny = false;
  for (const [name, qty] of cardCounts) {
    const price = priceByName.get(name);
    if (price === undefined) continue;
    total += price * qty;
    sawAny = true;
  }
  return sawAny ? total : null;
}
