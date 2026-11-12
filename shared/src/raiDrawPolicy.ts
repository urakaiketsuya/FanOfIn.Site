import { reviewedChampionAccess, reviewedElementMinimumLevel } from './championAccess.js';
import { RECURSION_CARDS } from './recursionPolicy.js';
import { CONDITIONAL_DRAW_CONTRACTS } from './conditionalDrawPolicy.js';
import type { Card } from './api-types.js';
import { supportedDrawEffect, type DrawProgressionPolicy, type InfluenceDrawSource } from './drawInfluence.js';

/** Reviewed draw-focused Rai policy. Other activated abilities and Main plays are omitted. */
export function createRaiDrawPolicy(
  main: { name: string; quantity: number }[],
  material: { name: string; quantity: number }[],
  catalog: ReadonlyMap<string, Card>,
): { main: InfluenceDrawSource[]; progression: DrawProgressionPolicy; modeled: Set<string>; access: NonNullable<ReturnType<typeof reviewedChampionAccess>> } | null {
  if ([...main, ...material].some(line => line.quantity > 0 && !catalog.has(line.name))) return null;
  const access = reviewedChampionAccess(material, catalog, 'rai');
  if (!access) return null;
  const { lineage, element } = access;
  const modeled = new Set<string>(lineage.slice(0, 2).map(card => card.name));
  const sources = main.filter(line => line.quantity > 0).map(line => {
    const card = catalog.get(line.name)!;
    const accessLevel = reviewedElementMinimumLevel(card.element, element, access.advanced);
    const enabled = Number.isFinite(accessLevel);
    const mechanic = enabled && line.name === 'Academy Guide' ? 'academy-guide' as const
      : enabled && line.name === 'Gloamspire, Black Market' ? 'gloamspire' as const
      : enabled && line.name === 'Epicurean Institute' ? 'recollection-hand' as const
      : enabled && line.name === 'Sovereign Sanctuary' ? 'recollection-memory' as const
      : enabled && line.name === 'Careful Study' ? 'careful-study' as const
      : enabled && line.name === 'Peer into Mana' ? 'peer-into-mana' as const
      : enabled && line.name === 'Indolent Leisure' ? 'indolent-leisure' as const : undefined;
    const contract = enabled ? CONDITIONAL_DRAW_CONTRACTS[line.name] : undefined;
    const recursion = enabled ? RECURSION_CARDS.find(name => name === line.name) : undefined;
    const effect = enabled ? supportedDrawEffect(card) : null;
    const steps = mechanic === 'indolent-leisure' ? [{ count: 1, destination: 'hand' as const }] : contract?.drawSteps ?? effect?.steps ?? [];
    if (effect || mechanic || contract || recursion) modeled.add(line.name);
    return { ...line, draws: steps.reduce((sum, step) => sum + step.count, 0), drawSteps: steps,
      resolvesTo: card.types.includes('ACTION') ? 'graveyard' as const : 'field' as const,
      reserve: card.cost_reserve, minimumLevel: Math.max(accessLevel, contract?.minimumLevel ?? 0, recursion === 'Breezy Looper' ? 1 : recursion === 'Reconstructive Surgery' ? 2 : 0),
      conditionalDraw: contract?.conditionalDraw, recursion,
      element: card.element, subtypes: card.subtypes, ally: card.types.includes('ALLY'),
      action: card.types.includes('ACTION'), item: card.types.includes('ITEM'), unique: card.types.includes('UNIQUE'),
      floatingMemory: CONDITIONAL_DRAW_CONTRACTS[line.name]?.floatingMemory,
      spell: card.subtypes.includes('SPELL'), waterElement: card.element === 'WATER',
      allyLife: card.types.includes('ALLY') ? card.life ?? undefined : undefined, discard: effect?.discard ?? 0, mechanic,
      mageAction: card.types.includes('ACTION') && card.classes.includes('MAGE') };
  });
  return { main: sources, progression: { lineage, rai: true }, modeled, access };
}
