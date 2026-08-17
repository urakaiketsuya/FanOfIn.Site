import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { FeaturedSetGroup } from "@gatcg/shared";
import { db } from "../../lib/db";
import { gatcgApi } from "../../lib/api/client";

/** Cached in Dexie for instant renders on repeat visits; refreshes from the network in the background. Undefined until the first Dexie read resolves, so callers can distinguish "loading" from "genuinely empty". */
export function useFeaturedSets(): FeaturedSetGroup[] | undefined {
  const featuredSets = useLiveQuery(() => db.featuredSets.toArray(), []);

  useEffect(() => {
    gatcgApi
      .getFeaturedSets()
      .then((groups) => db.featuredSets.bulkPut(groups))
      .catch((err: unknown) => console.error("failed to refresh featured sets", err));
  }, []);

  return featuredSets;
}
