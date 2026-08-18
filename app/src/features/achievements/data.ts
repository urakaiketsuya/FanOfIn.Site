import type { AchievementsData } from "@gatcg/shared";
import { usePublishedData } from "../../lib/sync/usePublishedData";

export function useAchievementsData(): AchievementsData | undefined {
  return usePublishedData<AchievementsData>("analysis-achievements", "/data/analysis/achievements.json");
}
