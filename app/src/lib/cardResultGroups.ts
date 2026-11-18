import { searchSetFamily, type Card } from '@gatcg/shared';
import { previewCardSet } from './previewCards';

export const CARD_GROUPS = { none: 'None', elements: 'Element', sets: 'Set', classes: 'Class', types: 'Type' } as const;
export type CardGrouping = keyof typeof CARD_GROUPS;

/** Input order is the selected sort; each membership retains that order. */
export function groupCardResults<T>(items: readonly T[], cardFor: (item: T) => Card | undefined, grouping: CardGrouping) {
  if (grouping === 'none') return [{ label: '', items: [...items] }];
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const card = cardFor(item);
    const labels = card ? grouping === 'sets'
      ? card.editions.map(edition => searchSetFamily(edition.set).prefix).concat(previewCardSet(card) ?? [])
      : card[grouping] : [];
    for (const label of new Set(labels.length ? labels : ['Unknown'])) {
      const members = groups.get(label) ?? [];
      members.push(item);
      groups.set(label, members);
    }
  }
  return [...groups].sort(([a], [b]) => a === 'Unknown' ? 1 : b === 'Unknown' ? -1 : a.localeCompare(b))
    .map(([label, members]) => ({ label, items: members }));
}
