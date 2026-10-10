import { deckCardRequirements, locationCardKey, type Card, type CollectionEntry, type SavedDeck } from "@gatcg/shared";
import { collectionSetProgress } from "./collectionProgress";

export type CollectionGoal = { kind: "set" | "deck"; id: string };
export type GoalRequirement = { name: string; quantity: number; card?: Card };

export function parseCollectionGoal(value: string | null): CollectionGoal | null {
  if (!value) return null;
  const parsed: unknown = JSON.parse(value);
  if (parsed === null) return null;
  if (typeof parsed !== "object" || !("kind" in parsed) || !("id" in parsed) ||
      (parsed.kind !== "set" && parsed.kind !== "deck") || typeof parsed.id !== "string" || !parsed.id || parsed.id.length > 200) {
    throw new Error("Saved collection goal is invalid. Choose a goal again.");
  }
  return { kind: parsed.kind, id: parsed.id };
}

export function collectionGoalOptions(cards: Card[], decks: SavedDeck[]) {
  const byName = new Map(cards.map(card => [locationCardKey(card.name), card]));
  return [
    ...decks.map(deck => ({
      kind: "deck" as const, id: deck.id, title: deck.title,
      requirements: [...deckCardRequirements({ ...deck.decklist, sideboard: [] }).values()]
        .filter(line => line.quantity > 0)
        .map(line => ({ ...line, card: byName.get(locationCardKey(line.name)) })),
    })),
    ...collectionSetProgress(cards, []).map(set => ({
      kind: "set" as const, id: set.prefix, title: set.name,
      requirements: set.cards.map(card => ({ name: card.name, quantity: 1, card })),
    })),
  ];
}

export function collectionGoalProgress(requirements: GoalRequirement[], entries: CollectionEntry[]) {
  const owned = new Map<string, number>();
  for (const entry of entries) owned.set(entry.cardUuid, (owned.get(entry.cardUuid) ?? 0) + Math.max(0, entry.ownedQuantity));
  const rows = requirements.map(line => {
    const count = line.card ? owned.get(line.card.uuid) ?? 0 : 0;
    return { ...line, owned: Math.min(count, line.quantity), missing: Math.max(0, line.quantity - count) };
  });
  const total = rows.reduce((sum, line) => sum + line.quantity, 0);
  const covered = rows.reduce((sum, line) => sum + line.owned, 0);
  return { rows, total, covered, complete: total > 0 && total === covered };
}
