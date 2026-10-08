import type { OmnidexDecklist } from "./omnidex-types.js";

export type CardFinish = "unspecified" | "nonfoil" | "foil";
export const CARD_FINISHES: readonly CardFinish[] = ["unspecified", "nonfoil", "foil"];
export function isCardFinish(value: unknown): value is CardFinish {
  return value === "unspecified" || value === "nonfoil" || value === "foil";
}
export function finishLabel(finish?: CardFinish): string {
  return finish === "foil" ? "Foil" : finish === "nonfoil" ? "Nonfoil" : "Unspecified finish";
}

export interface CollectionEntry {
  cardUuid: string;
  cardName: string;
  /** Printing UUID. Omitted for the legacy/canonical card-level pool. */
  editionUuid?: string;
  /** Omitted legacy values mean unspecified, never nonfoil. */
  finish?: CardFinish;
  setPrefix?: string;
  collectorNumber?: string;
  ownedQuantity: number;
  proxyQuantity: number;
  updatedAt: string;
}

export type CollectionUpdateMode = "add" | "at-least" | "set";

export interface CollectionUpdateLine {
  /** Snapshot held by a quantity draft; checked before an atomic save. */
  expectedOwnedQuantity?: number;
  expectedProxyQuantity?: number;
  cardUuid: string;
  cardName: string;
  editionUuid?: string;
  /** Omitted legacy values mean unspecified, never nonfoil. */
  finish?: CardFinish;
  setPrefix?: string;
  collectorNumber?: string;
  quantity: number;
  proxyQuantity?: number;
}

export type CollectionInventoryMode = "canonical" | "edition";

export function collectionEntryKey(entry: { cardUuid: string; editionUuid?: string | null; finish?: CardFinish }): string {
  return `${entry.cardUuid}:${entry.editionUuid ?? "canonical"}${entry.finish && entry.finish !== "unspecified" ? `:${entry.finish}` : ""}`;
}

/** Pool every printing with the legacy canonical quantity. Deck recipes identify cards, not printings. */
export function collectionTotalsByCard(collection: CollectionEntry[]): Map<string, { ownedQuantity: number; proxyQuantity: number }> {
  const totals = new Map<string, { ownedQuantity: number; proxyQuantity: number }>();
  for (const entry of collection) {
    const key = collectionKey(entry.cardName);
    const total = totals.get(key) ?? { ownedQuantity: 0, proxyQuantity: 0 };
    total.ownedQuantity += entry.ownedQuantity;
    total.proxyQuantity += entry.proxyQuantity;
    totals.set(key, total);
  }
  return totals;
}

export interface CollectionTransaction {
  id: string;
  source: string;
  lineCount: number;
  createdAt: string;
  undoneAt: string | null;
}

/** A card the owner has flagged for cross-deck sharing checks — see `watchedCardUsage` in the app's collection helpers. */
export interface SharedCardWatch {
  cardUuid: string;
  cardName: string;
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
  const owned = collectionTotalsByCard(collection);
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

/** Private card-level reminders. Independent of confirmed inventory and printings. */
export interface CollectionLoan {
  id: string;
  borrower: string;
  quantity: number;
  lentAt: string;
  returnedAt?: string;
}
export interface CollectionDeckAssignment { deckId: string; quantity: number; }
export interface CollectionCardTracking {
  /** Read-only trading state; not part of tracking updates. */
  tradeReservedQuantity?: number;
  tradeListedQuantity?: number;
  cardUuid: string;
  cardName: string;
  mightOwn: boolean;
  loans: CollectionLoan[];
  assignments?: CollectionDeckAssignment[];
  revision: number;
  updatedAt: string;
}
export type CollectionCardTrackingUpdate = Pick<CollectionCardTracking, "cardName" | "mightOwn" | "loans" | "revision" | "assignments">;

/** Fill a recipe's shortfall using unspecified copies, counting every physical printing first.
 * Use with `at-least`: existing larger quantities, printing records and proxies are preserved. */
export function collectionCompletionLines(required: CollectionUpdateLine[], entries: CollectionEntry[]): CollectionUpdateLine[] {
  const totals = collectionTotalsByCard(entries);
  return required.flatMap(line => {
    const owned = totals.get(collectionKey(line.cardName))?.ownedQuantity ?? 0;
    const shortfall = Math.max(0, line.quantity - owned);
    if (!shortfall) return [];
    const canonical = entries.find(entry => entry.cardUuid === line.cardUuid && !entry.editionUuid && (!entry.finish || entry.finish === "unspecified"));
    return [{ cardUuid: line.cardUuid, cardName: line.cardName, quantity: (canonical?.ownedQuantity ?? 0) + shortfall, proxyQuantity: canonical?.proxyQuantity ?? 0 }];
  });
}
