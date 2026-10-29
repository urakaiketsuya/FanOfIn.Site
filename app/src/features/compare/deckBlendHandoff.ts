import type { Card, DeckFormat, OmnidexDecklist } from '@gatcg/shared';
import { buildDeckBuilderPath, deckBuilderParamsFromDecklist, type LockedSection } from '../../lib/deckBuilderLink';

/** Keep every section and copy, including sideboard Spirits, in the editable draft. */
export function blendBuilderPath(decklist: OmnidexDecklist, format: DeckFormat, cards: Map<string, Card>): string | null {
  const identity = deckBuilderParamsFromDecklist({main: [], material: decklist.material, sideboard: []}, cards);
  if (!identity) return null;
  const quantities = new Map<string, number>();
  const sections = new Map<string, LockedSection>();
  for (const section of ['main', 'material', 'sideboard'] as const) {
    for (const line of decklist[section]) {
      const key = `${section}\0${line.card}`;
      quantities.set(key, (quantities.get(key) ?? 0) + line.quantity);
      sections.set(key, section);
    }
  }
  // Identity detection must use Material only: a sideboard Spirit cannot change the base.
  return `${buildDeckBuilderPath(identity.championName, identity.spiritFilter, quantities, sections)}&format=${format}&tab=build`;
}
