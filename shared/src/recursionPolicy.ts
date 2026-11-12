import type { InfluenceDrawSource } from './drawInfluence.js';

/** Reviewed effects for the paid Rai lineage (maximum level 3). */
export const RECURSION_CARDS = ['Aenean Cyclic Winds', 'Cyclical Breeze', 'Lost Wisdom', 'Breezy Looper', 'Primeval Ritual', 'Reconstructive Surgery', 'Scavenge the Distillery', 'Advantageous Perch'] as const;
export type RecursionEffect = typeof RECURSION_CARDS[number];
export function recursionTarget(effect: RecursionEffect, card: InfluenceDrawSource): boolean {
  switch (effect) {
    case 'Aenean Cyclic Winds': case 'Lost Wisdom': return !!card.spell;
    case 'Cyclical Breeze': return card.element === 'WIND' && !!card.spell;
    case 'Breezy Looper': return !!card.subtypes?.some(type => type === 'HARMONY' || type === 'MELODY');
    case 'Primeval Ritual': return card.element === 'WIND';
    case 'Reconstructive Surgery': return !!card.ally && !!card.subtypes?.includes('AUTOMATON');
    case 'Scavenge the Distillery': return !!card.item && !!card.subtypes?.includes('POTION');
    case 'Advantageous Perch': return !!card.action && !!card.subtypes?.includes('RANGER');
  }
}
export function recursionDiscount(effect: RecursionEffect | undefined, level: number, field: readonly InfluenceDrawSource[], mage = level >= 1) {
  if (!mage) return 0; // Spirit has no Mage class.
  if (effect === 'Cyclical Breeze' || (effect === 'Aenean Cyclic Winds' && level >= 3)
    || (effect === 'Lost Wisdom' && field.some(card => card.ally && card.unique))) return 2;
  return 0;
}
export function recursionDestination(effect: RecursionEffect) {
  return effect === 'Cyclical Breeze' || effect === 'Scavenge the Distillery' || effect === 'Advantageous Perch' ? 'hand' : 'memory';
}

/** Resolve against the same physical target; prior payment/trigger banishment can fizzle it. */
export function resolveRecursion(effect: RecursionEffect, target: InfluenceDrawSource | undefined, zones: { hand: InfluenceDrawSource[]; memory: InfluenceDrawSource[]; graveyard: InfluenceDrawSource[] }) {
  if (!target || !recursionTarget(effect, target)) return false;
  const index = zones.graveyard.indexOf(target);
  if (index < 0) return false;
  zones.graveyard.splice(index, 1);
  zones[recursionDestination(effect)].push(target);
  return true;
}
