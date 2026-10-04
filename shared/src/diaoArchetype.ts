import type { ArchetypeCluster, StrategyArchetype } from './analysis-types.js';

export const DIAO_BURN_CORE = ['Firebloom Flourish', 'Fractal of Sparks', 'Glowering Conflagration'];
export const DIAO_REBUKE_COMBO = ['Firebloom Flourish', 'Fractal of Sparks', 'Searing Rebuke'];
export const DIAO_BURN_SUPPORT = ['Cinder Geyser'];

export const DIAO_IDENTITIES = [
  { key: 'phantasia-burn', name: 'Diao Chan — Phantasia Burn', core: DIAO_BURN_CORE, description: 'Builds around recurring phantasia damage and Glowering Conflagration’s phantasia payoff.', support: DIAO_BURN_SUPPORT },
  { key: 'fractal-burn', name: 'Water Diao Chan — Fractal Burn', core: ['Fractal of Rain', 'Refracting Missile', 'Burst Asunder'], description: 'Builds Fractals to increase Refracting Missile’s damage or sacrifice them to Burst Asunder.', support: ['Fractal of Insight', 'Shimmering Refraction'] },
  { key: 'ally-burn', name: 'Fire Diao Chan — Ally Burn', core: ['Arthur, Young Heir', 'Red Hare, Unrivaled Stallion', 'Xiao Qiao, Cinderkeeper'], description: 'Pairs an ally board with burn spells. Xiao Qiao enables Red Hare’s unique Human condition.', support: ['Firebloom Flourish', 'Cinder Geyser', 'Vermilion Decree'] },
  { key: 'phantasia-control', name: 'Water Diao Chan — Phantasia Control', core: ['Eventide Lure', 'Torpid Fractal', 'Frostnip Pirouette'], description: 'Finds phantasias with Eventide Lure and limits opposing objects with rest and wither effects.', support: ['Fractal of Insight', 'Shimmering Refraction'] },
  { key: 'flowerbud', name: 'Tera Diao Chan — Flowerbud', core: ['Maiden of Waning Bloom', 'Full Bloom'], description: 'Gives opponents Flowerbuds and uses Full Bloom to turn their summons into damage and recovery.', support: ['Engulf', 'Fracturize', 'Shimmering Refraction'] },
];

export interface DiaoPackageEvidence {
  /** Original generated label allows safe reevaluation when a core no longer qualifies. */
  originalName?: string;
  identityKey?: string;
  identityDeckCount?: number;
  identityCards?: { name: string; deckCount: number; averageCopies: number }[];
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
    const previousName = strategy.diaoPackageEvidence?.originalName ?? strategy.name;
    // Older published metadata did not retain the generated label; use a neutral fallback.
    const originalName = DIAO_IDENTITIES.some(identity => identity.name === previousName) ? strategy.championName : previousName;
    const evidence = diaoPackageEvidence(ids, cardsByDeck);
    evidence.originalName = originalName;
    strategy.diaoPackageEvidence = evidence;
    strategy.name = originalName;
    delete strategy.identityCards;
    const uniqueIds = [...new Set(ids)];
    const matches = DIAO_IDENTITIES.map(identity => ({
      identity,
      count: uniqueIds.filter(id => identity.core.every(name => (cardsByDeck.get(id)?.get(name) ?? 0) > 0)).length,
    })).filter(({ count }) => evidence.evaluatedDeckCount > 0 && count / evidence.evaluatedDeckCount >= .9);
    // Ambiguous cores need review instead of an arbitrary first-match label.
    if (matches.length === 1 && evidence.missingDeckCount === 0 && strategy.playerCount >= 5 && strategy.eventCount >= 2) {
      const { identity, count } = matches[0];
      strategy.name = identity.name;
      strategy.identityCards = [...identity.core];
      evidence.identityKey = identity.key;
      evidence.identityDeckCount = count;
      evidence.identityCards = [...new Set([...identity.core, ...identity.support])].map(name => {
        const quantities = uniqueIds.map(id => Math.max(0, cardsByDeck.get(id)?.get(name) ?? 0));
        return { name, deckCount: quantities.filter(quantity => quantity > 0).length, averageCopies: quantities.reduce((sum, quantity) => sum + quantity, 0) / evidence.evaluatedDeckCount };
      });
    }
  }
}
