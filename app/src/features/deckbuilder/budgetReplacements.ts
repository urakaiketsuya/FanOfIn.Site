import { availableDeckElements, budgetPricesFresh, cardLegalityStatus, isDeckElementCompatible, type Card } from '@gatcg/shared';
import { intentCards, mentionsCardName, extractConsumedTokens, extractConsumedSubtypes } from '../../lib/cardIntent';
import { effectRelatedCards, effectConcepts, statDiff } from '../../lib/cardSimilarity';
import { editDeck, type EditableDeck } from '../../lib/deckEditing';

export interface BudgetSwap {
  from: Card; to: Card; quantity: number; savings: number; unitBefore: number; unitAfter: number;
  match: 'Same effect pattern' | 'Same core effect' | 'Shared role'; preserved: string[];
  differences: ReturnType<typeof statDiff>; tournamentDecks: number;
}
export interface BudgetSwapContext {
  deck: EditableDeck; catalog: Map<string, Card>; prices: Map<string, number>; pricesAsOf?: string;
  now: number; includeRoleMatches?: boolean; protectedNames: Set<string>; tournamentDecks?: Map<string, number>;
}
/** Conservative Standard Main-only proposals. Every acceptance runs these gates again. */
export function budgetReplacements(context: BudgetSwapContext, sourceName: string, quantity: number): BudgetSwap[] {
  const { deck, catalog, prices, now, protectedNames } = context;
  if (!budgetPricesFresh(context.pricesAsOf ?? null, now)) return [];
  if ([...deck.main, ...deck.material, ...deck.sideboard].some(line => line.quantity > 0 && !catalog.has(line.card))) return [];
  const source = deck.main.find(line => line.card === sourceName), from = catalog.get(sourceName);
  if (!source || !from || source.printings?.length || protectedNames.has(sourceName) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > source.quantity) return [];
  if (from.types.some(type => ['CHAMPION', 'REGALIA', 'TOKEN'].includes(type))) return [];
  const unitBefore = prices.get(sourceName);
  if (unitBefore === undefined || !Number.isFinite(unitBefore) || unitBefore < 0) return [];
  const cards = [...catalog.values()];
  const present = new Set([...deck.main, ...deck.material, ...deck.sideboard].filter(line => line.quantity > 0).map(line => line.card));
  const intentCatalog = cards.filter(card => present.has(card.name) || card.types.includes("TOKEN"));
  const links = (card: Card) => {
    const intent = intentCards(card, intentCatalog);
    return (['feeds', 'poweredBy'] as const).flatMap(direction => intent[direction].filter(m => m.tier === 'validated' && present.has(m.card.name) && m.card.name !== sourceName).map(m => ({ key: `${direction}:${m.card.name}:${m.via}`, via: m.via })));
  };
  const originalLinks = links(from);
  if (originalLinks.some(link => link.via === 'named reference')) return [];
  const subtypes = new Set(cards.flatMap(card => card.subtypes.map(s => s.toLowerCase())));
  const requirements = (card: Card) => new Set([...extractConsumedTokens(card)].map(s => `token:${s}`).concat([...extractConsumedSubtypes(card, subtypes)].filter(([, tier]) => tier === 'validated').map(([s]) => `subtype:${s}`)));
  const oldRequirements = requirements(from);
  const material = deck.material.map(line => catalog.get(line.card));
  const elements = availableDeckElements(material);
  const related = effectRelatedCards(from, cards);
  const roleConcepts = new Set(['draw', 'damage', 'recover', 'negate', 'glimpse', 'protection']);
  const sourceRoles = effectConcepts(from).filter(c => roleConcepts.has(c.id)).map(c => c.id);
  const candidates = [...related.exact.map(to => ({ to, rank: 0 })), ...related.core.map(to => ({ to, rank: 1 })), ...(context.includeRoleMatches && sourceRoles.length ? related.concept.filter(({ card }) => sourceRoles.every(role => effectConcepts(card).some(c => c.id === role))).map(({ card: to }) => ({ to, rank: 2 })) : [])];
  return candidates.flatMap(({ to, rank }): (BudgetSwap & { rank: number })[] => {
    if (to.name === from.name || to.types.some(t => ['CHAMPION', 'REGALIA', 'TOKEN'].includes(t)) || !to.types.some(t => t !== 'UNIQUE' && from.types.includes(t)) || cardLegalityStatus(to, 'STANDARD') !== 'allowed' || !isDeckElementCompatible(to, elements, material)) return [];
    if (to.cost.type !== from.cost.type) return [];
    const limit = Math.min(4, to.legality?.STANDARD?.limit ?? 4);
    const existing = [...deck.main, ...deck.material, ...deck.sideboard].filter(line => line.card === to.name).reduce((sum, line) => sum + line.quantity, 0);
    if (existing + quantity > limit || [...requirements(to)].some(key => !oldRequirements.has(key))) return [];
    const unitAfter = prices.get(to.name);
    if (unitAfter === undefined || !Number.isFinite(unitAfter) || unitAfter < 0) return [];
    const savings = (Math.round(unitBefore * 100) - Math.round(unitAfter * 100)) * quantity / 100;
    if (savings <= 0) return [];
    const candidateLinks = links(to);
    if (originalLinks.some(link => !candidateLinks.some(other => other.key === link.key))) return [];
    // New named dependencies are never assumed to be interchangeable or already supported.
    if (to.references?.length || cards.some(other => other.name !== to.name && !other.types.includes('TOKEN') && mentionsCardName(to.effect ?? '', other.name))) return [];
    if (editDeck(deck, { type: 'replace-main', name: from.name, replacement: to.name, quantity }, catalog) === deck) return [];
    return [{ from, to, quantity, savings, unitBefore, unitAfter, rank, match: rank === 0 ? 'Same effect pattern' : rank === 1 ? 'Same core effect' : 'Shared role', preserved: [...new Set(originalLinks.map(link => link.via))], differences: statDiff(from, to), tournamentDecks: context.tournamentDecks?.get(to.name) ?? 0 }];
  }).sort((a, b) => a.rank - b.rank || b.tournamentDecks - a.tournamentDecks || b.savings - a.savings || a.to.name.localeCompare(b.to.name));
}
