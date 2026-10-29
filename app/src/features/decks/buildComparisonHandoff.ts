import type { OmnidexDecklist } from '@gatcg/shared';

type Deck = Pick<OmnidexDecklist, 'main' | 'material'>;
export interface BuildComparisonHandoff {
  buildId: string;
  championName: string;
  decklist: Deck;
}

/** History state keeps a deck snapshot across reload/back without publishing its contents in a URL. */
export function buildComparisonState(buildId: string, championName: string, decklist: Deck) {
  const copy = (lines: Deck['main']) => lines.map(({ card, quantity }) => ({ card, quantity }));
  return { buildComparison: { buildId, championName, decklist: { main: copy(decklist.main), material: copy(decklist.material) } } };
}

export function readBuildComparisonState(state: unknown, buildId: string): BuildComparisonHandoff | null {
  if (!state || typeof state !== 'object' || !('buildComparison' in state)) return null;
  const value = state.buildComparison;
  if (!value || typeof value !== 'object' || !('buildId' in value) || value.buildId !== buildId ||
    !('championName' in value) || typeof value.championName !== 'string' || !value.championName.trim() ||
    !('decklist' in value) || !value.decklist || typeof value.decklist !== 'object') return null;
  const deck = value.decklist;
  const valid = (lines: unknown): lines is Deck['main'] => Array.isArray(lines) && lines.length > 0 && lines.every(line =>
    line && typeof line === 'object' && typeof line.card === 'string' && line.card.trim() && Number.isSafeInteger(line.quantity) && line.quantity > 0);
  if (!('main' in deck) || !('material' in deck) || !valid(deck.main) || !valid(deck.material)) return null;
  return { buildId, championName: value.championName, decklist: { main: deck.main, material: deck.material } };
}
