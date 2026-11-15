import catalog from "./merchandiseCommunityCatalog.json";
import links from "./merchandiseCatalogLinks.json";
import { merchandiseBundles, type MerchandiseGroup } from "./merchandiseCatalog";

export const merchandiseCatalog = catalog;
export type MerchandiseCatalogEntry = typeof catalog[number];
export const MERCHANDISE_CATALOG_SOURCE = "https://docs.google.com/spreadsheets/d/1hvE-dqVjK_-jEwCkNWmlYQd6-fjGoLmsXetnZzgpP5M/edit";

export interface MerchandiseCollectionItem {
  /** Persisted identity: existing ownership IDs are never renamed or combined. */
  id: string;
  name: string;
  category: string;
  detail: string;
  releaseId: string;
  releaseName: string;
  champion: string;
  catalogEntry?: MerchandiseCatalogEntry;
  bundle?: MerchandiseGroup;
  sourceUrl: string;
  quantityUnit: string;
}

const linkedItems = new Map(links.items.map(link => [link.catalogId, link.ownershipId]));
const linkedBundles = new Map(links.bundles.map(link => [link.catalogId, link.bundleId]));
const legacy = merchandiseBundles.flatMap(bundle => bundle.items.map(item => ({ ...item, bundle })));
const legacyById = new Map(legacy.map(item => [item.id, item]));
const linkedOwnershipIds = new Set(links.items.map(link => link.ownershipId));
const componentCategories: Record<string, string> = {
  playmat: "Playmats", "compact-deck-box": "Compact deckboxes", "double-deck-box": "Double deckboxes",
  "acrylic-standee": "Standees", "t-shirt": "Clothing", sleeves: "Sleeves", "acrylic-art": "Art blocks",
  figurine: "Figures and plushies", plush: "Figures and plushies",
};
function legacyItem(item: typeof legacy[number], catalogEntry?: MerchandiseCatalogEntry): MerchandiseCollectionItem {
  const { bundle } = item;
  return {
    id: item.id, name: bundle.overviewImageUrl ? `${bundle.champion} · ${item.name}` : item.name,
    category: componentCategories[item.type] ?? "Accessories", detail: bundle.releaseName,
    releaseId: bundle.releaseId, releaseName: bundle.releaseName, champion: bundle.champion,
    catalogEntry, bundle, sourceUrl: bundle.sourceUrl,
    quantityUnit: item.type === "sleeves" ? "100-sleeve packs" : item.type === "metal-counters" ? "Boxed sets" : "Quantity",
  };
}

/** One shared ownership target per linked design. Bundle rows expose their existing components. */
export const merchandiseCollectionItems: MerchandiseCollectionItem[] = [
  ...catalog.flatMap(entry => {
    const bundleId = linkedBundles.get(entry.id);
    if (bundleId) return legacy.filter(item => item.bundle.id === bundleId).map(item => legacyItem(item, entry));
    const existing = legacyById.get(linkedItems.get(entry.id) ?? "");
    if (existing) return [{ ...legacyItem(existing, entry), name: entry.name, category: entry.category, detail: entry.detail }];
    return [{ id: entry.id, name: entry.name, category: entry.category, detail: entry.detail,
      releaseId: "community-catalog", releaseName: "Community catalog", champion: "", catalogEntry: entry,
      sourceUrl: `${MERCHANDISE_CATALOG_SOURCE}?range=${encodeURIComponent(`'${entry.sourceSheet}'!${entry.sourceCell}`)}`,
      quantityUnit: "Quantity",
    }];
  }),
  // Retain every earlier record, including variants that cannot yet be paired confidently.
  ...legacy.filter(item => !linkedOwnershipIds.has(item.id) && !links.bundles.some(link => link.bundleId === item.bundle.id)).map(item => legacyItem(item)),
];

/** A catalog set is a group of component IDs, never an implicit ownership mutation. */
export function merchandiseOwnershipIds(catalogId: string): string[] {
  return merchandiseCollectionItems.filter(item => item.catalogEntry?.id === catalogId).map(item => item.id);
}
