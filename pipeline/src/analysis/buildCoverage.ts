import { weightedJaccard, type BattleChartEntry } from '@gatcg/shared';
import { exactBuildKey } from './frozenBuilds.js';
import type { DeckSignature } from './decklists.js';

/** Diagnose against frozen definitions without fitting to later lists or outcomes. */
export function buildAssignmentDiagnostic(definitions: Array<{ key: string }>, threshold: number) {
  const materials = new Map<string, Map<string, number>[]>();
  for (const definition of definitions) {
    const [main, material] = JSON.parse(definition.key) as Array<Array<[string, number]>>;
    const key = JSON.stringify(material);
    const lists = materials.get(key) ?? [];
    lists.push(new Map(main));
    materials.set(key, lists);
  }
  return (deck: DeckSignature) => {
    if (!deck.championName) return 'missingChampion' as const;
    const [main, material] = JSON.parse(exactBuildKey(deck)) as Array<Array<[string, number]>>;
    const seeds = materials.get(JSON.stringify(material));
    if (!seeds) return 'unseenMaterial' as const;
    return seeds.some(seed => weightedJaccard(new Map(main), seed) >= threshold)
      ? 'assigned' as const : 'mainBelowThreshold' as const;
  };
}

/** Exhaustive partition of eligible participant perspectives, not independent matches. */
export function buildOutcomeCoverage(training: BattleChartEntry[], later: BattleChartEntry[], eligible: number, minimum: number) {
  const key = (row: BattleChartEntry) => JSON.stringify([row.a, row.b]);
  const prior = new Map(training.map(row => [key(row), row.games]));
  const result = { unassignedBuild: eligible, noPriorMatchup: 0, insufficientPriorMatches: 0, evaluated: 0 };
  for (const row of later) {
    result.unassignedBuild -= row.games;
    const games = prior.get(key(row)) ?? 0;
    if (!games) result.noPriorMatchup += row.games;
    else if (games < minimum) result.insufficientPriorMatches += row.games;
    else result.evaluated += row.games;
  }
  if (result.unassignedBuild < 0) throw new Error('Assigned perspectives exceed eligible population');
  return result;
}
