import { merchandiseBundles } from "./merchandiseCatalog";
export { merchandiseBundles } from "./merchandiseCatalog";

export const merchandiseItems = merchandiseBundles.flatMap(bundle => bundle.items.map(item => ({
  ...item, bundleId: bundle.id, releaseId: bundle.releaseId, releaseName: bundle.releaseName, champion: bundle.champion,
})));
const itemIds = new Set<string>(merchandiseItems.map(item => item.id));
export interface MerchandiseCollection { userId: string; revision: number; quantities: Record<string, number> }
export interface MerchandiseSaveInput { expectedUserId: string; expectedRevision: number; requestId: string; quantities: Record<string, number> }

/** Canonical sparse quantities: zero means unowned, never an extra collectible. */
export function parseMerchandiseQuantities(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid merchandise quantities");
  const entries = Object.entries(value);
  if (entries.length > itemIds.size) throw new Error("Invalid merchandise quantities");
  const result: Record<string, number> = {};
  for (const [id, quantity] of entries.sort(([a], [b]) => a.localeCompare(b))) {
    if (!itemIds.has(id) || typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 0 || quantity > 999) throw new Error("Invalid merchandise quantities");
    if (quantity) result[id] = quantity;
  }
  return result;
}

export function merchandiseProgress(ids: readonly string[], quantities: Record<string, number>) {
  const unique = [...new Set(ids)].filter(id => itemIds.has(id));
  return { owned: unique.filter(id => (quantities[id] ?? 0) > 0).length, total: unique.length };
}
