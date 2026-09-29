import { useMemo } from "react";
import { normalizeCardTags, type CardTagsData } from "@gatcg/shared";
import { usePublishedData, usePublishedDataStatus } from "../../lib/sync/usePublishedData";

/** Decoded silvie.gg art tags — tag names per card uuid and per edition uuid. */
export interface CardTagLookup {
  cards: ReadonlyMap<string, ReadonlySet<string>>;
  editions: ReadonlyMap<string, ReadonlySet<string>>;
}

export function buildCardTagLookup(data: CardTagsData): CardTagLookup {
  const decode = (encoded: Record<string, number[]>) =>
    new Map(Object.entries(encoded).map(([uuid, indices]) => [uuid, new Set(indices.map((i) => data.tags[i].name))]));
  return { cards: decode(data.cards), editions: decode(data.editions) };
}

export function useCardTags() {
  const raw = usePublishedData<CardTagsData>("community-card-tags", "/data/community/card-tags.json");
  const status = usePublishedDataStatus("community-card-tags", "/data/community/card-tags.json");
  const data = useMemo(() => raw ? normalizeCardTags(raw) : undefined, [raw]);
  const lookup = useMemo(() => (data ? buildCardTagLookup(data) : undefined), [data]);
  return { data, lookup, status };
}
