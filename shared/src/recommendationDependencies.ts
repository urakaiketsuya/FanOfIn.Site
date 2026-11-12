import type { Card } from "./api-types.js";

export type RecommendationLine = { cardName: string; quantity: number; section: "main" | "material" | "sideboard" };

/** Reviewed catalog contracts. These are dependency guards, never performance scores. */
function legacyEngineDependencies(lines: readonly RecommendationLine[], catalog: ReadonlyMap<string, Card>): Set<string> {
  const active = lines.filter(l => l.quantity > 0 && l.section !== 'sideboard');
  const names = new Set(active.map(l => l.cardName));
  const protectedNames = new Set<string>();
  const link = (a: string[], b: string[]) => {
    if (!a.length || !b.length || !a.some(x => b.some(y => x !== y))) return;
    for (const name of [...a, ...b]) protectedNames.add(name);
  };
  const tokens = active.filter(l => /\bsummon\b[^.\n]*\btoken/i.test(catalog.get(l.cardName)?.effect ?? '')).map(l => l.cardName);
  const domains = active.filter(l => catalog.get(l.cardName)?.types.includes('DOMAIN')).map(l => l.cardName);
  // Exact reviewed consumers avoid treating incidental keyword reminder text as an engine.
  link(tokens, ['Automata Genesis', 'Cordelia, Aurous Kaiser', 'Blade of Creation', 'Archon Broadsword', 'Neos Sight'].filter(n => names.has(n)));
  link(domains, ['The Eternal Kingdom', 'Edge of Tomorrow'].filter(n => names.has(n)));
  link(['Atmos Armor Type-Ares'].filter(n => names.has(n)), ['Blade of Creation', 'Archon Broadsword', 'Automata Genesis', 'Cordelia, Aurous Kaiser'].filter(n => names.has(n)));
  // Altar consumes both ally types. Token producers can supply Automata; use the catalog
  // for Humans. Keep the consumer and present sources together, not a single preferred source.
  const humans = active.filter(l => { const c = catalog.get(l.cardName); return c?.types.includes('ALLY') && c.subtypes.includes('HUMAN'); }).map(l => l.cardName);
  const automata = ['Cordelia, Aurous Kaiser', 'Automata Genesis', 'Tonoris, Genesis Aegis'].filter(n => names.has(n));
  if (names.has('Dormant Sacrificial Altar') && humans.length && automata.length) {
    link(['Dormant Sacrificial Altar'], [...humans, ...automata]);
  }
  return protectedNames;
}

/** Reviewed resource relationships from the imported TCGEngine scenarios. Presence
 * is construction support, not a claim that a resource is drawn, paid or in play. */
