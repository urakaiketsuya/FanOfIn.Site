import type { Card } from "@gatcg/shared";

/** Refresh equal timestamps too: legality can change without a card-text update. */
export function publishedCardUpdates(published: Card[], cached: (Card | undefined)[]): Card[] {
  return published.filter((card, index) => !cached[index] || cached[index]!.last_update <= card.last_update);
}
