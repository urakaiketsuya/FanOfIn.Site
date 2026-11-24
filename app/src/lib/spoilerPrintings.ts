import type { PreviewCardRecord } from './previewCards';

interface Printing {
  setPrefix: string;
  collectorNumber: string | null;
  rarity: string | null;
  image: string;
  addedAt?: string;
}

/** Expand artwork without duplicating identities in the shared deck-building catalog. */
export function expandSpoilerPrintings<T extends PreviewCardRecord & Printing & { addedAt: string; altPrintings?: Printing[] }>(cards: readonly T[]) {
  return cards.flatMap(card => [card, ...(card.altPrintings ?? [])].map(printing => ({
    ...card,
    ...printing,
    addedAt: printing.addedAt ?? card.addedAt,
    printingId: `${card.name}:${printing.setPrefix}:${printing.collectorNumber ?? ''}:${printing.rarity ?? ''}:${printing.image}`,
  })));
}
