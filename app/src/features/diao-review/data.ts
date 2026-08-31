import { usePublishedData } from "../../lib/sync/usePublishedData";

export type DiaoMetric = "composite" | "durability" | "interaction" | "aggro" | "opportunity";
export type DiaoPillar = Exclude<DiaoMetric, "composite">;

export interface DeltaSummary {
  mean: number;
  p10: number;
  median: number;
  p90: number;
  decreasedRate: number;
  unchangedRate: number;
  increasedRate: number;
}

export interface MigrationGroup {
  name: string;
  decks: number;
  champion?: string;
  deltas: Record<DiaoMetric, DeltaSummary>;
}

export interface RepresentativeDeck {
  deckId: string;
  date: string;
  event: string;
  player: string;
  champion: string;
  archetype: string | null;
  v1: { scores: Record<DiaoPillar, number>; composite: number };
  v2SignalsOnV1Bands: { scores: Record<DiaoPillar, number>; composite: number };
  v2: { scores: Record<DiaoPillar, number>; composite: number };
  scoreDelta: Record<DiaoPillar, number>;
  signalDelta: Partial<Record<string, number>>;
}

export interface DiaoMigrationAudit {
  schemaVersion: number;
  generatedAt: string;
  migration: { from: number; to: number };
  sample: { decks: number; archetypeAssignedDecks: number; champions: number };
  overall: Record<DiaoMetric, DeltaSummary>;
  scoreChangeDecomposition: Record<
    DiaoMetric,
    { meanSemanticDelta: number; meanCalibrationDelta: number; meanTotalDelta: number }
  >;
  correctedSignals: Record<
    string,
    { changedDecks: number; changedRate: number; increasedDecks: number; decreasedDecks: number; meanDeltaWhenChanged: number }
  >;
  byChampion: MigrationGroup[];
  byArchetype: MigrationGroup[];
  representativeDecks: {
    largestCompositeChanges: RepresentativeDeck[];
    correctedSignalDetection: RepresentativeDeck[];
  };
  interpretation: string[];
}

export function useDiaoMigrationAudit(): DiaoMigrationAudit | undefined {
  return usePublishedData<DiaoMigrationAudit>("analysis-diao-v2-migration", "/data/analysis/diao-v2-migration.json");
}
