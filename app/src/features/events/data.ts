import type { VodsData } from "@gatcg/shared";
import { usePublishedData } from "../../lib/sync/usePublishedData";

export function useVodsData(): VodsData | undefined {
  return usePublishedData<VodsData>("omnidex-vods", "/data/omnidex/vods.json");
}
