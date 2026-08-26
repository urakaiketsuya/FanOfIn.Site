import { useMemo } from "react";
import type { Card, OmnidexDecklist } from "@gatcg/shared";
import { useCardsByNames } from "../events/useCardsByNames";
import { findDeckChampionName } from "../../lib/ttsExport";
import type { ComparedDeck } from "./types";

/**
 * Just enough to render a champion thumbnail per deck chip: resolves only each deck's material-
 * section card names (not the full decklist) to find its Champion card. Deliberately kept separate
 * from useComparisonData — the deck-tray chips render before a comparison view is even open (while
 * browsing Add Decks, or in Card comparison mode), so pulling in useComparisonData's deck-popularity
 * index (~11MB) and pricing data there just for a thumbnail would undo a chunk of the site's
 * deferred-loading work for a page that may never render a comparison at all.
 */
export function useDeckChampionCards(decks: ComparedDeck[], decklists: Map<string, OmnidexDecklist | null>): Map<string, Card> {
  const materialNames = useMemo(
    () => Array.from(new Set(decks.flatMap((d) => decklists.get(d.key)?.material.map((l) => l.card) ?? []))),
    [decks, decklists],
  );
  const cardsByName = useCardsByNames(materialNames);

  return useMemo(() => {
    const result = new Map<string, Card>();
    for (const d of decks) {
      const list = decklists.get(d.key);
      if (!list) continue;
      const championName = findDeckChampionName(list.material, cardsByName);
      const card = championName ? cardsByName.get(championName) : undefined;
      if (card) result.set(d.key, card);
    }
    return result;
  }, [decks, decklists, cardsByName]);
}
