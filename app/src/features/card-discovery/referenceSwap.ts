import { availableDeckElements, cardLegalityStatus, isAvailableDeckRecommendation, preservesRecommendationDependencies, type Card } from '@gatcg/shared';
import { deckDestinationEligibility } from '../../lib/deckSectionEligibility';
import { previewReportSwap } from '../deck-analysis/reportDraft';
import type { DeckWorkspace } from '../deckbuilder/persistence/deckWorkspace';

/** A user-chosen one-copy Main swap, validated against the complete reference list. */
export function referenceSwap(deck: DeckWorkspace, cut: string, add: string, cards: ReadonlyMap<string, Card>): DeckWorkspace | null {
  if (cut === add || deck.format !== 'STANDARD') return null;
  const lines = [...deck.main, ...deck.material, ...deck.sideboard];
  if (!deck.main.length || lines.some(line => !cards.has(line.name) || !Number.isInteger(line.quantity) || line.quantity <= 0)) return null;
  if (deck.printings?.main?.[cut]?.length) return null;
  const card = cards.get(add);
  if (!card || !deckDestinationEligibility(card, 'main').allowed || cardLegalityStatus(card, deck.format) !== 'allowed') return null;
  const elements = availableDeckElements(deck.material.map(line => cards.get(line.name)));
  if (!isAvailableDeckRecommendation(card, elements)) return null;
  const count = lines.filter(line => line.name === add).reduce((sum, line) => sum + line.quantity, 0);
  if (count >= (card.legality?.STANDARD?.limit ?? 4)) return null;
  const next = previewReportSwap(deck, { cut, add, referenceId: '', reason: '', gain: 0 }, cards);
  const dependencies = (value: DeckWorkspace) => (['main', 'material', 'sideboard'] as const).flatMap(section => value[section].map(line => ({ cardName: line.name, quantity: line.quantity, section })));
  return next && preservesRecommendationDependencies(dependencies(deck), dependencies(next), cards) ? next : null;
}
