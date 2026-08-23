import type { EloData, EloHistoryData, HipsterData, PlayerDecksData, RivalsData } from "@gatcg/shared";
import { usePublishedData } from "../../lib/sync/usePublishedData";

export function useEloData(): EloData | undefined {
  return usePublishedData<EloData>("analysis-elo", "/data/analysis/elo.json");
}

export function useEloHistoryData(): EloHistoryData | undefined {
  return usePublishedData<EloHistoryData>("analysis-elo-history", "/data/analysis/elo-history.json");
}

export function useRivalsData(): RivalsData | undefined {
  return usePublishedData<RivalsData>("analysis-rivals", "/data/analysis/rivals.json");
}

export function useHipsterData(): HipsterData | undefined {
  return usePublishedData<HipsterData>("analysis-hipster", "/data/analysis/hipster.json");
}

export function usePlayerDecksData(): PlayerDecksData | undefined {
  return usePublishedData<PlayerDecksData>("analysis-player-decks", "/data/analysis/player-decks.json");
}
