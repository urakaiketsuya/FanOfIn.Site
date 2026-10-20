/** One resolved card, with explicit board inputs; no activation or survival prediction. */
export function calculateDefenseScenario(windRevealed: number, damagePerEvent: number, events: number, opposingAllies: number, damageTaken: number) {
  const count = (n: number) => Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  const wind = count(windRevealed), damage = count(damagePerEvent), hits = count(events);
  const destiny = hits > 0 ? damage : 0;
  const recovery = 3 + 3 * Math.min(2, count(opposingAllies));
  return {
    breezePerEvent: Math.min(wind, damage),
    breezeTotal: Math.min(wind, damage) * hits,
    destinyPrevented: destiny,
    destinyTax: destiny >= 7 ? 2 : 0,
    recoveryCapacity: recovery,
    recovered: Math.min(count(damageTaken), recovery),
  };
}
