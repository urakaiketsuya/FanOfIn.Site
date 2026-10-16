import type { OmnidexEventSummary, OmnidexVenueGeocode } from './omnidex-index-types';

export interface StoreOverride {
  kind?: 'store' | 'venue';
  name?: string;
  address?: string;
  country?: string;
  region?: string;
  coordinates?: { lat: number; lng: number } | null;
  /** Evidence for a curated correction or classification. */
  evidence: string;
}
export interface StoreRecord {
  id: number;
  name: string;
  aliases: string[];
  address: string;
  country: string;
  region?: string;
  kind: 'store' | 'venue' | 'unclassified';
  coordinates?: { lat: number; lng: number };
  addressEventId: number;
  addressDate: string;
  lastEventDate: string;
  eventCount: number;
  weeklyEvidence?: { id: number; date: string }[];
  recentEvents: { id: number; name: string; date: string }[];
}
export interface StoreDirectory { generatedAt: string; stores: StoreRecord[] }
export function validStoreCoordinates(point: { lat: number; lng: number }): boolean {
  return Number.isFinite(point.lat) && Number.isFinite(point.lng) && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180 && !(point.lat === 0 && point.lng === 0);
}
export function buildStoreDirectory(events: readonly OmnidexEventSummary[], geocodes: readonly OmnidexVenueGeocode[], overrides: Record<string, StoreOverride> = {}): StoreRecord[] {
  const hosts = new Map<number, OmnidexEventSummary[]>();
  for (const event of events) {
    if (!event.hostId || event.setting !== 'physical' || event.status !== 'complete' || !Number.isFinite(Date.parse(event.date))) continue;
    const group = hosts.get(event.hostId) ?? [];
    group.push(event); hosts.set(event.hostId, group);
  }
  const points = new Map(geocodes.map(point => [point.hostId, point]));
  return [...hosts].map(([id, group]) => {
    group.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    const latest = group[0];
    const addressEvent = group.find(event => event.hostAddress.trim()) ?? latest;
    const correction = overrides[id];
    const address = correction?.address ?? addressEvent.hostAddress;
    const point = points.get(id);
    const addresses = new Set(group.map(e => e.hostAddress.trim()).filter(Boolean));
    // Legacy coordinates have no address provenance: only retain them for unchanged addresses.
    const compatible = point && (point.address ? point.address === address : addresses.size === 1 && address === addressEvent.hostAddress);
    const coordinates = correction?.coordinates !== undefined ? correction.coordinates : compatible ? point : undefined;
    return {
      id, name: correction?.name ?? latest.hostName, aliases: [...new Set(group.map(e => e.hostName))],
      address, country: correction?.country ?? addressEvent.hostCountry, region: correction?.region,
      kind: correction?.kind ?? 'unclassified',
      ...(coordinates && validStoreCoordinates(coordinates) ? { coordinates: { lat: coordinates.lat, lng: coordinates.lng } } : {}),
      addressEventId: addressEvent.id, addressDate: addressEvent.date, lastEventDate: latest.date,
      eventCount: new Set(group.map(e => e.id)).size,
      weeklyEvidence: [...new Map(group.filter(e => e.category === 'regular' && e.hostAddress === address && !/release|launch|championship|regional|ascent|worlds|national|qualifier|celebration/i.test(e.name)).map(e => [e.id, { id: e.id, date: e.date }])).values()].slice(0, 100),
      recentEvents: [...new Map(group.map(e => [e.id, { id: e.id, name: e.name, date: e.date }])).values()].slice(0, 12),
    } satisfies StoreRecord;
  }).sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
}
export function normalizeStoreSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
export function storeMatches(store: StoreRecord, query: string): boolean {
  const text = normalizeStoreSearch([store.name, ...store.aliases, store.address, store.country, store.region ?? ''].join(' '));
  return normalizeStoreSearch(query).split(/\s+/).every(word => text.includes(word));
}
export function storeDistanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function filterStores(stores: readonly StoreRecord[], filters: { query: string; country: string; region: string; days: number; radius: number; position?: { lat: number; lng: number } }, now = Date.now()): { store: StoreRecord; distance?: number }[] {
  return stores.filter(s => storeMatches(s, filters.query) && (!filters.country || s.country === filters.country) && (!filters.region || s.region === filters.region) && (!filters.days || s.recentEvents.some(event => Date.parse(event.date) <= now && Date.parse(event.date) >= now - filters.days * 86400000)))
    .map(store => ({ store, distance: filters.position && store.coordinates ? storeDistanceKm(filters.position, store.coordinates) : undefined }))
    .filter(row => !filters.position || !filters.radius || (row.distance !== undefined && row.distance <= filters.radius))
    .sort((a, b) => filters.position ? (a.distance ?? Infinity) - (b.distance ?? Infinity) || a.store.name.localeCompare(b.store.name) : a.store.name.localeCompare(b.store.name));
}

/** Rolling four-week estimates; never creates synthetic Omnidex event IDs. */
export function upcomingStoreEvents(store: StoreRecord, now = Date.now()): { date: string; sourceEventId: number }[] {
  const day = 86400000;
  const evidence = (store.weeklyEvidence ?? []).filter(e => {
    const time = Date.parse(e.date);
    return time <= now && time >= now - 56 * day;
  }).sort((a, b) => b.date.localeCompare(a.date));
  const result: { date: string; sourceEventId: number }[] = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    const matches = [...new Map(evidence.filter(e => new Date(e.date).getUTCDay() === weekday).map(e => [e.date.slice(0, 10), e])).values()];
    if (matches.length < 3) continue;
    const latest = matches[0];
    const latestTime = Date.parse(latest.date);
    // Require a recent occurrence and consecutive weeks, not a monthly series.
    if (now - latestTime > 21 * day || !matches.some(e => Math.abs(latestTime - Date.parse(e.date) - 7 * day) < day / 8)) continue;
    for (let time = latestTime + 7 * day; time <= now + 28 * day; time += 7 * day) {
      if (time > now) result.push({ date: new Date(time).toISOString(), sourceEventId: latest.id });
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}
