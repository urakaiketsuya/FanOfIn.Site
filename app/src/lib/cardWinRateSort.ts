export function compareCardWinRates(a: string, b: string, rates: ReadonlyMap<string, number>): number {
  return (rates.get(b) ?? -1) - (rates.get(a) ?? -1) || a.localeCompare(b);
}
