import { deckBuildComparison, resolveDeckBuildCohort, type ArchetypeCluster, type Card, type DeckDetailData, type DeckLine } from '@gatcg/shared';

export interface BuildComparisonInput {
  target: { main: DeckLine[]; material: DeckLine[] };
  clusters: ArchetypeCluster[];
  partitions: Map<string, DeckDetailData>;
  cards: Map<string, Card>;
}
export function runBuildComparison(input: BuildComparisonInput) {
  const report = resolveDeckBuildCohort(input.target, 'STANDARD', input.clusters, input.partitions);
  const comparison = deckBuildComparison(input.target, report, input.cards);
  // Decoded cohort records stay in the worker; the UI only needs coverage and results.
  const { records: _records, ...coverage } = report;
  return { report: coverage, comparison };
}
export type BuildComparisonResponse = { result: ReturnType<typeof runBuildComparison>; error?: never } | { error: string; result?: never };
