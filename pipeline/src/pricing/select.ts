import { priceKey, type CardPriceEntry, type PriceQuote } from '@gatcg/shared';
import type { TcgcsvGroup, TcgcsvPrice, TcgcsvProduct } from './tcgcsv.js';

const valid = (value: number | null) => value !== null && Number.isFinite(value) && value >= 0;
const amount = (value: number | null) => valid(value) ? value : null;
function quote(row: TcgcsvPrice): PriceQuote {
  return { low: amount(row.lowPrice), mid: amount(row.midPrice), high: amount(row.highPrice), market: amount(row.marketPrice) };
}
function finishQuote(rows: TcgcsvPrice[], finish: string): PriceQuote | null {
  const matches = rows.filter(row => row.subTypeName === finish).map(quote);
  // A malformed or empty duplicate cannot hide a valid market quote. Stable on input reorder.
  matches.sort((a, b) => (a.market ?? Infinity) - (b.market ?? Infinity) || (a.low ?? Infinity) - (b.low ?? Infinity) || (a.mid ?? Infinity) - (b.mid ?? Infinity) || (a.high ?? Infinity) - (b.high ?? Infinity));
  return matches[0] ?? null;
}
function market(entry: CardPriceEntry): number {
  return Math.min(entry.normal?.market ?? Infinity, entry.foil?.market ?? Infinity);
}
/** One product owns both finishes and the outbound link. Prefer the ordinary named product over
 * suffixed collector variants sharing its number; never merge a Curio quote into its base product. */
function compare(a: CardPriceEntry, b: CardPriceEntry): number {
  const variant = (entry: CardPriceEntry) => /\s+\([^)]*\)$/.test(entry.cardName) ? 1 : 0;
  return variant(a) - variant(b)
    || Number(a.normal?.market == null) - Number(b.normal?.market == null)
    || market(a) - market(b)
    || a.tcgplayerProductId - b.tcgplayerProductId;
}
export function selectGroupPrices(group: Pick<TcgcsvGroup, 'abbreviation'>, products: TcgcsvProduct[], rows: TcgcsvPrice[]): Record<string, CardPriceEntry> {
  const byProduct = new Map<number, TcgcsvPrice[]>();
  for (const row of rows) byProduct.set(row.productId, [...(byProduct.get(row.productId) ?? []), row]);
  const selected = new Map<string, CardPriceEntry>();
  for (const product of products) {
    const number = product.extendedData.find(field => field.name === 'Number')?.value.trim();
    if (!number) continue;
    const productRows = byProduct.get(product.productId) ?? [];
    const entry: CardPriceEntry = { cardName: product.name, tcgplayerProductId: product.productId, tcgplayerUrl: product.url,
      normal: finishQuote(productRows, 'Normal'), foil: finishQuote(productRows, 'Foil') };
    const key = priceKey(group.abbreviation, number);
    const previous = selected.get(key);
    if (!previous || compare(entry, previous) < 0) selected.set(key, entry);
  }
  return Object.fromEntries([...selected].sort(([a], [b]) => a.localeCompare(b)));
}
