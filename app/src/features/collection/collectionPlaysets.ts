import type { Card, CollectionEntry, CollectionUpdateLine } from "@gatcg/shared";

export function playsetTarget(card: Card): number {
  return card.cost_memory != null || card.cost?.type === "memory" ? 1 : 4;
}

/** Collection goals are independent of deck legality and pool physical printings only. */
export function playsetProgress(cards: Card[], quantities: ReadonlyMap<string, number>) {
  let complete = 0;
  let missingCopies = 0;
  for (const card of cards) {
    const target = playsetTarget(card);
    const owned = quantities.get(card.uuid) ?? 0;
    if (owned >= target) complete++;
    missingCopies += Math.max(0, target - owned);
  }
  return { complete, total: cards.length, missingCopies, percent: cards.length ? Math.floor(100 * complete / cards.length) : 0 };
}

/** Add only the shortfall to unspecified copies; exact printing and proxy quantities survive. */
export function completePlaysetLine(card: Card, entries: CollectionEntry[]): CollectionUpdateLine | null {
  const target = playsetTarget(card);
  const ownEntries = entries.filter(entry => entry.cardUuid === card.uuid);
  const owned = ownEntries.reduce((sum, entry) => sum + Math.max(0, entry.ownedQuantity), 0);
  const shortfall = Math.max(0, target - owned);
  if (!shortfall) return null;
  const canonical = ownEntries.find(entry => !entry.editionUuid);
  return { cardUuid: card.uuid, cardName: card.name, quantity: (canonical?.ownedQuantity ?? 0) + shortfall, proxyQuantity: canonical?.proxyQuantity ?? 0 };
}

export function playsetMilestone(complete: number, total: number): string {
  if (!complete || !total) return "Your first playset awaits";
  if (complete >= total) return "Every playset complete!";
  if (complete * 4 >= total * 3) return "Three quarters of playsets complete";
  if (complete * 2 >= total) return "Half the playsets complete";
  if (complete * 4 >= total) return "A quarter of playsets complete";
  return "First playset complete";
}
