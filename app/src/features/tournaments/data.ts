import type { OmnidexIndexData, OmnidexJudgesData, OmnidexPlayersData } from "@gatcg/shared";
import { usePublishedData } from "../../lib/sync/usePublishedData";

export function useOmnidexIndex(): OmnidexIndexData | undefined {
  return usePublishedData<OmnidexIndexData>("omnidex-index", "/data/omnidex/index.json");
}

export function useOmnidexPlayers(): OmnidexPlayersData | undefined {
  return usePublishedData<OmnidexPlayersData>("omnidex-players", "/data/omnidex/players.json");
}

export function useOmnidexJudges(): OmnidexJudgesData | undefined {
  return usePublishedData<OmnidexJudgesData>("omnidex-judges", "/data/omnidex/judges.json");
}
