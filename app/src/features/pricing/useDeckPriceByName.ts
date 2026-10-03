import { useMemo } from "react";
import { usePriceLookupState } from "./usePriceLookup";

/**
 * Cheapest available market price per card name, across every printing – a decklist entry is
 * just a card name with no specific edition, so the cheapest printing is the realistic "what
 * would it cost to acquire this card" figure for a deck price estimate.
 */
export function useDeckPriceByNameState(enabled = true) {
  const state = usePriceLookupState(enabled);
  const prices = state.prices;

  const priceByName = useMemo(() => {
    const byName = new Map<string, number>();
    for (const row of prices.values()) {
      const market = row.normal?.market ?? row.foil?.market ?? null;
      if (market === null) continue;
      const existing = byName.get(row.cardName);
      if (existing === undefined || market < existing) byName.set(row.cardName, market);
    }
    return byName;
  }, [prices]);
  return { ...state, priceByName };
}

export function useDeckPriceByName(enabled = true): Map<string, number> {
  return useDeckPriceByNameState(enabled).priceByName;
}
