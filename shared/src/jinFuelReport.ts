import type { Card } from './api-types.js';
import { reviewedElementMinimumLevel } from './championAccess.js';
import { aggregateLines, FIXTURE_FLOATING, type AnalyticsDeck } from './fixtureResources.js';
import { estimateDrawAndDamageInfluence, type InfluenceDrawSource } from './drawInfluence.js';
import type { JinFuelCheckpoint, JinFuelRole } from './jinFuelSequence.js';

export const JIN_FUEL_ROLES = {
  'Volcanic Crescendo': 'crescendo', 'Creative Shock': 'loot', 'Creative Tinder': 'loot',
  'Package Courier': 'courier', 'Hasty Messenger': 'messenger', 'Sly Songstress': 'songstress',
  'Musical Curator': 'curator', 'Dungeon Guide': 'dungeon', 'Liminal Guide': 'liminal', 'Ignite Fate': 'ignite',
} as const satisfies Record<string, JinFuelRole>;

export function hasJinFuelSources(deck: AnalyticsDeck) {
  return deck.main.some(line => line.quantity > 0 && ['Creative Shock', 'Creative Tinder', 'Package Courier', 'Hasty Messenger', 'Sly Songstress'].includes(line.name))
    && deck.main.some(line => line.quantity > 0 && line.name === 'Volcanic Crescendo');
}

export function createJinFuelPolicy(deck: AnalyticsDeck, catalog: ReadonlyMap<string, Card>) {
  const main = aggregateLines(deck.main).sort((a, b) => a.name.localeCompare(b.name));
  const material = aggregateLines(deck.material);
  if ([...main, ...material].some(line => !catalog.has(line.name))) return { status: 'missing' as const };
  const valid = (n: number | null | undefined): n is number => n != null && Number.isFinite(n) && n >= 0;
  const champions = material.filter(line => catalog.get(line.name)!.types.includes('CHAMPION'));
  const spirit = champions.map(line => catalog.get(line.name)!).find(card => card.level === 0);
  const lineage = champions.map(line => catalog.get(line.name)!).filter(card => card.level !== 0)
    .sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
  if (!spirit || champions.some(line => line.quantity !== 1)
    || champions.filter(line => catalog.get(line.name)!.level === 0).length !== 1
    || lineage.some((card, index) => card.level !== index + 1)) return { status: 'unsupported' as const };
  if (!valid(spirit.life) || lineage.some(card => !valid(card.life) || !valid(card.cost_memory))) return { status: 'missing' as const };
  const access = { spirit, element: spirit.element, advanced: lineage.find(card => card.level === 3)?.element ?? '',
    lineage: lineage.map(card => ({ name: card.name, memory: card.cost_memory! })) };
  const warrior = lineage.length > 0 && lineage.every(card => card.classes.includes('WARRIOR'));
  const sources: InfluenceDrawSource[] = main.map(line => {
    const card = catalog.get(line.name)!;
    const role = JIN_FUEL_ROLES[line.name as keyof typeof JIN_FUEL_ROLES];
    const floating = line.name === 'Ignite Fate' || (Object.hasOwn(FIXTURE_FLOATING, line.name) && FIXTURE_FLOATING[line.name] === null)
      ? 'always' : FIXTURE_FLOATING[line.name] === 'WARRIOR' && warrior ? 'level-1' : undefined;
    return { ...line, jinFuelRole: role, reserve: card.cost_reserve, draws: role === 'loot' ? 2 : 0,
      discard: role === 'loot' ? 1 : 0, resolvesTo: card.types.includes('ACTION') ? 'graveyard' : 'field',
      subtypes: card.subtypes, fireElement: card.element === 'FIRE', floatingMemory: floating,
      minimumLevel: reviewedElementMinimumLevel(card.element, access.element, access.advanced),
      damage: role === 'ignite' ? 'ignite-fate' : undefined };
  });
  if (sources.some(source => source.jinFuelRole && !valid(source.reserve))) return { status: 'missing' as const };
  return { status: 'ready' as const, main: sources,
    progression: { rai: false, spiritLife: spirit.life,
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
    policy.progression, undefined, undefined, { messengerAttacks, maximumLevel: policy.progression.lineage.length, checkpoint: point => checkpoints[point.turn - 1].push(point) });
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
