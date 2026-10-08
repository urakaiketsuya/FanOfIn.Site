import type { Card } from "./api-types.js";
import type { CollectionEntry } from "./collection-types.js";
import { priceKey, type CardPriceEntry } from "./pricing.js";

/**
 * TCGplayer's standard Marketplace seller fees: 10.75% commission plus 2.5%
 * transaction processing. The fixed $0.30 transaction fee is intentionally excluded:
 * it applies once per checkout, while a collection cannot tell us how cards would be
 * grouped into orders (or their shipping/tax amounts).
 */
export const TCGPLAYER_MARKETPLACE_NET_RATE = 1 - 0.1075 - 0.025;

/** Market estimate adjusted to likely standard-Marketplace seller proceeds. Finish is respected; unspecified finish retains the normal-price estimate. */
export function computeCollectionValue(entries: CollectionEntry[], cards: Card[], prices: ReadonlyMap<string, CardPriceEntry>) {
  const valid = (value: number | null | undefined): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
  const market = (price: CardPriceEntry | undefined, foil = false) => { const quote = foil ? price?.foil : price?.normal; return valid(quote?.market) ? quote.market : undefined; };
  const normalize = (name: string) => name.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
  const cheapest = new Map<string, number>();
  for (const foil of [false, true]) for (const price of prices.values()) {
    const value = market(price, foil);
    const name = `${foil}:${normalize(price.cardName)}`;
    if (value !== undefined && value < (cheapest.get(name) ?? Infinity)) cheapest.set(name, value);
  }
  const byUuid = new Map(cards.map(card => [card.uuid, card]));
  const cardPrices = new Map<string, number>();
  for (const card of cards) {
    for (const foil of [false, true]) for (const edition of card.editions) {
      const value = market(prices.get(priceKey(edition.set.prefix, edition.collector_number)), foil);
      if (value !== undefined && value < (cardPrices.get(`${foil}:${card.uuid}`) ?? Infinity)) cardPrices.set(`${foil}:${card.uuid}`, value);
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
      ? (set && number ? market(prices.get(priceKey(set, number)), entry.finish === "foil") : undefined)
      : (cardPrices.get(`${entry.finish === "foil"}:${entry.cardUuid}`) ?? cheapest.get(`${entry.finish === "foil"}:${normalize(card?.name ?? entry.cardName)}`));
    if (!entry.editionUuid) unspecifiedCopies += quantity;
    if (value !== undefined) { cents += Math.round(value * 100) * quantity; pricedCopies += quantity; }
  }
  const marketTotal = pricedCopies || !ownedCopies ? cents / 100 : null;
  const total = marketTotal === null ? null : Math.round(marketTotal * TCGPLAYER_MARKETPLACE_NET_RATE * 100) / 100;
  const feeEstimate = marketTotal === null || total === null ? null : Math.round((marketTotal - total) * 100) / 100;
  return { total, marketTotal, feeEstimate, ownedCopies, pricedCopies, missingCopies: ownedCopies - pricedCopies, unspecifiedCopies };
}
