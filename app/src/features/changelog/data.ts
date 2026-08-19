import type { SiteChangelogData } from "@gatcg/shared";
import { usePublishedData } from "../../lib/sync/usePublishedData";

export function useSiteChangelogData(): SiteChangelogData | undefined {
  return usePublishedData<SiteChangelogData>("changelog", "/data/changelog.json");
}
