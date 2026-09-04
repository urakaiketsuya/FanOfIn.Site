import type { Card, CollectionEntry, CollectionUpdateLine, OmnidexDecklist, SavedDeck } from "@gatcg/shared";

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

/** Infer one collection from several lists without treating repeat appearances as extra purchases. */
export function decklistsCollectionBackfillLines(decklists: OmnidexDecklist[], cards: Card[], maxCopies = 4): CollectionUpdateLine[] {
  const cardsByName = new Map(cards.map((card) => [cardKey(card.name), card]));
  const quantities = new Map<string, CollectionUpdateLine>();
  for (const decklist of decklists) {
    const deckQuantities = new Map<string, { cardName: string; quantity: number }>();
    for (const line of [...decklist.main, ...decklist.material, ...decklist.sideboard]) {
      const key = cardKey(line.card);
      const current = deckQuantities.get(key);
      if (current) current.quantity += line.quantity;
      else deckQuantities.set(key, { cardName: line.card, quantity: line.quantity });
    }
    for (const [key, line] of deckQuantities) {
      const card = cardsByName.get(key);
      if (!card) continue;
      const quantity = Math.min(maxCopies, line.quantity);
      const current = quantities.get(card.uuid);
      if (!current || quantity > current.quantity) quantities.set(card.uuid, { cardUuid: card.uuid, cardName: card.name, quantity });
    }
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

export interface SharedCardUsage {
  card: string;
  totalRequired: number;
  owned: number;
  missing: number;
  decks: { deckId: string; title: string; quantity: number }[];
}

/**
 * Cards required by 2+ of the given decks, checked against one pooled collection — the case where
 * a limited physical playset has to move between decks rather than living fully in each at once
 * (e.g. two decks each running 4x of a card you only own 4 copies of). `missing` is 0 when the
 * combined requirement still fits what's owned, even though the card is nominally "shared."
 */
export function sharedCardBreakdown(decks: SavedDeck[], entries: CollectionEntry[], includeSideboard = true): SharedCardUsage[] {
  const owned = new Map(entries.map((entry) => [cardKey(entry.cardName), entry.ownedQuantity]));
  const usage = new Map<string, SharedCardUsage>();
  for (const deck of decks) {
    const sections = includeSideboard ? [deck.decklist.main, deck.decklist.material, deck.decklist.sideboard] : [deck.decklist.main, deck.decklist.material];
    const deckQuantities = new Map<string, { card: string; quantity: number }>();
    for (const line of sections.flat()) {
      const key = cardKey(line.card);
      const current = deckQuantities.get(key);
      if (current) current.quantity += line.quantity;
      else deckQuantities.set(key, { card: line.card, quantity: line.quantity });
    }
    for (const [key, { card, quantity }] of deckQuantities) {
      let entry = usage.get(key);
      if (!entry) { entry = { card, totalRequired: 0, owned: 0, missing: 0, decks: [] }; usage.set(key, entry); }
      entry.totalRequired += quantity;
      entry.decks.push({ deckId: deck.id, title: deck.title, quantity });
    }
  }
  const shared = Array.from(usage.values()).filter((entry) => entry.decks.length >= 2);
  for (const entry of shared) {
    entry.owned = owned.get(cardKey(entry.card)) ?? 0;
    entry.missing = Math.max(0, entry.totalRequired - entry.owned);
    entry.decks.sort((a, b) => b.quantity - a.quantity || a.title.localeCompare(b.title));
  }
  return shared.sort((a, b) => b.missing - a.missing || b.totalRequired - a.totalRequired || a.card.localeCompare(b.card));
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
