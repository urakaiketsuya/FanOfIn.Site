import type { Card } from "./api-types.js";
import type { CollectionEntry } from "./collection-types.js";
import { priceKey, type CardPriceEntry } from "./pricing.js";

/** Market estimate only: finish/condition are not tracked in collection inventory. */
export function computeCollectionValue(entries: CollectionEntry[], cards: Card[], prices: ReadonlyMap<string, CardPriceEntry>) {
  const valid = (value: number | null | undefined): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
  const market = (price: CardPriceEntry | undefined) => valid(price?.normal?.market) ? price.normal.market : valid(price?.foil?.market) ? price.foil.market : undefined;
  const normalize = (name: string) => name.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
  const cheapest = new Map<string, number>();
  for (const price of prices.values()) {
    const value = market(price);
    const name = normalize(price.cardName);
    if (value !== undefined && value < (cheapest.get(name) ?? Infinity)) cheapest.set(name, value);
  }
  const byUuid = new Map(cards.map(card => [card.uuid, card]));
  const cardPrices = new Map<string, number>();
  for (const card of cards) {
    for (const edition of card.editions) {
      const value = market(prices.get(priceKey(edition.set.prefix, edition.collector_number)));
      if (value !== undefined && value < (cardPrices.get(card.uuid) ?? Infinity)) cardPrices.set(card.uuid, value);
    }
  }
  let cents = 0, ownedCopies = 0, pricedCopies = 0, unspecifiedCopies = 0;
  for (const entry of entries) {
    const quantity = entry.ownedQuantity;
    if (quantity <= 0) continue;
    ownedCopies += quantity;
    const card = byUuid.get(entry.cardUuid);
    const edition = entry.editionUuid ? card?.editions.find(item => item.uuid === entry.editionUuid) : undefined;
    const set = edition?.set.prefix ?? entry.setPrefix;
    const number = edition?.collector_number ?? entry.collectorNumber;
    // Never substitute a cheaper printing for an unpriced exact printing.
    const value = entry.editionUuid
      ? (set && number ? market(prices.get(priceKey(set, number))) : undefined)
      : (cardPrices.get(entry.cardUuid) ?? cheapest.get(normalize(card?.name ?? entry.cardName)));
    if (!entry.editionUuid) unspecifiedCopies += quantity;
    if (value !== undefined) { cents += Math.round(value * 100) * quantity; pricedCopies += quantity; }
  }
  return { total: pricedCopies || !ownedCopies ? cents / 100 : null, ownedCopies, pricedCopies, missingCopies: ownedCopies - pricedCopies, unspecifiedCopies };
}
