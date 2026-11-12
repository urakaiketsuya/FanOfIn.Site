import type { DeckWorkspace } from '../deckbuilder/persistence/deckWorkspace';

/** Review owns the selected sections; account identity and secondary draft data survive. */
export function reviewWorkspace(previous: DeckWorkspace | null, current: Pick<DeckWorkspace, 'format' | 'championName' | 'spiritName' | 'main' | 'material' | 'sideboard' | 'song'>): Omit<DeckWorkspace, 'version' | 'updatedAt'> {
  return { ...previous, ...current, source: 'review', title: previous?.title ?? null, sourceLabel: previous?.sourceLabel ?? 'Improve Deck', maybeboard: previous?.maybeboard ?? [] };
}
