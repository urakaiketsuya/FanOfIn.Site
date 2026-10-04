import type { ArchetypeCluster, StrategyArchetype } from './analysis-types.js';

export const DIAO_BURN_CORE = ['Firebloom Flourish', 'Fractal of Sparks', 'Glowering Conflagration'];
export const DIAO_REBUKE_COMBO = ['Firebloom Flourish', 'Fractal of Sparks', 'Searing Rebuke'];
export const DIAO_BURN_SUPPORT = ['Cinder Geyser'];

export interface DiaoPackageEvidence {
  evaluatedDeckCount: number;
  missingDeckCount: number;
  coreDeckCount: number;
  comboDeckCount: number;
  cards: { name: string; deckCount: number; averageCopies: number }[];
}

/** Match positive copies in main + material only. The caller must exclude sideboard. */
export function diaoPackageEvidence(deckIds: string[], cardsByDeck: ReadonlyMap<string, ReadonlyMap<string, number>>): DiaoPackageEvidence {
  const cards = [...new Set([...DIAO_BURN_CORE, ...DIAO_REBUKE_COMBO, ...DIAO_BURN_SUPPORT])].map(name => ({ name, deckCount: 0, averageCopies: 0 }));
  let evaluatedDeckCount = 0, coreDeckCount = 0, comboDeckCount = 0;
  const uniqueIds = [...new Set(deckIds)];
  for (const id of uniqueIds) {
    const counts = cardsByDeck.get(id);
    if (!counts) continue;
    evaluatedDeckCount++;
    const includes = (names: string[]) => names.every(name => (counts.get(name) ?? 0) > 0);
    if (includes(DIAO_BURN_CORE)) coreDeckCount++;
    if (includes(DIAO_REBUKE_COMBO)) comboDeckCount++;
    for (const card of cards) {
      const quantity = Math.max(0, counts.get(card.name) ?? 0);
      if (quantity > 0) card.deckCount++;
      card.averageCopies += quantity;
    }
  }
  for (const card of cards) card.averageCopies = evaluatedDeckCount ? card.averageCopies / evaluatedDeckCount : 0;
  return { evaluatedDeckCount, missingDeckCount: uniqueIds.length - evaluatedDeckCount, coreDeckCount, comboDeckCount, cards };
}

/** Add evidence without changing membership, ids or cluster names. Missing data cannot qualify a family. */
export function applyDiaoArchetypeEvidence(strategies: StrategyArchetype[], clusters: ArchetypeCluster[], cardsByDeck: ReadonlyMap<string, ReadonlyMap<string, number>>) {
  const builds = new Map(clusters.map(build => [build.id, build]));
  for (const strategy of strategies) {
    if (strategy.championName !== 'Diao Chan') continue;
    const ids = strategy.buildIds.flatMap(id => builds.get(id)?.deckIds ?? []);
    const evidence = diaoPackageEvidence(ids, cardsByDeck);
    strategy.diaoPackageEvidence = evidence;
    if (evidence.missingDeckCount === 0 && evidence.evaluatedDeckCount > 0 && evidence.coreDeckCount / evidence.evaluatedDeckCount >= .9 && strategy.playerCount >= 5 && strategy.eventCount >= 2) {
      strategy.name = 'Diao Chan — Phantasia Burn';
      strategy.identityCards = [...DIAO_BURN_CORE];
    }
  }
}
