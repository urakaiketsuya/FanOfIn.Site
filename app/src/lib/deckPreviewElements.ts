import type { Card } from '@gatcg/shared';

/** Spirits are CHAMPION cards too. Ignore other material and unknown catalog entries. */
export function deckPreviewElements(cards: readonly (Pick<Card, 'types' | 'element'> | undefined)[]): string[] {
  const elements = [...new Set(cards.filter(card => card?.types.includes('CHAMPION')).map(card => card?.element?.trim().toUpperCase()).filter((element): element is string => !!element))];
  return elements.some(element => element !== 'NORM') ? elements.filter(element => element !== 'NORM') : elements;
}