export const RECOMMENDATION_CONTRACTS = [
  { consumer: 'Blade of Creation', resources: ['tokens'] },
  { consumer: 'Archon Broadsword', resources: ['tokens'] },
  { consumer: 'Neos Sight', resources: ['objects'] },
  { consumer: 'The Eternal Kingdom', resources: ['domains'] },
  { consumer: 'Edge of Tomorrow', resources: ['domains'] },
  { consumer: 'Dormant Sacrificial Altar', resources: ['humans', 'automata'] },
  { consumer: 'Imperial Apprentice', resources: ['spells', 'floating-memory'] },
  { consumer: 'Winbless Forecaster', resources: ['enlighten'] },
  { consumer: 'Lost Wisdom', resources: ['spells', 'unique-allies'] },
  { consumer: 'Primeval Ritual', resources: ['allies', 'wind'] },
] as const;
type Resource = typeof RECOMMENDATION_CONTRACTS[number]['resources'][number];
const TOKEN_SOURCES = new Set(['Automata Genesis', 'Cordelia, Aurous Kaiser', 'Tonoris, Genesis Aegis', 'Atmos Armor Type-Ares', 'Production Crawldroid', 'Reactivate Drone']);
function supplies(card: Card, resource: Resource): boolean {
  switch (resource) {
    case 'tokens': return TOKEN_SOURCES.has(card.name);
    case 'objects': return TOKEN_SOURCES.has(card.name) || card.types.some(type => ['ALLY', 'ITEM', 'DOMAIN', 'WEAPON', 'REGALIA'].includes(type));
    case 'domains': return card.types.includes('DOMAIN');
    case 'humans': return card.types.includes('ALLY') && card.subtypes.includes('HUMAN');
    case 'automata': return (card.types.includes('ALLY') && card.subtypes.includes('AUTOMATON')) || ['Automata Genesis', 'Cordelia, Aurous Kaiser', 'Tonoris, Genesis Aegis', 'Reactivate Drone'].includes(card.name);
    case 'spells': return card.subtypes.includes('SPELL');
    case 'floating-memory': return /\*\*Floating Memory\*\*/i.test(card.effect ?? '');
    case 'enlighten': return ['Rai, Spellcrafter', 'Rai, Archmage', 'Careful Study', 'Peer into Mana', 'Channel the Wind', 'Mistbound Watcher', 'Windrider Mage'].includes(card.name);
    case 'unique-allies': return card.types.includes('ALLY') && card.types.includes('UNIQUE');
    case 'allies': return card.types.includes('ALLY') || TOKEN_SOURCES.has(card.name) && card.name !== 'Atmos Armor Type-Ares';
    case 'wind': return card.elements.includes('WIND');
  }
}
export function recommendationDependencies(lines: readonly RecommendationLine[], catalog: ReadonlyMap<string, Card>) {
  const active = lines.filter(line => line.quantity > 0 && line.section !== 'sideboard');
  return RECOMMENDATION_CONTRACTS.filter(contract => active.some(line => line.cardName === contract.consumer)).flatMap(contract =>
    contract.resources.map(resource => ({ consumer: contract.consumer, resource,
      supporters: [...new Set(active.filter(line => line.cardName !== contract.consumer && (!['spells', 'floating-memory', 'wind'].includes(resource) || line.section === 'main') && catalog.has(line.cardName) && supplies(catalog.get(line.cardName)!, resource)).map(line => line.cardName))],
    })),
  );
}

/** Standalone cuts cannot remove a reviewed engine partner. */
export function engineDependencies(lines: readonly RecommendationLine[], catalog: ReadonlyMap<string, Card>): Set<string> {
  const names = legacyEngineDependencies(lines, catalog);
  for (const group of recommendationDependencies(lines, catalog)) if (group.supporters.length) {
    names.add(group.consumer);
    for (const name of group.supporters) names.add(name);
  }
  return names;
}

/** Existing Tonoris engine quantities are preserved. New recursion cards need their reviewed targets/cost resources
 * represented in Main/Material; optional bonuses never block base effects. Unknown cards cannot establish support. */
export function preservesRecommendationDependencies(before: readonly RecommendationLine[], after: readonly RecommendationLine[], catalog: ReadonlyMap<string, Card>): boolean {
  if ([...before, ...after].some(line => line.quantity > 0 && line.section !== 'sideboard' && !catalog.has(line.cardName))) return false;
  const counts = (lines: readonly RecommendationLine[]) => {
    const result = new Map<string, number>();
    for (const line of lines) if (line.quantity > 0 && line.section !== 'sideboard') result.set(line.cardName, (result.get(line.cardName) ?? 0) + line.quantity);
    return result;
  };
  const oldCounts = counts(before), nextCounts = counts(after);
  for (const name of legacyEngineDependencies(before, catalog)) if ((nextCounts.get(name) ?? 0) < (oldCounts.get(name) ?? 0)) return false;
  const previous = recommendationDependencies(before, catalog);
  for (const group of recommendationDependencies(after, catalog)) {
    const oldGroup = previous.find(old => old.consumer === group.consumer && old.resource === group.resource);
    const supportCopies = group.supporters.reduce((sum, name) => sum + (nextCounts.get(name) ?? 0), 0);
    const oldSupportCopies = oldGroup?.supporters.reduce((sum, name) => sum + (oldCounts.get(name) ?? 0), 0) ?? 0;
    if (supportCopies < oldSupportCopies) return false;
    const needsSupport = group.consumer === 'Primeval Ritual' || group.consumer === 'Lost Wisdom' && group.resource === 'spells';
    if (needsSupport && !group.supporters.length && (nextCounts.get(group.consumer) ?? 0) > (oldCounts.get(group.consumer) ?? 0)) return false;
  }
  return true;
}
