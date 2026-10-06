import { weightedJaccard } from '@gatcg/shared';
import type { DeckSignature } from './decklists.js';
import type { AnalysisContext } from './context.js';
import type { OmnidexEventBundle } from '../omnidex/cache.js';

/** Exact main+material identity; section and copy counts matter, sideboards do not. */
export function exactBuildKey(deck: Pick<DeckSignature, 'mainCards' | 'materialCards'>): string {
  const section = (lines: DeckSignature['mainCards']) => {
    const counts = new Map<string, number>();
    for (const line of lines) counts.set(line.name, (counts.get(line.name) ?? 0) + line.quantity);
    return [...counts].filter(([, quantity]) => quantity > 0).sort(([a], [b]) => a.localeCompare(b));
  };
  return JSON.stringify([section(deck.mainCards), section(deck.materialCards)]);
}

export function freezeExactBuilds(bundles: OmnidexEventBundle[], ctx: AnalysisContext) {
  const keys = new Set<string>();
  for (const bundle of bundles) {
    for (const deck of ctx.getEventSignatures(bundle).values()) {
      if (deck.championName) keys.add(exactBuildKey(deck));
    }
  }
  const definitions = [...keys].sort().map((key, index) => ({ id: `exact-${index + 1}`, key }));
  const byKey = new Map(definitions.map(build => [build.key, build.id]));
  return {
    definitions,
    assign(events: OmnidexEventBundle[]) {
      const membership = new Map(definitions.map(build => [build.id, new Set<string>()]));
      for (const bundle of events) {
        for (const [player, deck] of ctx.getEventSignatures(bundle)) {
          const id = deck.championName ? byKey.get(exactBuildKey(deck)) : undefined;
          if (id) membership.get(id)!.add(`${bundle.id}:${player}`);
        }
      }
      return [...membership].map(([id, deckIds]) => ({ id, deckIds: [...deckIds] }));
    },
  };
}

/** Experimental nearest-seed groups, fitted once without outcomes or later decks. */
export function freezeSimilarBuilds(bundles: OmnidexEventBundle[], ctx: AnalysisContext, threshold = 0.7) {
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1) throw new Error('Invalid similarity threshold');
  const exact = freezeExactBuilds(bundles, ctx);
  const counts = new Map(exact.assign(bundles).map(build => [build.id, build.deckIds.length]));
  const candidates = exact.definitions.map(build => {
    const [main, material] = JSON.parse(build.key) as [Array<[string, number]>, Array<[string, number]>];
    return { ...build, main: new Map(main), material: JSON.stringify(material), sightings: counts.get(build.id)! };
  }).sort((a, b) => b.sightings - a.sightings || a.key.localeCompare(b.key));
  const seeds: typeof candidates = [];
  const nearest = (main: Map<string, number>, material: string) => {
    let best: typeof candidates[number] | undefined;
    let score = -1;
    for (const seed of seeds) {
      if (seed.material !== material) continue;
      const similarity = weightedJaccard(main, seed.main);
      if (similarity >= threshold && (similarity > score || (similarity === score && seed.key < best!.key))) {
        best = seed; score = similarity;
      }
    }
    return best;
  };
  for (const candidate of candidates) {
    if (!nearest(candidate.main, candidate.material)) seeds.push(candidate);
  }
  return {
    definitions: seeds.map(seed => ({ id: seed.id, key: seed.key })),
    assign(events: OmnidexEventBundle[]) {
      const membership = new Map(seeds.map(seed => [seed.id, new Set<string>()]));
      for (const event of events) for (const [player, deck] of ctx.getEventSignatures(event)) {
        if (!deck.championName) continue;
        const [main, material] = JSON.parse(exactBuildKey(deck)) as [Array<[string, number]>, Array<[string, number]>];
        const seed = nearest(new Map(main), JSON.stringify(material));
        if (seed) membership.get(seed.id)!.add(`${event.id}:${player}`);
      }
      return [...membership].map(([id, deckIds]) => ({ id, deckIds: [...deckIds] }));
    },
  };
}
