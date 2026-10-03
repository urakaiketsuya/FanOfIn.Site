/** Unknown prices stay last in either direction; ties remain alphabetical. */
export function compareCardPrices(a: string, b: string, prices: ReadonlyMap<string, number>, descending = false): number {
  const x = prices.get(a), y = prices.get(b);
  const knownX = x !== undefined && Number.isFinite(x) && x >= 0;
  const knownY = y !== undefined && Number.isFinite(y) && y >= 0;
  if (knownX !== knownY) return knownX ? -1 : 1;
  return (knownX && knownY ? (x! - y!) * (descending ? -1 : 1) : 0) || a.localeCompare(b);
}
