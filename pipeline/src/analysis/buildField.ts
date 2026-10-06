import type { ArchetypeCluster, BattleChartEntry, FieldWeight } from '@gatcg/shared';
import type { OmnidexEventBundle } from '../omnidex/cache.js';
import type { AnalysisContext } from './context.js';

/** Unknown builds remain in the field denominator but never become a strategic choice. */
export const UNASSIGNED_BUILD = '__unassigned_build__';

export function computeBuildField(bundles: OmnidexEventBundle[], ctx: AnalysisContext,
  builds: Pick<ArchetypeCluster, 'id' | 'deckIds'>[], minMatchups = 5) {
  if (!Number.isInteger(minMatchups) || minMatchups < 1) throw new Error('Invalid minimum matchups');
  const membership = new Map<string, string>();
  const ids = new Set<string>();
  for (const build of builds) {
    if (ids.has(build.id) || build.id === UNASSIGNED_BUILD) throw new Error('Duplicate or reserved build ID');
    ids.add(build.id);
    for (const deckId of new Set(build.deckIds)) {
      if (membership.has(deckId)) throw new Error(`Overlapping build membership: ${deckId}`);
      membership.set(deckId, build.id);
    }
  }
  const counts = new Map<string, number>();
  const rows = new Map<string, BattleChartEntry>();
  const seenEvents = new Set<number>();
  const formats = new Set<string>();
  let validPairings = 0, assignedPairings = 0;
  for (const bundle of bundles) {
    if (seenEvents.has(bundle.id) || bundle.event.status !== 'complete' || 'error' in bundle.decklists) continue;
    seenEvents.add(bundle.id);
    formats.add(bundle.event.format.trim().toLowerCase());
    if (formats.size > 1) throw new Error('Build field must use one format');
    const publicPlayers = new Map([...ctx.getEventSignatures(bundle)].filter(([, sig]) => sig.championName)
      .map(([player]) => [player, membership.get(`${bundle.id}:${player}`) ?? UNASSIGNED_BUILD]));
    for (const id of publicPlayers.values()) counts.set(id, (counts.get(id) ?? 0) + 1);
    const seenPairs = new Set<number>();
    for (const round of bundle.pairingsByRound) {
      if ('error' in round) continue;
      for (const pair of round.pairings) {
        if (pair.status !== 'complete' || pair.pairing.length !== 2 || seenPairs.has(pair.id)) continue;
        seenPairs.add(pair.id);
        const [left, right] = pair.pairing;
        if (left.id === right.id) continue;
        const aId = publicPlayers.get(left.id), bId = publicPlayers.get(right.id);
        if (!aId || !bId) continue;
        const draw = left.status === 'tied' && right.status === 'tied';
        const leftWin = left.status === 'winner' && right.status === 'loser';
        const rightWin = right.status === 'winner' && left.status === 'loser';
        if (!draw && !leftWin && !rightWin) continue;
        validPairings++;
        if (aId === UNASSIGNED_BUILD || bId === UNASSIGNED_BUILD) continue;
        assignedPairings++;
        const forward = aId <= bId;
        const a = forward ? aId : bId, b = forward ? bId : aId;
        const key = JSON.stringify([a, b]);
        const row = rows.get(key) ?? { a, b, aWins: 0, bWins: 0, ties: 0, games: 0 };
        row.games++;
        if (draw) row.ties++;
        else if (forward ? leftWin : rightWin) row.aWins++;
        else row.bWins++;
        rows.set(key, row);
      }
    }
  }
  const field: FieldWeight[] = [...counts].map(([champion, weight]) => ({ champion, weight }))
    .sort((a, b) => a.champion.localeCompare(b.champion));
  return { field, events: seenEvents.size, validPairings, assignedPairings,
    battleChart: [...rows.values()].filter(row => row.games >= minMatchups)
      .sort((a, b) => a.a.localeCompare(b.a) || a.b.localeCompare(b.b)) };
}
