import type { Card } from './api-types.js';
import { reviewedChampionAccess, reviewedElementMinimumLevel } from './championAccess.js';
import { aggregateLines, FIXTURE_FLOATING, type AnalyticsDeck } from './fixtureResources.js';
import { estimateDrawAndDamageInfluence, type InfluenceDrawSource } from './drawInfluence.js';
import type { JinFuelCheckpoint, JinFuelRole } from './jinFuelSequence.js';

export const JIN_FUEL_ROLES = {
  'Volcanic Crescendo': 'crescendo', 'Creative Shock': 'loot', 'Creative Tinder': 'loot',
  'Package Courier': 'courier', 'Hasty Messenger': 'messenger', 'Sly Songstress': 'songstress',
  'Musical Curator': 'curator', 'Dungeon Guide': 'dungeon', 'Liminal Guide': 'liminal', 'Ignite Fate': 'ignite',
} as const satisfies Record<string, JinFuelRole>;

export function hasJinFuelSources(deck: AnalyticsDeck) {
  return deck.material.some(line => line.quantity > 0 && line.name.startsWith('Jin,'))
    && deck.main.some(line => line.quantity > 0 && line.name === 'Volcanic Crescendo');
}

export function createJinFuelPolicy(deck: AnalyticsDeck, catalog: ReadonlyMap<string, Card>) {
  const main = aggregateLines(deck.main).sort((a, b) => a.name.localeCompare(b.name));
  const material = aggregateLines(deck.material);
  if ([...main, ...material].some(line => !catalog.has(line.name))) return { status: 'missing' as const };
  const access = reviewedChampionAccess(material, catalog, 'jin');
  if (!access || access.spirit.name !== 'Spirit of Fire') return { status: 'unsupported' as const };
  const valid = (n: number | null | undefined): n is number => n != null && Number.isFinite(n) && n >= 0;
  if (!valid(access.spirit.life) || access.lineage.some(card => !valid(catalog.get(card.name)?.life))) return { status: 'missing' as const };
  const sources: InfluenceDrawSource[] = main.map(line => {
    const card = catalog.get(line.name)!;
    const role = JIN_FUEL_ROLES[line.name as keyof typeof JIN_FUEL_ROLES];
    const floating = line.name === 'Ignite Fate' || (Object.hasOwn(FIXTURE_FLOATING, line.name) && FIXTURE_FLOATING[line.name] === null)
      ? 'always' : FIXTURE_FLOATING[line.name] === 'WARRIOR' ? 'level-1' : undefined;
    return { ...line, jinFuelRole: role, reserve: card.cost_reserve, draws: role === 'loot' ? 2 : 0,
      discard: role === 'loot' ? 1 : 0, resolvesTo: card.types.includes('ACTION') ? 'graveyard' : 'field',
      subtypes: card.subtypes, fireElement: card.element === 'FIRE', floatingMemory: floating,
      minimumLevel: reviewedElementMinimumLevel(card.element, access.element, access.advanced),
      damage: role === 'ignite' ? 'ignite-fate' : undefined };
  });
  if (sources.some(source => source.jinFuelRole && !valid(source.reserve))) return { status: 'missing' as const };
  return { status: 'ready' as const, main: sources,
    progression: { rai: false, spiritLife: access.spirit.life,
      lineage: access.lineage.map(card => ({ ...card, life: catalog.get(card.name)!.life! })) } };
}

const range = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (p: number) => sorted[Math.floor((sorted.length - 1) * p)] ?? 0;
  return { low: at(0.1), median: at(0.5), high: at(0.9) };
};

/** One finite, paid trajectory per sample. Thresholds refer to resolved casts, not cards seen. */
export function computeJinFuelReport(deck: AnalyticsDeck, catalog: ReadonlyMap<string, Card>, messengerAttacks = true) {
  if (!hasJinFuelSources(deck)) return { status: 'unsupported' as const };
  const policy = createJinFuelPolicy(deck, catalog);
  if (policy.status !== 'ready') return policy;
  const samples = 512;
  const checkpoints: JinFuelCheckpoint[][] = Array.from({ length: 5 }, () => []);
  estimateDrawAndDamageInfluence(policy.main, [], Math.min(7, policy.main.reduce((n, card) => n + card.quantity, 0)), 'first', 5, samples,
    policy.progression, undefined, undefined, { messengerAttacks, checkpoint: point => checkpoints[point.turn - 1].push(point) });
  return { status: 'ready' as const, messengerAttacks,
    sources: policy.main.filter(source => source.jinFuelRole).map(({ name, quantity }) => ({ name, quantity })),
    points: checkpoints.map((points, index) => ({ turn: index + 1,
      fuel: range(points.map(point => point.fuel)),
      casts: range(points.map(point => point.casts)),
      discardedFire: range(points.map(point => point.discardedFire)),
      empower: range(points.map(point => point.casts > 0 ? 3 + point.maxFuel : 0)),
      damage: range(points.map(point => point.damage)),
      thresholds: [3, 5, 8].map(fuel => ({ fuel, chance: points.filter(point => point.maxFuel >= fuel).length / samples })),
      harmonized: points.filter(point => point.harmonized > 0).length / samples,
    })),
  };
}
