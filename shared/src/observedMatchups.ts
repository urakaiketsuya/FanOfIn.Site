import { addRecord, emptyRecord, recordSize, type RecordCount } from './competitionReports';

export interface ObservedMatchupEvent {
  id: number; name: string; date: string; format: string;
  /** Unique participating deck IDs, counted once per event and build. */
  decks: Record<string, number>;
  /** Canonically ordered build IDs, followed by A's wins, losses, ties. Mirrors occur once. */
  rows: [string, string, number, number, number][];
}
export interface ObservedMatchupData { generatedAt: string; builds: Record<string, { name: string; champion: string }>; events: ObservedMatchupEvent[] }
export interface ObservedMatchupScope { from: string; to: string; event: string; format: string }
export const emptyMatchupScope: ObservedMatchupScope = { from: '', to: '', event: '', format: '' };
export function observedMatchupEvents(data: ObservedMatchupData, cluster: string, scope: ObservedMatchupScope) {
  return data.events.filter(e => e.decks[cluster] && (!scope.from || e.date >= scope.from) && (!scope.to || e.date <= scope.to) && (!scope.format || e.format === scope.format));
}
/** Ties receive half credit, matching the historical matchup convention. */
export function observedMatchupCohort(data: ObservedMatchupData, cluster: string, scope: ObservedMatchupScope) {
  const events = observedMatchupEvents(data, cluster, scope).filter(e => !scope.event || String(e.id) === scope.event);
  const record = emptyRecord();
  const opponents = new Map<string, { record: RecordCount; matches: number }>();
  for (const event of events) for (const [a, b, wins, losses, ties] of event.rows) {
    if (a !== cluster && b !== cluster) continue;
    const own = a === cluster ? { wins, losses, ties } : { wins: losses, losses: wins, ties };
    const mirror = a === b;
    // Aggregate counts deck outcomes: both decks contribute in a mirror. Opponent cards count physical matches once.
    const outcomes = mirror ? { wins: wins + losses, losses: wins + losses, ties: 2 * ties } : own;
    addRecord(record, outcomes);
    const id = a === cluster ? b : a;
    const row = opponents.get(id) ?? { record: emptyRecord(), matches: 0 };
    addRecord(row.record, outcomes); row.matches += wins + losses + ties; opponents.set(id, row);
  }
  const rate = (r: RecordCount) => recordSize(r) ? (r.wins + r.ties / 2) / recordSize(r) : null;
  return { winRate: rate(record), results: recordSize(record), decks: events.reduce((n, e) => n + e.decks[cluster], 0), events: events.length,
    matchups: [...opponents].map(([id, row]) => ({ id, matches: row.matches, winRate: rate(row.record)! })).sort((a, b) => b.matches - a.matches || a.id.localeCompare(b.id)) };
}
