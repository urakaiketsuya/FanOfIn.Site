import type { PackageCandidatesData } from "@gatcg/shared";
import { usePublishedData } from "../../lib/sync/usePublishedData";

export function useMinedPackageCandidates(enabled = true): PackageCandidatesData | undefined {
  return usePublishedData<PackageCandidatesData>("analysis-package-candidates", "/data/analysis/package-candidates.json", enabled);
}
