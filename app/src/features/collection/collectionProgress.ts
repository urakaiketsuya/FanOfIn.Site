import type { Card, CollectionEntry } from "@gatcg/shared";

export function collectionSetProgress(cards: Card[], entries: CollectionEntry[]) {
  const owned = new Map<string, number>();
  for (const entry of entries) owned.set(entry.cardUuid, (owned.get(entry.cardUuid) ?? 0) + Math.max(0, entry.ownedQuantity));
  const sets = new Map<string, { prefix: string; name: string; cards: Map<string, Card> }>();
  for (const card of cards) for (const edition of card.editions) {
    const prefix = edition.set.prefix;
    if (!sets.has(prefix)) sets.set(prefix, { prefix, name: edition.set.name, cards: new Map() });
    sets.get(prefix)!.cards.set(card.uuid, card);
  }
  return Array.from(sets.values(), (set) => {
    const members = [...set.cards.values()].sort((a, b) => a.name.localeCompare(b.name));
    const count = members.filter((card) => (owned.get(card.uuid) ?? 0) > 0).length;
    return { prefix: set.prefix, name: set.name, cards: members, owned: count, total: members.length, percent: members.length ? Math.floor(count * 100 / members.length) : 0, quantities: owned };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

export function collectionMilestone(owned: number, total: number): string {
  if (!total || !owned) return "Ready to begin";
  if (owned >= total) return "Set complete";
  if (owned * 4 >= total * 3) return "Three quarters";
  if (owned * 2 >= total) return "Halfway";
  if (owned * 4 >= total) return "Quarter complete";
  return "First card";
}
