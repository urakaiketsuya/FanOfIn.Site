import type { EloHistoryData } from './analysis-types';
import type { OmnidexIndexData } from './omnidex-index-types';
import { STRENGTH_REGIONS } from './regionalStrength';
import { emptyRecord, recordSize, type RecordCount } from './competitionReports';

/** Completed individual physical-event matches; one tuple per match, draws have null winner. */
export interface PlayerComparisonData {
  generatedAt: string;
  events: { id: number; matches: [number, number, number | null][] }[];
}
export interface PlayerComparisonMatch { eventId: number; opponent: number; result: 'wins' | 'losses' | 'ties'; opponentRating: number | null }
export interface PlayerComparisonRow {
  playerId: number; rating: number | null; record: RecordCount; matches: PlayerComparisonMatch[];
  opponents: { playerId: number; record: RecordCount }[];
  regions: { region: string; record: RecordCount; opponentRating: number | null; ratedMatches: number }[];
}
/** Strictly earlier checkpoints avoid leaking an event's final rating into its opponent-strength estimate. */
export function priorEventRating(history: EloHistoryData, player: number, date: string): number | null {
  let latest = -Infinity, rating: number | null = null;
  for (const p of history.history[String(player)] ?? []) {
    const time = Date.parse(p.date);
    if (time < Date.parse(date) && time > latest && Number.isFinite(p.rating)) { latest = time; rating = p.rating; }
  }
  return rating;
}
export function regionalPercentile(rating: number | null, sorted: readonly number[]): number | null {
  return rating === null || !sorted.length ? null : 100*(sorted.filter(v => v < rating).length + sorted.filter(v => v === rating).length/2)/sorted.length;
}
export function comparePlayerResults(data: PlayerComparisonData, index: OmnidexIndexData, history: EloHistoryData,
  ids: readonly number[], format: string, seasonId: number, asOf: string, regionFor: (id: number) => string | null): PlayerComparisonRow[] {
  const end = Date.parse(asOf);
  const events = new Map(index.events.filter(e => e.status === 'complete' && e.setting === 'physical' && e.format === format
    && (seasonId === 0 || e.seasonId === seasonId) && Date.parse(e.date) <= end).map(e => [e.id,e]));
  const rows = [...new Set(ids)].map(playerId => ({playerId, rating:null, record:emptyRecord(), matches:[], opponents:[], regions:[]} as PlayerComparisonRow));
  const byId = new Map(rows.map(r => [r.playerId,r]));
  for (const event of new Map(data.events.map(e => [e.id,e])).values()) {
    const summary = events.get(event.id); if (!summary) continue;
    for (const [a,b,winner] of event.matches) for (const [player,opponent] of [[a,b],[b,a]]) {
      const row = byId.get(player); if (!row) continue;
      const result = winner === null ? 'ties' : winner === player ? 'wins' : 'losses';
      row.record[result]++;
      row.matches.push({eventId:event.id,opponent,result,opponentRating:priorEventRating(history,opponent,summary.date)});
    }
  }
  for (const row of rows) {
    if (recordSize(row.record) >= 5) {
      const p = (history.history[String(row.playerId)] ?? []).filter(p => Date.parse(p.date) <= end && Number.isFinite(p.rating)).sort((a,b) => Date.parse(b.date)-Date.parse(a.date))[0];
      row.rating = p?.rating ?? null;
    }
    const opponents = new Map<number,RecordCount>();
    const regions = new Map<string,{record:RecordCount; total:number; count:number}>();
    for (const m of row.matches) {
      const opponent = opponents.get(m.opponent) ?? emptyRecord(); opponent[m.result]++; opponents.set(m.opponent,opponent);
      const region = regionFor(m.opponent) ?? 'unassigned';
      const r = regions.get(region) ?? {record:emptyRecord(),total:0,count:0}; r.record[m.result]++;
      if (m.opponentRating !== null) { r.total += m.opponentRating; r.count++; } regions.set(region,r);
    }
    row.opponents = [...opponents].map(([playerId,record]) => ({playerId,record}));
    row.regions = [...regions].sort(([a],[b]) => [...STRENGTH_REGIONS,'unassigned'].indexOf(a)-[...STRENGTH_REGIONS,'unassigned'].indexOf(b)).map(([region,r]) => ({region,record:r.record,opponentRating:r.count ? r.total/r.count : null,ratedMatches:r.count}));
  }
  return rows;
}
