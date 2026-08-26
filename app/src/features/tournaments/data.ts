import { useMemo } from "react";
import type { OmnidexIndexData, OmnidexJudgesData, OmnidexPlayersData, OmnidexTeamsData } from "@gatcg/shared";
import { usePublishedData } from "../../lib/sync/usePublishedData";

export function useOmnidexIndex(): OmnidexIndexData | undefined {
  return usePublishedData<OmnidexIndexData>("omnidex-index", "/data/omnidex/index.json");
}

/**
 * eventId -> event name, for consumers that only have an event id (e.g. the lean deck-popularity
 * index, which deliberately doesn't carry event name — see DeckPopularityEntry's doc comment) and
 * need to join it back for display rather than duplicating the string per entry.
 */
export function useEventNameById(): Map<number, string> {
  const index = useOmnidexIndex();
  return useMemo(() => new Map(index?.events.map((e) => [e.id, e.name]) ?? []), [index]);
}

export function useOmnidexPlayers(): OmnidexPlayersData | undefined {
  return usePublishedData<OmnidexPlayersData>("omnidex-players", "/data/omnidex/players.json");
}

export function useOmnidexJudges(): OmnidexJudgesData | undefined {
  return usePublishedData<OmnidexJudgesData>("omnidex-judges", "/data/omnidex/judges.json");
}

export function useOmnidexTeams(): OmnidexTeamsData | undefined {
  return usePublishedData<OmnidexTeamsData>("omnidex-teams", "/data/omnidex/teams.json");
}
