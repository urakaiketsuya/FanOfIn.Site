import { assignUSPlayerRegions } from './playerRegions';
import type { OmnidexIndexData, OmnidexPlayersData } from './omnidex-index-types';
import type { EloHistoryData } from './analysis-types';

export const STRENGTH_REGIONS = ['us-east', 'us-central', 'us-west'] as const;
export interface StrengthEvent {
  id: number;
  matches: { a: number; b: number; winner: number | null }[];
  /** Null means incomplete/unavailable standings or no verified cut. */
  finishes: { playerId: number; topCut: boolean }[] | null;
}
export interface StrengthRegion {
  region: string;
  active: number;
  ratings: number[];
  majorEntries: number;
  topCuts: number;
}
export interface StrengthSeason {
  seasonId: number;
  name: string;
  format: string;
  asOf: string;
  regions: StrengthRegion[];
  pairs: { a: string; b: string; wins: number; losses: number; draws: number; events: number; players: number }[];
  unassigned: number;
  events: number;
  pairingEvents: number;
  majorEvents: number;
  coveredMajorEvents: number;
}
export interface RegionalStrengthData { generatedAt: string; seasons: StrengthSeason[] }

export function ratingQuantile(sorted: readonly number[], p: number): number | null {
  if (!sorted.length) return null;
  const position = (sorted.length - 1) * p, lower = Math.floor(position);
  return sorted[lower] + (sorted[Math.ceil(position)] - sorted[lower]) * (position - lower);
}

/** Season-end inferred cohorts; no future attendance or current store fallback in historical cohorts. */
export function buildRegionalStrength(index: OmnidexIndexData, players: OmnidexPlayersData, history: EloHistoryData, evidence: readonly StrengthEvent[], generatedAt: string): RegionalStrengthData {
  const source = new Map(evidence.map(e => [e.id, e]));
  const usPlayers = new Set(players.players.filter(p => p.country.toUpperCase() === 'US').map(p => p.id));
  const seasons: StrengthSeason[] = [];
  for (const season of index.seasons) {
    const end = Math.min(Date.parse(season.dateEnd), Date.parse(generatedAt));
    if (!Number.isFinite(end) || end < Date.parse(season.dateStart)) continue;
    const asOf = new Date(end).toISOString();
    const past = index.events.filter(e => Date.parse(e.date) <= end);
    const assignments = assignUSPlayerRegions(players.players, past, [], asOf);
    const eligible = past.filter(e => e.seasonId === season.id && e.status === 'complete' && e.setting === 'physical' && source.has(e.id));
    for (const format of [...new Set(eligible.map(e => e.format))].sort()) {
      const events = eligible.filter(e => e.format === format);
      const regions: StrengthRegion[] = STRENGTH_REGIONS.map(region => ({ region, active: 0, ratings: [], majorEntries: 0, topCuts: 0 }));
      const byRegion = new Map(regions.map(r => [r.region, r]));
      const regionFor = (id: number) => { const r = assignments.get(id)?.region; return r && byRegion.has(r) ? r : null; };
      const matchesByPlayer = new Map<number, number>();
      const active = new Set<number>();
      const pairs = new Map<string, StrengthSeason['pairs'][number] & { eventIds: Set<number>; playerIds: Set<number> }>();
      let pairingEvents = 0, majorEvents = 0, coveredMajorEvents = 0;
      for (const event of events) {
        const data = source.get(event.id)!;
        if (data.matches.length) pairingEvents++;
        for (const match of data.matches) {
          for (const id of [match.a, match.b]) { active.add(id); matchesByPlayer.set(id, (matchesByPlayer.get(id) ?? 0) + 1); }
          const left = regionFor(match.a), right = regionFor(match.b);
          if (!left || !right || left === right) continue;
          const [a,b] = [left,right].sort(), key = `${a}:${b}`;
          const row = pairs.get(key) ?? { a,b,wins:0,losses:0,draws:0,events:0,players:0,eventIds:new Set<number>(),playerIds:new Set<number>() };
          if (match.winner === null) row.draws++;
          else if (regionFor(match.winner) === a) row.wins++;
          else row.losses++;
          row.eventIds.add(event.id); row.playerIds.add(match.a); row.playerIds.add(match.b); pairs.set(key,row);
        }
        if (['worlds','nationals','ascent','regionals'].includes(event.category)) {
          majorEvents++;
          if (data.finishes) {
            coveredMajorEvents++;
            for (const finish of data.finishes) {
              active.add(finish.playerId);
              const region = regionFor(finish.playerId), row = region ? byRegion.get(region) : undefined;
              if (row) { row.majorEntries++; row.topCuts += +finish.topCut; }
            }
          }
        }
      }
      let unassigned = 0;
      for (const id of active) {
        if (!usPlayers.has(id)) continue;
        const region = regionFor(id), row = region ? byRegion.get(region) : undefined;
        if (!row) { unassigned++; continue; }
        row.active++;
        // Require ten observed matches in this format/season, independent of present-day totals.
        if ((matchesByPlayer.get(id) ?? 0) < 10) continue;
        const checkpoint = (history.history[String(id)] ?? []).filter(p => Date.parse(p.date) <= end && Number.isFinite(p.rating)).sort((a,b) => Date.parse(b.date) - Date.parse(a.date))[0];
        if (checkpoint) row.ratings.push(checkpoint.rating);
      }
      for (const row of regions) row.ratings.sort((a,b) => a-b);
      seasons.push({ seasonId:season.id,name:season.name,format,asOf,regions,unassigned,events:events.length,pairingEvents,majorEvents,coveredMajorEvents,
        pairs:[...pairs.values()].map(({eventIds,playerIds,...row}) => ({...row,events:eventIds.size,players:playerIds.size})) });
    }
  }
  return { generatedAt, seasons: seasons.sort((a,b) => b.asOf.localeCompare(a.asOf) || a.format.localeCompare(b.format)) };
}
