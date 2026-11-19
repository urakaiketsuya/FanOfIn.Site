import { useQuery } from "@tanstack/react-query";
import { accountApi } from "../../lib/accountApi";
import { useCardCatalog } from "./useCardCatalog";
import { useMemo } from "react";
import { buildCardTagLookup, canonicalCardTag, mergeTagOverrides, normalizeCardTags, type CardTagsData } from "@gatcg/shared";
import { usePublishedData, usePublishedDataStatus } from "../../lib/sync/usePublishedData";

export type { CardTagLookup } from "@gatcg/shared";

export function useCardTags() {
  const raw = usePublishedData<CardTagsData>("community-card-tags", "/data/community/card-tags.json");
  const status = usePublishedDataStatus("community-card-tags", "/data/community/card-tags.json");
  const catalog = useCardCatalog();
  const local = useQuery({ queryKey: ["card-tag-overrides"], queryFn: accountApi.cardTagOverrides, staleTime: 60_000, retry: false });
  const data = useMemo(() => raw ? local.data?.overrides.length ? mergeTagOverrides(raw, local.data.overrides, catalog) : normalizeCardTags(raw) : undefined, [raw, local.data, catalog]);
  const lookup = useMemo(() => (data ? buildCardTagLookup(data) : undefined), [data]);
  // Tags added by approved site contributions, newest first (the server returns rows in insertion order).
  const recent = useMemo(() => [...new Set((local.data?.overrides ?? []).filter(row => row.action === "add").map(row => canonicalCardTag(row.tag)))].reverse(), [local.data]);
  return { data, lookup, status, local, recent };
}
