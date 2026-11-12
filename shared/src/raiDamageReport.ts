import type { Card } from './api-types.js';
import type { AnalyticsDeck } from './fixtureResources.js';
import { createRaiDrawPolicy } from './raiDrawPolicy.js';
import { estimateDrawAndDamageInfluence, type InfluenceDrawSource } from './drawInfluence.js';
import { needsAlly, type PaidDamageEffect, type PaidDamageScenario } from './paidDamagePolicy.js';

const DAMAGE_EFFECTS = {
  Fireball: 'fireball', 'Focused Flames': 'focused-flames', 'Gilded Pyre': 'gilded-pyre',
  'Ignite Fate': 'ignite-fate', 'Ignite the Soul': 'ignite-soul', 'Innervate Fury': 'innervate-fury',
  'Intensified Pyre': 'intensified-pyre', 'Purge in Flames': 'purge-flames',
  'Pyroclastic Flow': 'pyroclastic-flow', 'Set Ablaze': 'set-ablaze',
} as const satisfies Record<string, PaidDamageEffect>;
export const RAI_DAMAGE_CARDS = Object.keys(DAMAGE_EFFECTS) as (keyof typeof DAMAGE_EFFECTS)[];

export const RAI_DAMAGE_SCENARIOS = [
  { id: 'champion', label: 'Champion · no opposing allies', allies: 0, target: 'champion' },
  { id: 'ally', label: '1 opposing ally per cast', allies: 1, target: 'ally' },
  { id: 'wide', label: '2 opposing allies per cast', allies: 2, target: 'ally' },
  { id: 'buffed', label: 'Buffed champion', allies: 0, target: 'champion', buffed: true },
  { id: 'graveyard', label: 'Opposing graveyard ≥8', allies: 0, target: 'champion', opposingGraveyard: 8 },
  { id: 'injured', label: 'Start at 5 damage · 1 ally per cast', allies: 1, target: 'ally', startingDamage: 5 },
] as const satisfies readonly (PaidDamageScenario & { id: string; label: string })[];

export function raiDamageScenarioRelevant(id: string, names: ReadonlySet<string>) {
  if (id === 'champion') return true;
  if (id === 'buffed') return names.has('Gilded Pyre');
  if (id === 'graveyard') return names.has('Intensified Pyre');
  if (id === 'injured') return names.has('Innervate Fury');
  if (id === 'wide') return ['Purge in Flames', 'Pyroclastic Flow', 'Innervate Fury'].some(name => names.has(name));
  return RAI_DAMAGE_CARDS.some(name => name !== 'Ignite Fate' && name !== 'Intensified Pyre' && names.has(name));
}

/** Paid output scenarios, before responses/prevention; no inferred opponent play or lethal clock. */
export function computeRaiDamageReport(deck: AnalyticsDeck, catalog: ReadonlyMap<string, Card>) {
  if ([...deck.main, ...deck.material].some(line => line.quantity > 0 && !catalog.has(line.name))) return { status: 'missing' as const };
  const counts = new Map<string, number>();
  for (const line of deck.main) if (line.quantity > 0) counts.set(line.name, (counts.get(line.name) ?? 0) + line.quantity);
  const main = [...counts].map(([name, quantity]) => ({ name, quantity })).sort((a, b) => a.name.localeCompare(b.name));
  const policy = createRaiDrawPolicy(main, deck.material, catalog);
  if (!policy) return { status: 'unsupported' as const };
  const fireEnabled = policy.access.element === 'FIRE';
  const sources: InfluenceDrawSource[] = policy.main.map(source => {
    const card = catalog.get(source.name)!;
    const damage = fireEnabled ? DAMAGE_EFFECTS[source.name as keyof typeof DAMAGE_EFFECTS] : undefined;
    return { ...source, damage, fireElement: card.element === 'FIRE',
      allyLife: card.types.includes('ALLY') ? card.life ?? undefined : undefined,
      floatingMemory: source.name === 'Ignite Fate' ? 'always' : source.name === 'Ignite the Soul' ? 'mage' : source.floatingMemory };
  });
  const damageSources = sources.filter(source => source.damage);
  const spirit = policy.access.spirit;
  const progression = { ...policy.progression, spiritLife: catalog.get(spirit.name)!.life ?? undefined,
    lineage: policy.progression.lineage.map(card => ({ ...card, life: catalog.get(card.name)!.life ?? undefined })) };
  const validNumber = (value: number | null | undefined) => value != null && Number.isFinite(value) && value >= 0;
  if (damageSources.some(source => !validNumber(source.reserve))
    || !validNumber(progression.spiritLife) || progression.lineage.some(card => !validNumber(card.life))
    || sources.some(source => source.mechanic === 'academy-guide' && !validNumber(source.allyLife))) return { status: 'missing' as const };
  const opening = Math.min(7, main.reduce((sum, line) => sum + line.quantity, 0));
  const scenarios = RAI_DAMAGE_SCENARIOS.map(scenario => {
    const points = estimateDrawAndDamageInfluence(sources, [], opening, 'first', 5, 512, progression, scenario);
    return { id: scenario.id, label: scenario.label,
      damageSources: damageSources.filter(source => !needsAlly(source.damage) || scenario.allies > 0).map(({ name, quantity }) => ({ name, quantity })),
      points: points.map((point, index) => ({ turn: index + 1, damage: point.paidDamageRange,
        allies: point.paidAllyDamageRange, self: point.paidSelfDamageRange, recovery: point.paidRecoveryRange })) };
  });
  return { status: 'ready' as const,
    damageSources: damageSources.map(({ name, quantity }) => ({ name, quantity })),
    points: scenarios[0].points, scenarios };
}

export function compareRaiDamageReports(before: AnalyticsDeck, after: AnalyticsDeck, catalog: ReadonlyMap<string, Card>) {
  const baseline = computeRaiDamageReport(before, catalog), target = computeRaiDamageReport(after, catalog);
  if (baseline.status === 'missing' || target.status === 'missing') return { status: 'missing' as const };
  if (baseline.status !== 'ready' || target.status !== 'ready') return { status: 'unsupported' as const };
  return { status: 'ready' as const, sources: { before: baseline.damageSources, after: target.damageSources },
    points: [3, 5].map(turn => ({ turn, before: baseline.points[turn - 1].damage, after: target.points[turn - 1].damage })),
    scenarios: baseline.scenarios.map((scenario, index) => ({ id: scenario.id, label: scenario.label,
      points: [3, 5].map(turn => ({ turn, before: scenario.points[turn - 1], after: target.scenarios[index].points[turn - 1] })) })) };
}
