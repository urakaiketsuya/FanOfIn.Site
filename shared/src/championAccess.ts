import type { Card } from './api-types.js';
import { aggregateLines } from './fixtureResources.js';

/** Explicitly reviewed seven-card openings; no inference from a Spirit's name. */
export const REVIEWED_SPIRITS = {
  'Spirit of Fire': 'FIRE', 'Aithne, Spirit of Fire': 'FIRE', 'Hanabi, Spirit of Fire': 'FIRE', 'Vyra, Spirit of Fire': 'FIRE',
  'Spirit of Water': 'WATER', 'Miao, Spirit of Water': 'WATER', 'Minthe, Spirit of Water': 'WATER', 'Sabrina, Spirit of Water': 'WATER',
  'Spirit of Wind': 'WIND', 'Brissa, Spirit of Wind': 'WIND', 'Gwendolyn, Spirit of Wind': 'WIND', 'Kaze, Spirit of Wind': 'WIND',
} as const;
export const REVIEWED_LINEAGES = {
  rai: ['Rai, Spellcrafter', 'Rai, Archmage', 'Rai, Mana Weaver'],
  diao: ['Diao Chan, Enchantress', 'Diao Chan, Dreaming Wish', 'Diao Chan, Idyll Corsage'],
  tonoris: ['Tonoris, Lone Mercenary', 'Tonoris, Might of Humanity', 'Tonoris, Genesis Aegis'],
} as const;

export function reviewedChampionAccess(material: { name: string; quantity: number }[], catalog: ReadonlyMap<string, Card>, family: keyof typeof REVIEWED_LINEAGES) {
  const lines = aggregateLines(material);
  if (lines.some(line => !catalog.has(line.name))) return null;
  const champions = lines.filter(line => catalog.get(line.name)!.types.includes('CHAMPION'));
  const spiritLine = champions.find(line => Object.hasOwn(REVIEWED_SPIRITS, line.name));
  if (!spiritLine || champions.length !== 4 || champions.some(line => line.quantity !== 1)) return null;
  const spirit = catalog.get(spiritLine.name)!;
  if (spirit.level !== 0 || spirit.element !== REVIEWED_SPIRITS[spiritLine.name as keyof typeof REVIEWED_SPIRITS]) return null;
  const lineage = REVIEWED_LINEAGES[family].map(name => catalog.get(name));
  if (lineage.some((card, index) => !card || !champions.some(line => line.name === card.name)
    || card.level !== index + 1 || card.cost_memory == null || !Number.isFinite(card.cost_memory) || card.cost_memory < 0)) return null;
  const cards = lineage as Card[];
  return { spirit, element: spirit.element, advanced: cards[2].element, lineage: cards.map(card => ({ name: card.name, memory: card.cost_memory! })) };
}

/** Access from the retained basic Spirit and paid level-three champion. */
export function hasReviewedElementAccess(element: string, basic: string, advanced: string, level: number) {
  return element === 'NORM' || element === basic || (level >= 3 && (element === advanced || element === 'EXALTED'));
}
export function reviewedElementMinimumLevel(element: string, basic: string, advanced: string) {
  return hasReviewedElementAccess(element, basic, advanced, 0) ? 0
    : hasReviewedElementAccess(element, basic, advanced, 3) ? 3 : Infinity;
}
