/** Published shapes for pipeline/src/shoutatyourdecks/analytics/ — see docs/CALCULATIONS.md, "ShoutAtYourDecks analytics". */

export interface CardInclusionEntry {
  name: string;
  resolved: boolean;
  deckCount: number;
  percentOfDecks: number;
  totalCopies: number;
  avgCopiesWhenIncluded: number;
}

export interface CardInclusionData {
  generatedAt: string;
  decksConsidered: number;
  overall: CardInclusionEntry[];
  byChampion: Record<string, { deckCount: number; cards: CardInclusionEntry[] }>;
}

export interface PopularityBucket {
  key: string;
  deckCount: number;
  percentOfDecks: number;
}

export interface PopularityData {
  generatedAt: string;
  championDecksConsidered: number;
  champion: PopularityBucket[];
  elementDecksConsidered: number;
  element: PopularityBucket[];
}

export interface PriceStats {
  count: number;
  min: number;
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
  max: number;
  mean: number;
}

export interface PriceDistributionData {
  generatedAt: string;
  decksConsidered: number;
  overall: PriceStats | null;
  byChampion: Record<string, PriceStats>;
}

export interface ShoutAtYourDecksArchetypeCluster {
  champion: string;
  size: number;
  signature: string;
  representative: { title: string; url: string };
  materialDeck: { name: string; quantity: number }[];
  mainDeck: { name: string; quantity: number }[];
}

export interface ShoutAtYourDecksArchetypeClusteringData {
  generatedAt: string;
  decksConsidered: number;
  clusters: ShoutAtYourDecksArchetypeCluster[];
}

export interface DeckEraBucket {
  setPrefix: string;
  earliestDate: string;
  deckCount: number;
  percentOfDecks: number;
}

export interface DeckEraData {
  generatedAt: string;
  decksConsidered: number;
  unresolvedDeckCount: number;
  buckets: DeckEraBucket[];
}
