import { cardLegalityStatus, availableDeckElements, isAvailableDeckRecommendation, type Card } from '@gatcg/shared';
import { swapMainCard } from '../../lib/deckEditing';
import { ACTIVE_DECK_WORKSPACE_KEY, type DeckWorkspace } from '../deckbuilder/persistence/deckWorkspace';
import type { ReportSwap } from './reportModel';
export function previewReportSwap(deck: DeckWorkspace, swap: ReportSwap, catalog: ReadonlyMap<string, Card>) {
  const edited = swapMainCard({ main: deck.main.map(line => ({ card: line.name, quantity: line.quantity, printings: deck.printings?.main?.[line.name] })), material: [], sideboard: [], maybeboard: [] }, swap.cut, swap.add, catalog);
  return edited ? { ...deck, main: edited.main.map(line => ({ name: line.card, quantity: line.quantity })) } : null;
}
/** One storage write holds the new draft and its original; failures leave both unchanged. */
export function persistReportSwap(storage: Pick<Storage, 'setItem'>, deck: DeckWorkspace, swap: ReportSwap, catalog: ReadonlyMap<string, Card>): DeckWorkspace {
  const next = previewReportSwap(deck, swap, catalog);
  const card = catalog.get(swap.add), limit = card?.legality?.[deck.format]?.limit ?? (deck.format === 'PANTHEON' ? 1 : 4);
  const copies = next ? [...next.main, ...next.material, ...next.sideboard].filter(line => line.name === swap.add).reduce((sum, line) => sum + line.quantity, 0) : 0;
  const elements = availableDeckElements(deck.material.map(line => catalog.get(line.name)));
  if (!next || !card || cardLegalityStatus(card, deck.format) !== 'allowed' || copies > limit || !isAvailableDeckRecommendation(card, elements)) throw new Error('The swap is no longer valid. Refresh suggestions.');
  const draft = { ...next, reportOriginal: deck.reportOriginal ?? JSON.stringify(deck), updatedAt: new Date().toISOString() };
  storage.setItem(ACTIVE_DECK_WORKSPACE_KEY, JSON.stringify(draft));
  return draft;
}
