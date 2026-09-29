import { useMemo } from "react";
import type { CardTagsData } from "@gatcg/shared";
import { usePublishedData } from "../../lib/sync/usePublishedData";

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

export function useCardTags(): { data: CardTagsData | undefined; lookup: CardTagLookup | undefined } {
  const data = usePublishedData<CardTagsData>("community-card-tags", "/data/community/card-tags.json");
  const lookup = useMemo(() => (data ? buildCardTagLookup(data) : undefined), [data]);
  return { data, lookup };
}
