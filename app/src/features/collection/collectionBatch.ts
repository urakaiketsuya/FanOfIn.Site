import type { Card, CollectionEntry, CollectionUpdateLine, OmnidexDecklist } from "@gatcg/shared";

export const COLLECTION_RARITY_LABELS: Record<number, string> = {
  1: "Common",
  2: "Uncommon",
  3: "Rare",
  4: "Super Rare",
  5: "Ultra Rare",
  6: "Promotional Rare",
  7: "Collector Super Rare",
  8: "Collector Ultra Rare",
  9: "Collector Promo Rare",
};

export const DEFAULT_SET_RARITY_QUANTITIES: Record<number, number> = {
  1: 4,
  2: 4,
  3: 1,
  4: 0,
  5: 0,
  6: 0,
  7: 0,
  8: 0,
  9: 0,
};

function cardKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export function deckCollectionLines(decklist: OmnidexDecklist, cards: Card[], includeSideboard: boolean): CollectionUpdateLine[] {
  const cardsByName = new Map(cards.map((card) => [cardKey(card.name), card]));
  const quantities = new Map<string, CollectionUpdateLine>();
  const sections = includeSideboard ? [decklist.main, decklist.material, decklist.sideboard] : [decklist.main, decklist.material];
  for (const line of sections.flat()) {
    const card = cardsByName.get(cardKey(line.card));
    if (!card) continue;
    const current = quantities.get(card.uuid);
    if (current) current.quantity += line.quantity;
    else quantities.set(card.uuid, { cardUuid: card.uuid, cardName: card.name, quantity: line.quantity });
  }
  return Array.from(quantities.values()).sort((a, b) => a.cardName.localeCompare(b.cardName));
}

export function setRarityCollectionLines(cards: Card[], setPrefix: string, quantities: Readonly<Record<number, number>>): CollectionUpdateLine[] {
  const lines: CollectionUpdateLine[] = [];
  for (const card of cards) {
    const matchingRarities = new Set(card.editions.filter((edition) => edition.set.prefix === setPrefix).map((edition) => edition.rarity));
    const quantity = Math.max(0, ...Array.from(matchingRarities, (rarity) => quantities[rarity] ?? 0));
    if (quantity > 0) lines.push({ cardUuid: card.uuid, cardName: card.name, quantity });
  }
  return lines.sort((a, b) => a.cardName.localeCompare(b.cardName));
}

export function summarizeAtLeastChanges(lines: CollectionUpdateLine[], entries: CollectionEntry[]): { affectedCards: number; addedCopies: number; coveredCards: number } {
  const owned = new Map(entries.map((entry) => [entry.cardUuid, entry.ownedQuantity]));
  let affectedCards = 0; let addedCopies = 0; let coveredCards = 0;
  for (const line of lines) {
    const current = owned.get(line.cardUuid) ?? 0;
    if (current >= line.quantity) coveredCards += 1;
    else { affectedCards += 1; addedCopies += line.quantity - current; }
  }
  return { affectedCards, addedCopies, coveredCards };
}
