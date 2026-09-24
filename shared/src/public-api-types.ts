/** Stable Fan of Insight public API v1 contracts; independent of upstream API types. */
export interface PublicCardStats {
  name: string;
  slug: string;
  deckCount: number;
  totalCopies: number;
  eventCount: number;
  avgWinRate: number;
  adjustedWinRate: number;
  recentDeckCount: number;
  priorDeckCount: number;
  marketPrice: number | null;
}

/** Coarse champion-character rollups, not taxonomy clusters or named-Spirit rollups. */
export interface PublicArchetype {
  signature: string;
  classes: string[];
  elements: string[];
  deckCount: number;
  eventCount: number;
  avgWinRate: number;
}

export interface PublicApiMetadata {
  apiVersion: "v1";
  datasetVersion: string;
  sources: { cards: string; archetypes: string };
  scope: "published-omnidex-analysis";
  decksConsidered: number;
  counts: { cards: number; archetypes: number };
  cardsWithoutSlug: number;
}

export interface PublicApiResponse<T> {
  data: T;
  meta: PublicApiMetadata;
}

export interface PublicApiPage<T> extends PublicApiResponse<T[]> {
  nextCursor: string | null;
}
