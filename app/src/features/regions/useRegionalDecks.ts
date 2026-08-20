import { useMemo } from "react";
import { useOmnidexIndex } from "../tournaments/data";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { regionKeyForCountry, regionLabelForKey, type RegionGroupMode } from "../../lib/regions";

const MIN_DECK_COUNT = 20;

export interface RegionOption {
  code: string;
  label: string;
  deckCount: number;
}

export interface RegionalDecksResult {
  loading: boolean;
  options: RegionOption[];
  /** deckId -> the region/country key for the currently selected grouping mode — the join spine every other regional hook filters its own dataset against. */
  regionByDeckId: Map<string, string>;
}

/**
 * Joins every deck sighting to its event's host country (or broader region, depending on `mode`)
 * — pure client-side pivot of already-published `omnidex/index.json` and
 * `analysis/deck-popularity-index.json`, no new pipeline dataset. Same "join two lean, already-
 * published datasets in a useMemo" pattern as `useSeasonMeta.ts`.
 */
export function useRegionalDecks(mode: RegionGroupMode): RegionalDecksResult {
  const index = useOmnidexIndex();
  const deckPopularity = useDeckPopularityIndexData();

  return useMemo((): RegionalDecksResult => {
    if (!index || !deckPopularity) return { loading: true, options: [], regionByDeckId: new Map() };

    const keyByEventId = new Map<number, string>();
    for (const e of index.events) keyByEventId.set(e.id, regionKeyForCountry(e.hostCountry, mode));

    const regionByDeckId = new Map<string, string>();
    const deckCountByKey = new Map<string, number>();
    for (const entry of deckPopularity.entries) {
      const key = keyByEventId.get(entry.eventId);
      if (!key) continue;
      regionByDeckId.set(entry.deckId, key);
      deckCountByKey.set(key, (deckCountByKey.get(key) ?? 0) + 1);
    }

    const options: RegionOption[] = Array.from(deckCountByKey.entries())
      .filter(([, deckCount]) => deckCount >= MIN_DECK_COUNT)
      .map(([code, deckCount]) => ({ code, label: regionLabelForKey(code, mode), deckCount }))
      .sort((a, b) => b.deckCount - a.deckCount);

    return { loading: false, options, regionByDeckId };
  }, [index, deckPopularity, mode]);
}
