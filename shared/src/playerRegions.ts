import type { OmnidexEventSummary, OmnidexPlayerSummary } from './omnidex-index-types';
import type { StoreRecord } from './stores';
import { usRegionForEvent } from './usRegions';

export interface PlayerRegionAssignment {
  region: string | null;
  basis: 'local' | 'events' | 'insufficient' | 'mixed';
  supportingDays: number;
  observedDays: number;
}

/** Inferred play region, never a residence claim. Uses only the preceding 365 days. */
export function assignUSPlayerRegions(
  players: readonly OmnidexPlayerSummary[],
  events: readonly OmnidexEventSummary[],
  stores: readonly StoreRecord[],
  asOf: string,
): Map<number, PlayerRegionAssignment> {
  const end = Date.parse(asOf), start = end - 365 * 86400000;
  const result = new Map<number, PlayerRegionAssignment>();
  if (!Number.isFinite(end)) return result;
  const storesById = new Map(stores.map(s => [s.id, s]));
  // A current store address cannot safely fill historical gaps when its host moved areas.
  const hostRegions = new Map<number, Set<string>>();
  for (const e of events) {
    if (e.hostCountry !== 'US' || e.setting !== 'physical') continue;
    const region = usRegionForEvent(e);
    if (region === 'us-unknown') continue;
    const regions = hostRegions.get(e.hostId) ?? new Set<string>();
    regions.add(region); hostRegions.set(e.hostId, regions);
  }
  const evidence = new Map<number, { region: string; day: string; local: boolean }>();
  for (const e of events) {
    const date = Date.parse(e.date);
    if (e.hostCountry !== 'US' || e.setting !== 'physical' || e.status !== 'complete' || !Number.isFinite(date) || date < start || date > end) continue;
    let region = usRegionForEvent(e);
    const store = storesById.get(e.hostId);
    if (region === 'us-unknown' && store?.country === 'US' && store.kind === 'store') {
      const fallback = usRegionForEvent({hostAddress: store.address, setting: 'physical'});
      const known = hostRegions.get(e.hostId);
      if (!known || (known.size === 1 && known.has(fallback))) region = fallback;
    }
    if (region === 'us-unknown') continue;
    const local = (e.category === 'regular' || e.category === 'store-championships') && store?.kind !== 'venue'
      && !/worlds|national|regional|ascent|qualifier|convention|expo/i.test(e.name);
    evidence.set(e.id, { region, day: e.date.slice(0,10), local });
  }
  for (const player of players) {
    if (player.country.toUpperCase() !== 'US') continue;
    const observed = [...new Set(player.eventIds)].flatMap(id => evidence.has(id) ? [evidence.get(id)!] : []);
    const local = observed.filter(e => e.local);
    const localDays = new Set(local.map(e => e.day)).size;
    const basis = localDays >= 3 ? 'local' : 'events';
    const selected = basis === 'local' ? local : observed;
    // Multiple rounds/events on one day are one vote. Cross-region dates are ambiguous.
    const byDay = new Map<string, Set<string>>();
    for (const e of selected) { const regions = byDay.get(e.day) ?? new Set<string>(); regions.add(e.region); byDay.set(e.day, regions); }
    const counts = new Map<string, number>();
    for (const regions of byDay.values()) if (regions.size === 1) {
      const region = [...regions][0]; counts.set(region, (counts.get(region) ?? 0) + 1);
    }
    const ranked = [...counts].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]));
    const [region, days] = ranked[0] ?? [null, 0];
    const sufficient = days >= 3;
    const clear = sufficient && days / byDay.size >= (basis === 'local' ? 0.6 : 0.75) && days > (ranked[1]?.[1] ?? 0);
    result.set(player.id, { region: clear ? region : null, basis: clear ? basis : sufficient ? 'mixed' : 'insufficient', supportingDays: days, observedDays: byDay.size });
  }
  return result;
}
