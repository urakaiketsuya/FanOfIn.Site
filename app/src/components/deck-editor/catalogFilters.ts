import type { Card } from "@gatcg/shared";
import { emptyFilterState, filterCards } from "../../features/cards/filters";

export interface CatalogFilters {
  rarity?: string; element: string; type: string; subtype: string; costType: string; maxCost: string;
  ownedOnly: boolean; availableElements: boolean;
}
export const emptyCatalogFilters = (): CatalogFilters => ({ rarity: "", element: "", type: "", subtype: "", costType: "", maxCost: "", ownedOnly: false, availableElements: false });

export function filterCatalog(cards: Card[], query: string, filters: CatalogFilters, owned?: ReadonlyMap<string, number>, elements?: ReadonlySet<string>): Card[] {
  return filterCards(cards, { ...emptyFilterState(), name: query, rarities: new Set(filters.rarity ? [filters.rarity] : []),
    elements: new Set(filters.element ? [filters.element] : []), types: new Set(filters.type ? [filters.type] : []), subtypes: new Set(filters.subtype ? [filters.subtype] : []),
  }).filter(card => {
    const memory = card.cost_memory != null || card.cost?.type === "memory";
    if (filters.costType === "memory" && !memory) return false;
    if (filters.costType === "reserve" && card.cost_reserve == null) return false;
    const cost = memory ? card.cost_memory : card.cost_reserve;
    if (filters.maxCost !== "" && (cost == null || cost > Number(filters.maxCost))) return false;
    if (filters.ownedOnly && (!owned || (owned.get(card.name) ?? 0) < 1)) return false;
    if (filters.availableElements && elements?.size && !card.elements.some(element => element === "NORM" || elements.has(element))) return false;
    return true;
  });
}

export type CatalogSort = "name" | "name-desc" | "cost" | "cost-desc" | "element";
export function sortCatalogNames(names: string[], catalog: ReadonlyMap<string, Card>, sort: CatalogSort): string[] {
  const cost = (name: string) => { const card = catalog.get(name); return card?.cost_memory ?? card?.cost_reserve ?? null; };
  return [...names].sort((a, b) => {
    if (sort === "name-desc") return b.localeCompare(a);
    if (sort === "element") return (catalog.get(a)?.elements.join(",") ?? "").localeCompare(catalog.get(b)?.elements.join(",") ?? "") || a.localeCompare(b);
    if (sort === "cost" || sort === "cost-desc") {
      const x = cost(a), y = cost(b);
      if (x === null && y !== null) return 1;
      if (y === null && x !== null) return -1;
      return (x !== null && y !== null ? (x-y) * (sort === "cost-desc" ? -1 : 1) : 0) || a.localeCompare(b);
    }
    return a.localeCompare(b);
  });
}
