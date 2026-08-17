import type { EloData, HipsterData, PlayerDecksData } from "@gatcg/shared";
import { usePublishedData } from "../../lib/sync/usePublishedData";

export function useEloData(): EloData | undefined {
  return usePublishedData<EloData>("analysis-elo", "/data/analysis/elo.json");
}

export function useHipsterData(): HipsterData | undefined {
  return usePublishedData<HipsterData>("analysis-hipster", "/data/analysis/hipster.json");
}

export function usePlayerDecksData(): PlayerDecksData | undefined {
  return usePublishedData<PlayerDecksData>("analysis-player-decks", "/data/analysis/player-decks.json");
}
