import { CARD_FINISHES, collectionEntryKey, type CollectionEntry, type CollectionUpdateLine } from "@gatcg/shared";

/** Redistribute finishes within each printing; never alter total ownership or proxies. */
export function identifyCollectionFinishes(entries: CollectionEntry[], quantities: Record<string, number>): CollectionUpdateLine[] {
  const printings = new Map(entries.map(entry => [entry.editionUuid ?? "", entry]));
  const lines: CollectionUpdateLine[] = [];
  for (const [edition, sample] of printings) {
    const pool = entries.filter(entry => (entry.editionUuid ?? "") === edition);
    const total = pool.reduce((sum, entry) => sum + entry.ownedQuantity, 0);
    const next = CARD_FINISHES.map(finish => {
      const key = collectionEntryKey({ ...sample, finish });
      const existing = pool.find(entry => (entry.finish ?? "unspecified") === finish);
      const quantity = quantities[key] ?? existing?.ownedQuantity ?? 0;
      if (!Number.isInteger(quantity) || quantity < 0 || quantity > 9999) throw new Error("Use whole quantities from 0 to 9,999.");
      return { cardUuid: sample.cardUuid, cardName: sample.cardName, editionUuid: sample.editionUuid, setPrefix: sample.setPrefix, collectorNumber: sample.collectorNumber, finish, quantity, proxyQuantity: existing?.proxyQuantity ?? 0 };
    });
    if (next.reduce((sum, line) => sum + line.quantity, 0) !== total) throw new Error(`Finish quantities must total ${total} for ${sample.setPrefix ? `${sample.setPrefix} #${sample.collectorNumber}` : "unspecified printing"}.`);
    lines.push(...next);
  }
  return lines;
}
