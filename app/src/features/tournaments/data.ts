import { joinEventBrowserData, type EventSearchData } from "@gatcg/shared";
import { useCallback, useMemo } from "react";
import type { OmnidexIndexData, OmnidexJudgesData, OmnidexPlayersData, OmnidexTeamsData, OmnidexVenueGeocodeData } from "@gatcg/shared";
import { usePublishedData, usePublishedDataStatus } from "../../lib/sync/usePublishedData";

export function useOmnidexIndex(enabled = true): OmnidexIndexData | undefined {
  return usePublishedData<OmnidexIndexData>("omnidex-index", "/data/omnidex/index.json", enabled);
}

export function useOmnidexIndexStatus() {
  return usePublishedDataStatus("omnidex-index", "/data/omnidex/index.json");
}

/**
 * eventId -> event name, for consumers that only have an event id (e.g. the lean deck-popularity
 * index, which deliberately doesn't carry event name – see DeckPopularityEntry's doc comment) and
 * need to join it back for display rather than duplicating the string per entry.
 */
export function useEventNameById(enabled = true): Map<number, string> {
  const index = useOmnidexIndex(enabled);
  return useMemo(() => new Map(index?.events.map((e) => [e.id, e.name]) ?? []), [index]);
}

export function useOmnidexPlayers(enabled = true): OmnidexPlayersData | undefined {
  return usePublishedData<OmnidexPlayersData>("omnidex-players", "/data/omnidex/players.json", enabled);
}

/** Stable player-id formatter with one shared fallback for missing or not-yet-loaded players. */
export function usePlayerNameById(enabled = true): (id: number) => string {
  const data = useOmnidexPlayers(enabled);
  const usernameById = useMemo(
    () => new Map(data?.players.map((player) => [player.id, player.username]) ?? []),
    [data],
  );
  return useCallback((id: number) => usernameById.get(id) ?? `Player #${id}`, [usernameById]);
}

export function useOmnidexJudges(): OmnidexJudgesData | undefined {
  return usePublishedData<OmnidexJudgesData>("omnidex-judges", "/data/omnidex/judges.json");
}

export function useOmnidexTeams(): OmnidexTeamsData | undefined {
  return usePublishedData<OmnidexTeamsData>("omnidex-teams", "/data/omnidex/teams.json");
}

/** Geocoded venue coordinates (Nominatim, via pipeline/src/omnidex/geocode.ts) – only venues Nominatim could resolve are present, keyed by the same `hostId` join `OmnidexEventSummary` uses. */
export function useVenueGeocodes(enabled = true): OmnidexVenueGeocodeData | undefined {
  return usePublishedData<OmnidexVenueGeocodeData>("omnidex-venue-geocodes", "/data/omnidex/venues.json", enabled);
}

export function useEventBrowserData(searching: boolean) {
  const summaries = usePublishedData<OmnidexIndexData>("omnidex-browse", "/data/omnidex/browse.json");
  const search = usePublishedData<EventSearchData>("omnidex-search", "/data/omnidex/search.json", searching);
  const summaryStatus = usePublishedDataStatus("omnidex-browse", "/data/omnidex/browse.json");
  const searchStatus = usePublishedDataStatus("omnidex-search", "/data/omnidex/search.json", searching);
  const index = useMemo(() => !searching ? summaries : summaries && search ? joinEventBrowserData(summaries, search) : undefined, [summaries, search, searching]);
  const error = !index && (summaryStatus.error || (searching && searchStatus.error) || (summaries && search && summaries.generatedAt !== search.generatedAt ? "Event data is updating. Please retry." : null));
  return { summaries, index, error, retry: () => { summaryStatus.retry(); if (searching) searchStatus.retry(); } };
}
