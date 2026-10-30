import type { DeckWorkspace } from '../deckbuilder/persistence/deckWorkspace';
import type { LockedSection } from '../deckbuilder/model/builderTypes';

/** The ranking engine has one slot per name; retain overlapping Sideboard copies separately. */
export function reviewSelections(workspace: Pick<DeckWorkspace, 'main' | 'material' | 'sideboard'>) {
  const cards = new Map<string, number>();
  const sections = new Map<string, LockedSection>();
  const sideboard = new Map<string, number>();
  for (const section of ['main', 'material', 'sideboard'] as const) {
    for (const { name, quantity } of workspace[section]) {
      if (section === 'sideboard' && cards.has(name) && sections.get(name) !== 'sideboard') {
        sideboard.set(name, (sideboard.get(name) ?? 0) + quantity);
      } else {
        cards.set(name, (cards.get(name) ?? 0) + quantity);
        sections.set(name, section);
      }
    }
  }
  return { cards, sections, sideboard };
}
