import { decodeCardLines, type ArchetypeTaxonomyData, type DeckCardIndexData, type DeckPopularityEntry } from './analysis-types';
import type { OmnidexEventSummary } from './omnidex-index-types';
import type { OmnidexPairingsResponse, OmnidexApiError } from './omnidex-types';

export type RecordCount = { wins: number; losses: number; ties: number };
export const emptyRecord = (): RecordCount => ({ wins: 0, losses: 0, ties: 0 });
export const recordSize = (r: RecordCount) => r.wins + r.losses + r.ties;
export const recordPercent = (r: RecordCount) => recordSize(r) ? 100 * r.wins / recordSize(r) : null;
export function addRecord(target: RecordCount, source: RecordCount) { target.wins += source.wins; target.losses += source.losses; target.ties += source.ties; }
/** One completed two-person match; byes, malformed results, and repeated pairing IDs excluded. */
export function competitionMatches(rounds: (OmnidexPairingsResponse | OmnidexApiError)[]) {
  const seen = new Set<string>();
  const result: { a: number; b: number; winner: number | null }[] = [];
  for (const [index, round] of rounds.entries()) if (!('error' in round)) for (const pair of round.pairings) {
    // Omnidex table IDs restart each round; published round/stage values may be objects.
    const id = (value: unknown) => typeof value === 'number' ? value : value && typeof value === 'object' && 'id' in value ? value.id : undefined;
    const key = `${id(round.stage) ?? ''}:${id(round.round) ?? index}:${pair.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (pair.status !== 'complete' || pair.pairing.length !== 2) continue;
    const [a, b] = pair.pairing;
    if (a.id === b.id || a.id <= 0 || b.id <= 0) continue;
    if (a.status === 'tied' && b.status === 'tied') result.push({ a: a.id, b: b.id, winner: null });
    else if (a.status === 'winner' && b.status === 'loser') result.push({ a: a.id, b: b.id, winner: a.id });
    else if (b.status === 'winner' && a.status === 'loser') result.push({ a: a.id, b: b.id, winner: b.id });
  }
  return result;
}
export const matchRecord = (winner: number | null, player: number): RecordCount => ({ wins: +(winner === player), losses: +(winner !== null && winner !== player), ties: +(winner === null) });
export function buildMembership(taxonomy: Pick<ArchetypeTaxonomyData, 'clusters'>) {
  const memberships = new Map<string, Set<string>>();
  for (const build of taxonomy.clusters) for (const id of build.deckIds) {
    const set = memberships.get(id) ?? new Set<string>(); set.add(build.id); memberships.set(id, set);
  }
  return (id: string) => { const set = memberships.get(id); return set?.size === 1 ? [...set][0] : set?.size ? 'ambiguous' : 'unclassified'; };
}
export type ReportValue = { name: string; values: (number | null)[]; counts: number[]; champion?: string; href?: string };
export type SeasonRecordedReport = { seasonId: number; format: string; months: { month: string; events: number; observedEvents: number; decks: number; lists: number }[]; builds: ReportValue[]; cards: { champion: string; lists: number[]; rows: ReportValue[] }[] };
export function seasonRecordedReports(events: OmnidexEventSummary[], entries: DeckPopularityEntry[], index: DeckCardIndexData, taxonomy: ArchetypeTaxonomyData): SeasonRecordedReport[] {
  const membership = buildMembership(taxonomy);
  const lists = new Map(index.decks.map(d => [d.deckId, d]));
  const sightings = new Map(entries.map(e => [e.deckId, e]));
  const byEvent = new Map<number, DeckPopularityEntry[]>();
  for (const entry of sightings.values()) { const group = byEvent.get(entry.eventId) ?? []; group.push(entry); byEvent.set(entry.eventId, group); }
  const groups = new Map<string, OmnidexEventSummary[]>();
  for (const event of new Map(events.map(e => [e.id, e])).values()) {
    if (event.status !== 'complete' || !event.seasonId || !event.format || /team/i.test(event.format) || !Number.isFinite(Date.parse(event.date))) continue;
    const key = JSON.stringify([event.seasonId, event.format]); const group = groups.get(key) ?? []; group.push(event); groups.set(key, group);
  }
  const builds = new Map(taxonomy.clusters.map(b => [b.id, b]));
  return [...groups.values()].map(group => {
    const months = [...new Set(group.map(e => e.date.slice(0, 7)))].sort().slice(-2).map(month => {
      const candidates = group.filter(e => e.date.startsWith(month));
      const recorded = candidates.flatMap(e => byEvent.get(e.id) ?? []);
      const buildCounts = new Map<string, number>(), championLists = new Map<string, number>(), cards = new Map<string, Map<string, number>>();
      let usable = 0;
      for (const entry of recorded) {
        const id = membership(entry.deckId); buildCounts.set(id, (buildCounts.get(id) ?? 0) + 1);
        const deck = lists.get(entry.deckId); if (!deck) continue;
        const sections = [deck.main, deck.material].map(section => decodeCardLines(section, index.cardNames));
        if (!sections.every(section => section.length && section.every(c => c.name?.trim() && Number.isInteger(c.quantity) && c.quantity > 0))) continue;
        usable++;
        const champion = entry.championName ?? 'Unknown champion';
        championLists.set(champion, (championLists.get(champion) ?? 0) + 1);
        const counts = cards.get(champion) ?? new Map<string, number>();
        for (const name of new Set(sections.flat().map(c => c.name))) counts.set(name, (counts.get(name) ?? 0) + 1);
        cards.set(champion, counts);
      }
      return { month, events: candidates.length, observedEvents: candidates.filter(e => byEvent.has(e.id)).length, decks: recorded.length, lists: usable, buildCounts, championLists, cards };
    });
    const buildRows = [...new Set(months.flatMap(m => [...m.buildCounts.keys()]))].map(id => ({ name: builds.get(id)?.name ?? (id === 'ambiguous' ? 'Ambiguous assignment' : 'Unclassified'), champion: builds.get(id)?.championName, href: builds.has(id) ? `/archetypes/${id}` : undefined, counts: months.map(m => m.buildCounts.get(id) ?? 0), values: months.map(m => m.decks ? 100 * (m.buildCounts.get(id) ?? 0) / m.decks : null) })).sort((a, b) => b.counts.reduce((s, n) => s + n, 0) - a.counts.reduce((s, n) => s + n, 0) || a.name.localeCompare(b.name));
    const cards = [...new Set(months.flatMap(m => [...m.championLists.keys()]))].sort().map(champion => ({ champion, lists: months.map(m => m.championLists.get(champion) ?? 0), rows: [...new Set(months.flatMap(m => [...(m.cards.get(champion)?.keys() ?? [])]))].map(name => ({ name, counts: months.map(m => m.cards.get(champion)?.get(name) ?? 0), values: months.map(m => m.championLists.get(champion) ? 100 * (m.cards.get(champion)?.get(name) ?? 0) / m.championLists.get(champion)! : null) })).filter(r => r.values.length === 2 && r.values.every(v => v !== null) && r.values[0] !== r.values[1]).sort((a, b) => Math.abs(b.values[1]! - b.values[0]!) - Math.abs(a.values[1]! - a.values[0]!) || a.name.localeCompare(b.name)).slice(0, 6) }));
    return { seasonId: group[0].seasonId!, format: group[0].format, months: months.map(({ buildCounts: _b, championLists: _c, cards: _d, ...month }) => month), builds: buildRows, cards };
  });
}
export type CompetitionBattle = { format: string; periods: { from: string; to: string; events: number; pairingEvents: number; matches: number; identified: number }[]; rows: { a: string; b: string; records: RecordCount[] }[] };
export type CompetitionPlayer = { playerId: number; formats: { format: string; record: RecordCount; events: number; builds: { name: string; champion: string | null; href?: string; record: RecordCount }[]; opponents: { name: string; record: RecordCount }[]; unidentifiedOpponents: number; evolution: { eventId: number; date: string; champion: string | null; build: string; deckId: string }[]; changes: { name: string; section: string; before: number; after: number }[] | null }[] };
export type CompetitionPlace = { hostId: number; formats: { format: string; events: number; rosterEvents: number; entries: number; people: number; returning: number; attendance: { eventId: number; date: string; count: number }[]; fieldEvents: number; fieldEntries: number; champions: { name: string; count: number; events: number }[] }[] };
export type CompetitionTeam = { eventId: number; teamName: string; players: { id: number; champion: string | null }[]; record: RecordCount | null; distinct: number | null };
export type CompetitionData<T> = { generatedAt: string; from: string; to: string; rows: T[] };

/** Local versus other known physical host locations, with identical format and date scope. */
export function regionalFieldReport(events: OmnidexEventSummary[], local: (event: OmnidexEventSummary) => boolean) {
  const eligible = [...new Map(events.map(e => [e.id, e])).values()].filter(e => e.status === 'complete' && !/team/i.test(e.format) && e.format && e.setting === 'physical' && e.hostCountry && e.hostCountry !== '??' && Number.isFinite(Date.parse(e.date)));
  const to = eligible.map(e => e.date.slice(0, 10)).sort().at(-1);
  if (!to) return null;
  const from = new Date(Date.parse(to + 'T00:00:00Z') - 89 * 86400000).toISOString().slice(0, 10);
  const recent = eligible.filter(e => e.date.slice(0, 10) >= from);
  const formats = [...new Set(recent.filter(local).map(e => e.format))].sort().map(format => {
    const scopes = [true, false].map(isLocal => {
      const selected = recent.filter(e => e.format === format && local(e) === isLocal);
      const fields = selected.filter(e => {
        const f = e.fieldComposition;
        return f && Number.isInteger(f.entrants) && f.entrants > 0 && f.champions.length && new Set(f.champions.map(c => c.name)).size === f.champions.length && f.champions.every(c => c.name && Number.isInteger(c.count) && c.count > 0) && f.champions.reduce((s, c) => s + c.count, 0) === f.entrants;
      });
      const counts = new Map<string, number>(), recurrence = new Map<string, number>();
      for (const e of fields) for (const c of e.fieldComposition!.champions) { counts.set(c.name, (counts.get(c.name) ?? 0) + c.count); recurrence.set(c.name, (recurrence.get(c.name) ?? 0) + 1); }
      return { events: selected.length, complete: fields.length, entries: fields.reduce((s, e) => s + e.fieldComposition!.entrants, 0), counts, recurrence };
    });
    const rows = [...scopes[0].counts.keys()].map(name => ({ name, counts: scopes.map(s => s.counts.get(name) ?? 0), values: scopes.map(s => s.entries ? 100 * (s.counts.get(name) ?? 0) / s.entries : null), events: scopes[0].recurrence.get(name)! })).sort((a, b) => b.counts[0] - a.counts[0] || a.name.localeCompare(b.name));
    return { format, scopes, rows };
  });
  return { from, to, formats };
}
