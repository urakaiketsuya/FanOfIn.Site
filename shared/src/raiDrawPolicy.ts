import { CONDITIONAL_DRAW_CONTRACTS } from './conditionalDrawPolicy.js';
import type { Card } from './api-types.js';
import { supportedDrawEffect, type DrawProgressionPolicy, type InfluenceDrawSource } from './drawInfluence.js';

const LINEAGE = ['Rai, Spellcrafter', 'Rai, Archmage', 'Rai, Mana Weaver'];
const SPIRITS = ['Spirit of Fire', 'Spirit of Water', 'Spirit of Wind'];

/** Reviewed draw-focused Rai policy. Other activated abilities and Main plays are omitted. */
export function createRaiDrawPolicy(
  main: { name: string; quantity: number }[],
  material: { name: string; quantity: number }[],
  catalog: ReadonlyMap<string, Card>,
): { main: InfluenceDrawSource[]; progression: DrawProgressionPolicy; modeled: Set<string> } | null {
  const champions = material.filter(line => line.quantity > 0 && catalog.get(line.name)?.types.includes('CHAMPION'));
  const spirit = champions.find(line => SPIRITS.includes(line.name));
  if (!spirit || champions.length !== 4 || !LINEAGE.every(name => champions.some(line => line.name === name))) return null;
  if ([...main, ...material].some(line => line.quantity > 0 && !catalog.has(line.name))) return null;
  const lineage = LINEAGE.map(name => ({ name, memory: catalog.get(name)!.cost_memory! }));
  if (lineage.some(card => card.memory == null || card.memory < 0)) return null;
  const element = catalog.get(spirit.name)!.element;
  const modeled = new Set<string>(LINEAGE.slice(0, 2));
  const sources = main.filter(line => line.quantity > 0).map(line => {
    const card = catalog.get(line.name)!;
    const advanced = card.element === 'ARCANE' || card.element === 'EXALTED';
    const enabled = card.element === 'NORM' || card.element === element || advanced;
    const mechanic = enabled && line.name === 'Academy Guide' ? 'academy-guide' as const
      : enabled && line.name === 'Gloamspire, Black Market' ? 'gloamspire' as const
      : enabled && line.name === 'Epicurean Institute' ? 'recollection-hand' as const
      : enabled && line.name === 'Sovereign Sanctuary' ? 'recollection-memory' as const
      : enabled && line.name === 'Careful Study' ? 'careful-study' as const
      : enabled && line.name === 'Peer into Mana' ? 'peer-into-mana' as const
      : enabled && line.name === 'Indolent Leisure' ? 'indolent-leisure' as const : undefined;
    const contract = enabled ? CONDITIONAL_DRAW_CONTRACTS[line.name] : undefined;
    const effect = enabled ? supportedDrawEffect(card) : null;
    const steps = mechanic === 'indolent-leisure' ? [{ count: 1, destination: 'hand' as const }] : contract?.drawSteps ?? effect?.steps ?? [];
    if (effect || mechanic || contract) modeled.add(line.name);
    return { ...line, draws: steps.reduce((sum, step) => sum + step.count, 0), drawSteps: steps,
      resolvesTo: card.types.includes('ACTION') ? 'graveyard' as const : 'field' as const,
      reserve: card.cost_reserve, minimumLevel: Math.max(advanced ? 3 : 0, contract?.minimumLevel ?? 0),
      conditionalDraw: contract?.conditionalDraw,
      floatingMemory: CONDITIONAL_DRAW_CONTRACTS[line.name]?.floatingMemory,
      spell: card.subtypes.includes('SPELL'), waterElement: card.element === 'WATER',
      allyLife: card.types.includes('ALLY') ? card.life ?? undefined : undefined, discard: effect?.discard ?? 0, mechanic,
      mageAction: card.types.includes('ACTION') && card.classes.includes('MAGE') };
  });
  return { main: sources, progression: { lineage, rai: true }, modeled };
}
