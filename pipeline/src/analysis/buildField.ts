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
  const championCounts = new Map<string, number>();
  const choices = new Map<string, { id: string; buildId: string; champion: string; sightings: number }>();
  const directed = new Map<string, BattleChartEntry>();
  const seenEvents = new Set<number>();
  const formats = new Set<string>();
  let validPairings = 0, assignedPairings = 0;
  for (const bundle of bundles) {
    if (seenEvents.has(bundle.id) || bundle.event.status !== 'complete' || 'error' in bundle.decklists) continue;
    seenEvents.add(bundle.id);
    formats.add(bundle.event.format.trim().toLowerCase());
    if (formats.size > 1) throw new Error('Build field must use one format');
    const signatures = ctx.getEventSignatures(bundle);
    const publicPlayers = new Map([...signatures].filter(([, sig]) => sig.championName)
      .map(([player]) => [player, membership.get(`${bundle.id}:${player}`) ?? UNASSIGNED_BUILD]));
    for (const id of publicPlayers.values()) counts.set(id, (counts.get(id) ?? 0) + 1);
    const choiceFor = (player: number) => JSON.stringify(['build', publicPlayers.get(player), signatures.get(player)!.championName]);
    for (const [player, buildId] of publicPlayers) {
      const champion = signatures.get(player)!.championName!;
      const opponentId = JSON.stringify(['champion', champion]);
      championCounts.set(opponentId, (championCounts.get(opponentId) ?? 0) + 1);
      if (buildId === UNASSIGNED_BUILD) continue;
      const id = choiceFor(player);
      const choice = choices.get(id) ?? { id, buildId, champion, sightings: 0 };
      choice.sightings++;
      choices.set(id, choice);
    }
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
        for (const [player, opponent, won] of [[left.id, right.id, leftWin], [right.id, left.id, rightWin]] as const) {
          if (publicPlayers.get(player) === UNASSIGNED_BUILD) continue;
          const a = choiceFor(player), b = JSON.stringify(['champion', signatures.get(opponent)!.championName]);
          const key = JSON.stringify([a, b]);
          const row = directed.get(key) ?? { a, b, aWins: 0, bWins: 0, ties: 0, games: 0 };
          row.games++;
          if (draw) row.ties++;
          else if (won) row.aWins++;
          else row.bWins++;
          directed.set(key, row);
        }
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
  const conditioned = {
    choices: [...choices.values()].sort((a, b) => a.id.localeCompare(b.id)),
    field: [...championCounts].map(([champion, weight]) => ({ champion, weight })).sort((a, b) => a.champion.localeCompare(b.champion)),
    battleChart: [...directed.values()].filter(row => row.games >= minMatchups)
      .sort((a, b) => a.a.localeCompare(b.a) || a.b.localeCompare(b.b)),
  };
  return { conditioned, field, events: seenEvents.size, validPairings, assignedPairings,
    battleChart: [...rows.values()].filter(row => row.games >= minMatchups)
      .sort((a, b) => a.a.localeCompare(b.a) || a.b.localeCompare(b.b)) };
}
