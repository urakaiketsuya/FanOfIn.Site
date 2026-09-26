import type { WinRatePackagesData } from "@gatcg/shared";
import { usePublishedData, usePublishedDataStatus } from "../../lib/sync/usePublishedData";
const KEY = "analysis-win-rate-packages";
const URL = "/data/analysis/win-rate-packages.json";
export function useWinRatePackages() {
  const data = usePublishedData<WinRatePackagesData>(KEY, URL);
  const status = usePublishedDataStatus(KEY, URL);
  return { data, status };
}
