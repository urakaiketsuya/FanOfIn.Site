import type { ArchetypeCluster, StrategyArchetype } from './analysis-types.js';

export const REVIEWED_ARCHETYPE_CORES = [
  { champion: 'Lorraine', name: 'Fire Lorraine — Fire Sword', core: ['Blazing Throw', 'Rending Flames', 'Hone by Fire'] },
  { champion: 'Lorraine', name: 'Fire Lorraine — Embersong–Rhapsody', core: ['Embersong', 'Erupting Rhapsody', 'Fiery Momentum'] },
  { champion: 'Arisanna', name: 'Fire Arisanna — Potion Burn', core: ['Combustible Potion', 'Distilled Water', 'Cinder Geyser'] },
  { champion: 'Arisanna', name: 'Fire Arisanna — Cinderbloom Burn', core: ['Cinderbloom Tender', 'Ignite Fate', 'Kindling Flare'] },
];

export interface ReviewedArchetypeEvidence {
  originalName: string;
  evaluatedDeckCount: number;
  missingDeckCount: number;
  coreDeckCount?: number;
}

/** Naming only: callers supply positive main + material quantities, excluding sideboard. */
export function applyReviewedArchetypeEvidence(strategies: StrategyArchetype[], clusters: ArchetypeCluster[], cardsByDeck: ReadonlyMap<string, ReadonlyMap<string, number>>) {
  const builds = new Map(clusters.map(build => [build.id, build]));
  for (const strategy of strategies) {
    const candidates = REVIEWED_ARCHETYPE_CORES.filter(core => core.champion === strategy.championName);
    if (!candidates.length) continue;
    const previous = strategy.reviewedArchetypeEvidence;
    const ids = [...new Set(strategy.buildIds.flatMap(id => builds.get(id)?.deckIds ?? []))];
    const evaluatedDeckCount = ids.filter(id => cardsByDeck.has(id)).length;
    const matches = candidates.map(identity => ({ identity, count: ids.filter(id => identity.core.every(name => (cardsByDeck.get(id)?.get(name) ?? 0) > 0)).length }))
      .filter(match => ids.length > 0 && match.count / ids.length >= .9);
    if (previous) {
      strategy.name = previous.originalName;
      delete strategy.identityCards;
      delete strategy.reviewedArchetypeEvidence;
    }
    if (matches.length !== 1 || evaluatedDeckCount !== ids.length || strategy.buildIds.some(id => !builds.has(id)) || strategy.playerCount < 5 || strategy.eventCount < 2) continue;
    const { identity, count } = matches[0];
    strategy.reviewedArchetypeEvidence = { originalName: strategy.name, evaluatedDeckCount, missingDeckCount: 0, coreDeckCount: count };
    strategy.name = identity.name;
    strategy.identityCards = [...identity.core];
  }
}
