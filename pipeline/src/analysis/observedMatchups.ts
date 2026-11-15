import { buildMembership, competitionMatches, type ArchetypeTaxonomyData, type ObservedMatchupData, type ObservedMatchupEvent } from '@gatcg/shared';
import type { OmnidexEventBundle } from '../omnidex/cache.js';

/** Completed individual pairings whose two decks have unambiguous published build membership. */
export function computeObservedMatchups(bundles: OmnidexEventBundle[], taxonomy: ArchetypeTaxonomyData, generatedAt = new Date().toISOString()): ObservedMatchupData {
  const membership = buildMembership(taxonomy);
  const builds = new Set(taxonomy.clusters.map(c => c.id));
  const events: ObservedMatchupEvent[] = [];
  for (const bundle of new Map(bundles.map(b => [b.id, b])).values()) {
    const { event } = bundle;
    if (event.status !== 'complete' || !Number.isFinite(Date.parse(event.date)) || event.date.slice(0, 10) > generatedAt.slice(0, 10) || !event.format || /team/i.test(event.format)) continue;
    if (!(Array.isArray(bundle.teams) ? bundle.teams.length === 0 : bundle.teams.error === 'Not a team event.')) continue;
    const rows = new Map<string, ObservedMatchupEvent['rows'][number]>();
    const decks = new Map<string, Set<number>>();
    for (const match of competitionMatches(bundle.pairingsByRound)) {
      const a = membership(`${bundle.id}:${match.a}`), b = membership(`${bundle.id}:${match.b}`);
      if (!builds.has(a) || !builds.has(b)) continue;
      const [left, right] = [a, b].sort();
      const key = JSON.stringify([left, right]);
      const row = rows.get(key) ?? [left, right, 0, 0, 0];
      const player = left === a ? match.a : match.b;
      row[match.winner === null ? 4 : match.winner === player ? 2 : 3]++;
      rows.set(key, row);
      for (const [build, id] of [[a, match.a], [b, match.b]] as const) {
        const set = decks.get(build) ?? new Set<number>(); set.add(id); decks.set(build, set);
      }
    }
    if (rows.size) events.push({ id: bundle.id, name: event.name, date: event.date.slice(0, 10), format: event.format.toUpperCase(), decks: Object.fromEntries([...decks].sort().map(([id, set]) => [id, set.size])), rows: [...rows.values()].sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1])) });
  }
  return { generatedAt, builds: Object.fromEntries(taxonomy.clusters.map(c => [c.id, { name: c.name, champion: c.championName }])), events: events.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id) };
}
