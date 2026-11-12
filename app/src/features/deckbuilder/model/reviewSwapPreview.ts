import type { OmnidexDecklist } from '@gatcg/shared';
import { applyDeckQuantityChanges } from '../../../lib/deckChangePreview';

/** Review removes the selected cut and sets the addition's exact quantity. */
export function reviewSwapPreview(deck: OmnidexDecklist, removal: { cardName: string; section: keyof OmnidexDecklist }, addition: { cardName: string; section: keyof OmnidexDecklist; quantity: number }): OmnidexDecklist {
  const current = (name: string, section: keyof OmnidexDecklist) => (deck[section] ?? []).filter(line => line.card === name).reduce((sum, line) => sum + line.quantity, 0);
  return applyDeckQuantityChanges(deck, [
    { cardName: removal.cardName, section: removal.section, delta: -current(removal.cardName, removal.section) },
    { cardName: addition.cardName, section: addition.section, delta: addition.quantity - current(addition.cardName, addition.section) },
  ]);
}
