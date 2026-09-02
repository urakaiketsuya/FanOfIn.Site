import type { DeckFormat } from "@gatcg/shared";
import type { CollectionMode, PopulationSource } from "../model/builderTypes";
import type { SuggestedBuild } from "../useSuggestedBuild";
import { applyCollectionConstraints } from "./builderSelectors";

export interface BuilderEngineSelection {
  format: DeckFormat;
  populationSource: PopulationSource;
  collectionMode: CollectionMode;
}

/** Precomputed source evidence. Individual source algorithms are independently callable pure functions or adapters. */
export interface BuilderEvidence {
  tournament: SuggestedBuild;
  balanced: SuggestedBuild;
  community: SuggestedBuild;
  simulator: SuggestedBuild;
  collectionOwnedByName: ReadonlyMap<string, number>;
}

/** Portable source-selection and collection-policy engine used by the controller and other callers. */
export function buildSuggestedDeck(selection: BuilderEngineSelection, evidence: BuilderEvidence): SuggestedBuild {
  const source: PopulationSource = selection.format === "PANTHEON" ? "community" : selection.populationSource;
  const build = evidence[source];
  return selection.collectionMode === "owned-only"
    ? applyCollectionConstraints(build, evidence.collectionOwnedByName)
    : build;
}
