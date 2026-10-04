import type { CollectionEntry, CollectionUpdateLine, CollectionUpdateMode } from "@gatcg/shared";

export function stageCollectionQuantities(current: Record<string, CollectionUpdateLine>, savedEntries: CollectionEntry[], lines: CollectionUpdateLine[], updateMode: CollectionUpdateMode): Record<string, CollectionUpdateLine> {
      const next = { ...current };
      for (const line of lines) {
        const key = `${line.cardUuid}:${line.editionUuid ?? "canonical"}`;
        const saved = savedEntries.find(entry => entry.cardUuid === line.cardUuid && entry.editionUuid === line.editionUuid);
        const old = next[key] ?? { quantity: saved?.ownedQuantity ?? 0, proxyQuantity: saved?.proxyQuantity ?? 0 };
        const quantity = (value: number, previous: number) => Math.min(9999, Math.max(0, Math.floor(updateMode === "add" ? previous + value : updateMode === "at-least" ? Math.max(previous, value) : value)));
        next[key] = { ...line, expectedOwnedQuantity: saved?.ownedQuantity ?? 0, expectedProxyQuantity: saved?.proxyQuantity ?? 0, quantity: quantity(Number.isFinite(line.quantity) ? line.quantity : 0, old.quantity), proxyQuantity: quantity(Number.isFinite(line.proxyQuantity) ? line.proxyQuantity! : 0, old.proxyQuantity ?? 0) };
        if (next[key].quantity === (saved?.ownedQuantity ?? 0) && next[key].proxyQuantity === (saved?.proxyQuantity ?? 0)) delete next[key];
      }
      return next;
}
