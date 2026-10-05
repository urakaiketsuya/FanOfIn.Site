import type { ArchetypeCluster, StrategyArchetype } from './analysis-types.js';

export const REVIEWED_RELATIONSHIPS = [
  { id: 'fractals', name: 'Fractals', kind: 'archetype', variants: [
    { id: 'rain-missile', cards: ['Fractal of Rain', 'Refracting Missile'] },
  ] },
  { id: 'preparation', name: 'Preparation', kind: 'archetype', variants: [
    { id: 'surveil-incapacitate', cards: ['Surveil the Winds', 'Incapacitate'] },
  ] },
  { id: 'red-hare', name: 'Red Hare Allies', kind: 'archetype', variants: [
    { id: 'arthur-red-hare', cards: ['Arthur, Young Heir', 'Red Hare, Unrivaled Stallion'] },
  ] },
  { id: 'suited', name: 'Suited', kind: 'archetype', variants: [
    { id: 'rouge', cards: ['Rouge, Ace of Hearts', 'Two of Hearts', 'Four of Hearts'] },
    { id: 'verita', cards: ['Verita, Queen of Hearts', 'Three of Hearts', 'Straight Flare'] },
  ] },
  { id: 'water-support', name: 'Water defensive support', kind: 'package', variants: [
    { id: 'paladin', cards: ['Fracturize', 'Frostsworn Paladin'] },
    { id: 'frostbind', cards: ['Fracturize', 'Frostsworn Paladin', 'Frostbind'] },
  ] },
  { id: 'oath-mounts', name: 'Oath Mounts', kind: 'package', variants: [
    { id: 'liu-bei-oath-dilu', cards: ['Liu Bei, Oathkeeper', 'Oath of the Sakura', 'Dilu, Auspicious Charger'] },
  ] },
] as const;

export interface RelationshipDeck {
  deckId: string;
  player: string | number;
  eventId: string | number;
  /** Positive main + material quantities only; callers must exclude sideboard. */
  cardCounts: ReadonlyMap<string, number>;
}
export interface RelationshipEvidence {
  deckCount: number;
  indexedDeckCount: number;
  matchingDeckCount: number;
  playerCount: number;
  eventCount: number;
  coverage: number;
  supported: boolean;
  /** Includes missing-index decks, which cannot establish a match. */
  exceptionDeckIds: string[];
}
export interface ReviewedRelationship {
  id: string;
  name: string;
  kind: 'archetype' | 'package';
  variants: { id: string; cards: string[] }[];
  families: {
    familyId: string;
    championName: string;
    evidence: RelationshipEvidence;
    variants: { variantId: string; evidence: RelationshipEvidence }[];
    builds: { buildId: string; evidence: RelationshipEvidence; variants: { variantId: string; evidence: RelationshipEvidence }[] }[];
  }[];
}

/** Independent additive evidence: no names, ids, membership or statistics are mutated. */
export function evaluateReviewedRelationships(
  families: readonly Pick<StrategyArchetype, 'id' | 'championName' | 'buildIds'>[],
  builds: readonly Pick<ArchetypeCluster, 'id' | 'deckIds'>[],
  decks: readonly RelationshipDeck[],
): ReviewedRelationship[] {
  const byDeck = new Map(decks.map(d => [d.deckId, d]));
  const byBuild = new Map(builds.map(b => [b.id, b]));
  const evidence = (ids: readonly string[], cores: readonly (readonly string[])[]): RelationshipEvidence => {
    const unique = [...new Set(ids)].sort();
    const indexed = unique.flatMap(id => byDeck.has(id) ? [byDeck.get(id)!] : []);
    const matches = indexed.filter(d => cores.some(core => core.every(name => (d.cardCounts.get(name) ?? 0) > 0)));
    const matchedIds = new Set(matches.map(d => d.deckId));
    const playerCount = new Set(matches.map(d => d.player)).size;
    const eventCount = new Set(matches.map(d => d.eventId)).size;
    const coverage = unique.length ? matches.length / unique.length : 0;
    return { deckCount: unique.length, indexedDeckCount: indexed.length, matchingDeckCount: matches.length,
      playerCount, eventCount, coverage,
      supported: unique.length > 0 && indexed.length === unique.length && coverage >= .9 && playerCount >= 5 && eventCount >= 2,
      exceptionDeckIds: unique.filter(id => !matchedIds.has(id)) };
  };
  return REVIEWED_RELATIONSHIPS.map(definition => {
    const cores = definition.variants.map(v => v.cards);
    const variants = (ids: readonly string[]) => definition.variants.map(v => ({ variantId: v.id, evidence: evidence(ids, [v.cards]) }));
    return { id: definition.id, name: definition.name, kind: definition.kind,
      variants: definition.variants.map(v => ({ id: v.id, cards: [...v.cards] })),
      families: families.map(family => {
        const members = family.buildIds.map(id => {
          const build = byBuild.get(id);
          if (!build) throw new Error(`Missing relationship build: ${id}`);
          return build;
        });
        const ids = members.flatMap(b => b.deckIds);
        return { familyId: family.id, championName: family.championName, evidence: evidence(ids, cores), variants: variants(ids),
          builds: members.map(b => ({ buildId: b.id, evidence: evidence(b.deckIds, cores), variants: variants(b.deckIds) })) };
      }).filter(f => f.evidence.matchingDeckCount > 0).sort((a, b) => a.familyId.localeCompare(b.familyId)),
    };
  });
}
