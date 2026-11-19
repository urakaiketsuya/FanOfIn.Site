import { compareCardWinRates } from "../../lib/cardWinRateSort";
import { compareCardPrices } from "../../lib/cardPriceSort";
import type { Card } from "@gatcg/shared";
import { emptyFilterState, filterCards } from "../../features/cards/filters";

export interface CatalogFilters {
  class?: string; set?: string; edition?: string; rarity?: string; element: string; type: string; subtype: string; costType: string; maxCost: string;
  ownedOnly: boolean; availableElements: boolean;
}
export const emptyCatalogFilters = (): CatalogFilters => ({ class: "", set: "", edition: "", rarity: "", element: "", type: "", subtype: "", costType: "", maxCost: "", ownedOnly: false, availableElements: false });

export function isFullCardName(cards: readonly Card[], query: string): boolean {
  const name = query.trim().toLocaleLowerCase();
  return name.length > 0 && cards.some(card => card.name.toLocaleLowerCase() === name);
}

export function filterCatalog(cards: Card[], query: string, filters: CatalogFilters, owned?: ReadonlyMap<string, number>, elements?: ReadonlySet<string>): Card[] {
  const search = isFullCardName(cards, query) ? `name:${JSON.stringify(query.trim())}` : query;
  return filterCards(cards, { ...emptyFilterState(), name: search, printingSets: new Set(filters.edition?.split("|").filter(Boolean) ?? []), classes: new Set(filters.class?.split("|").filter(Boolean) ?? []), sets: new Set(filters.set?.split("|").filter(Boolean) ?? []), rarities: new Set(filters.rarity?.split("|").filter(Boolean) ?? []),
    elements: new Set(filters.element?.split("|").filter(Boolean) ?? []), types: new Set(filters.type?.split("|").filter(Boolean) ?? []), subtypes: new Set(filters.subtype?.split("|").filter(Boolean) ?? []),
  }).filter(card => {
    const memory = card.cost_memory != null || card.cost?.type === "memory";
    if (filters.costType === "memory" && !memory) return false;
    if (filters.costType === "reserve" && card.cost_reserve == null) return false;
    const cost = memory ? card.cost_memory : card.cost_reserve;
    if (filters.maxCost !== "" && (cost == null || cost > Number(filters.maxCost))) return false;
    if (filters.ownedOnly && (!owned || (owned.get(card.name) ?? 0) < 1)) return false;
    if (filters.availableElements && elements?.size && !card.types.includes("CHAMPION") && card.elements.length > 0 && !card.elements.some(element => element === "NORM" || elements.has(element))) return false;
    return true;
  });
}

export type CatalogSort = "win-rate" | "recommended" | "name" | "name-desc" | "cost" | "cost-desc" | "element" | "price" | "price-desc";
export function sortCatalogNames(names: string[], catalog: ReadonlyMap<string, Card>, sort: CatalogSort, prices: ReadonlyMap<string, number> = new Map(), winRates: ReadonlyMap<string, number> = new Map()): string[] {
  if (sort === "recommended") return [...names];
  const cost = (name: string) => { const card = catalog.get(name); return card?.cost_memory ?? card?.cost_reserve ?? null; };
  return [...names].sort((a, b) => {
    if (sort === "win-rate") return compareCardWinRates(a, b, winRates);
    if (sort === "price" || sort === "price-desc") return compareCardPrices(a, b, prices, sort === "price-desc");
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
