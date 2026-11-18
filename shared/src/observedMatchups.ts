import { addRecord, emptyRecord, recordSize, type RecordCount } from './competitionReports';

export interface ObservedMatchupEvent {
  id: number; name: string; date: string; format: string;
  /** Unique participating deck IDs, counted once per event and build. */
  decks: Record<string, number>;
  /** Canonically ordered build IDs, followed by A's wins, losses, ties. Mirrors occur once. */
  rows: [string, string, number, number, number][];
}
export interface ObservedMatchupData { generatedAt: string; builds: Record<string, { name: string; champion: string }>; events: ObservedMatchupEvent[] }
export interface ObservedMatchupRow {
  id: string; matches: number; winRate: number;
  /** Observed per-event extrema, not a confidence interval. */
  eventRange?: { low: number; high: number; events: number };
}
export interface ObservedMatchupScope { from: string; to: string; event: string; format: string }
export const emptyMatchupScope: ObservedMatchupScope = { from: '', to: '', event: '', format: '' };
export function observedMatchupEvents(data: ObservedMatchupData, cluster: string, scope: ObservedMatchupScope) {
  return data.events.filter(e => e.decks[cluster] && (!scope.from || e.date >= scope.from) && (!scope.to || e.date <= scope.to) && (!scope.format || e.format === scope.format));
}
/** Ties receive half credit, matching the historical matchup convention. */
export function observedMatchupCohort(data: ObservedMatchupData, cluster: string, scope: ObservedMatchupScope) {
  const events = observedMatchupEvents(data, cluster, scope).filter(e => !scope.event || String(e.id) === scope.event);
  const record = emptyRecord();
  const opponents = new Map<string, { record: RecordCount; matches: number; byEvent: Map<number, RecordCount> }>();
  for (const event of events) for (const [a, b, wins, losses, ties] of event.rows) {
    if (a !== cluster && b !== cluster) continue;
    const own = a === cluster ? { wins, losses, ties } : { wins: losses, losses: wins, ties };
    const mirror = a === b;
    // Aggregate counts deck outcomes: both decks contribute in a mirror. Opponent cards count physical matches once.
    const outcomes = mirror ? { wins: wins + losses, losses: wins + losses, ties: 2 * ties } : own;
    addRecord(record, outcomes);
    const id = a === cluster ? b : a;
    const row = opponents.get(id) ?? { record: emptyRecord(), matches: 0, byEvent: new Map<number, RecordCount>() };
    const eventRecord = row.byEvent.get(event.id) ?? emptyRecord();
    addRecord(eventRecord, outcomes); row.byEvent.set(event.id, eventRecord);
    addRecord(row.record, outcomes); row.matches += wins + losses + ties; opponents.set(id, row);
  }
  const rate = (r: RecordCount) => recordSize(r) ? (r.wins + r.ties / 2) / recordSize(r) : null;
  return { winRate: rate(record), results: recordSize(record), decks: events.reduce((n, e) => n + e.decks[cluster], 0), events: events.length,
    matchups: [...opponents].filter(([, row]) => row.matches > 0).map(([id, row]): ObservedMatchupRow => {
      const rates = [...row.byEvent.values()].map(rate).filter((value): value is number => value !== null);
      return { id, matches: row.matches, winRate: rate(row.record)!,
        eventRange: { low: Math.min(...rates), high: Math.max(...rates), events: rates.length } };
    }).sort((a, b) => b.matches - a.matches || a.id.localeCompare(b.id)) };
}

/** Adjacent, non-overlapping UTC periods with equal inclusive day counts. */
export function previousMatchupScope(scope: ObservedMatchupScope): ObservedMatchupScope | null {
  const parse = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
    const time = Date.parse(value + 'T00:00:00Z');
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : NaN;
  };
  const from = parse(scope.from), to = parse(scope.to);
  if (scope.event || !Number.isFinite(from) || !Number.isFinite(to) || to < from) return null;
  const day = 86_400_000;
  const start = new Date(from - (to - from + day)).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return null;
  return { ...scope, from: start, to: new Date(from - day).toISOString().slice(0, 10) };
}

/** Union of opponents; absent observations are not a zero score rate. */
export function compareObservedMatchups(current: ReturnType<typeof observedMatchupCohort>, previous: ReturnType<typeof observedMatchupCohort>) {
  const selected = new Map(current.matchups.map(row => [row.id, row]));
  const prior = new Map(previous.matchups.map(row => [row.id, row]));
  return [...new Set([...selected.keys(), ...prior.keys()])].map(id => {
    const currentRow = selected.get(id), previousRow = prior.get(id);
    return { id, current: currentRow ?? null, previous: previousRow ?? null,
      delta: currentRow && previousRow ? (currentRow.winRate - previousRow.winRate) * 100 : null,
      matches: (currentRow?.matches ?? 0) + (previousRow?.matches ?? 0) };
  }).sort((a, b) => b.matches - a.matches || a.id.localeCompare(b.id));
}
