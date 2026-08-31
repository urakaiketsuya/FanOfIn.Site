import type { OmnidexDecklist } from "./omnidex-types.js";

export interface CollectionEntry {
  cardUuid: string;
  cardName: string;
  ownedQuantity: number;
  proxyQuantity: number;
  updatedAt: string;
}

export type CollectionUpdateMode = "add" | "at-least" | "set";

export interface CollectionUpdateLine {
  cardUuid: string;
  cardName: string;
  quantity: number;
  proxyQuantity?: number;
}

export interface CollectionTransaction {
  id: string;
  source: string;
  lineCount: number;
  createdAt: string;
  undoneAt: string | null;
}

export interface DeckCollectionLine {
  card: string;
  required: number;
  owned: number;
  proxies: number;
  missing: number;
}

export interface DeckCollectionStatus {
  lines: DeckCollectionLine[];
  requiredCopies: number;
  ownedCopies: number;
  missingCopies: number;
  proxyCopies: number;
  complete: boolean;
}

function collectionKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

/** Compare a deck recipe with physical ownership. Proxies are reported but never count as owned. */
export function computeDeckCollectionStatus(
  decklist: OmnidexDecklist,
  collection: CollectionEntry[],
  includeSideboard = true,
): DeckCollectionStatus {
  const owned = new Map(collection.map((entry) => [collectionKey(entry.cardName), entry]));
  const required = new Map<string, { card: string; quantity: number }>();
  const sections = includeSideboard ? [decklist.main, decklist.material, decklist.sideboard] : [decklist.main, decklist.material];
  for (const section of sections) {
    for (const line of section) {
      const key = collectionKey(line.card);
      const current = required.get(key);
      if (current) current.quantity += line.quantity;
      else required.set(key, { card: line.card, quantity: line.quantity });
    }
  }
  const lines = Array.from(required.entries()).map(([key, need]) => {
    const entry = owned.get(key);
    const ownedQuantity = entry?.ownedQuantity ?? 0;
    return {
      card: need.card,
      required: need.quantity,
      owned: Math.min(ownedQuantity, need.quantity),
      proxies: Math.min(entry?.proxyQuantity ?? 0, Math.max(0, need.quantity - ownedQuantity)),
      missing: Math.max(0, need.quantity - ownedQuantity),
    };
  }).sort((a, b) => b.missing - a.missing || a.card.localeCompare(b.card));
  const requiredCopies = lines.reduce((sum, line) => sum + line.required, 0);
  const ownedCopies = lines.reduce((sum, line) => sum + line.owned, 0);
  const missingCopies = lines.reduce((sum, line) => sum + line.missing, 0);
  const proxyCopies = lines.reduce((sum, line) => sum + line.proxies, 0);
  return { lines, requiredCopies, ownedCopies, missingCopies, proxyCopies, complete: missingCopies === 0 };
}
