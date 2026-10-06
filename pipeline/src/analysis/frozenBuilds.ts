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
