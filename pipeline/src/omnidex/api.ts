import type {
  OmnidexDecklistEntry,
  OmnidexEvent,
  OmnidexJudge,
  OmnidexPairingsResponse,
  OmnidexPlayer,
  OmnidexStandingsResponse,
  OmnidexTeamsResponse,
} from "@gatcg/shared";
import { fetchJson, fetchJsonMaybe, fetchJsonOrNull } from "../lib/http.js";

const BASE_URL = "https://api.gatcg.com";

export const omnidexApi = {
  /** null means the ID has no event (404) — used by the crawler to probe for gaps/frontier. */
  getEvent: (id: number) => fetchJsonOrNull<OmnidexEvent>(`${BASE_URL}/omnidex/events/${id}`),

  getPlayers: (id: number) => fetchJson<OmnidexPlayer[]>(`${BASE_URL}/omnidex/events/${id}/players`),

  getStandings: (id: number) => fetchJsonMaybe<OmnidexStandingsResponse>(`${BASE_URL}/omnidex/events/${id}/standings`),

  getPairings: (id: number, round: number) =>
    fetchJsonMaybe<OmnidexPairingsResponse>(`${BASE_URL}/omnidex/events/${id}/pairings?round=${round}`),

  getJudges: (id: number) => fetchJsonMaybe<OmnidexJudge[]>(`${BASE_URL}/omnidex/events/${id}/judges`),

  getTeams: (id: number) => fetchJsonMaybe<OmnidexTeamsResponse>(`${BASE_URL}/omnidex/events/${id}/teams`),

  getDecklists: (id: number) => fetchJsonMaybe<OmnidexDecklistEntry[]>(`${BASE_URL}/omnidex/events/${id}/decklists`),

  getStatistics: (id: number) => fetchJsonMaybe<unknown>(`${BASE_URL}/omnidex/events/${id}/statistics`),
};
