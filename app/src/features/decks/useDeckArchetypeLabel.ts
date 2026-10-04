import type { ArchetypeTaxonomyData } from "@gatcg/shared";
import { useArchetypeTaxonomyData } from "../archetypes/data";
import { usePublishedDataStatus } from "../../lib/sync/usePublishedData";

// Share the published membership lookup across every visible deck card.
const indexes = new WeakMap<ArchetypeTaxonomyData, Map<string, string>>();

export function useDeckArchetypeLabel(deckIds: readonly string[], enabled = true): string {
  const taxonomy = useArchetypeTaxonomyData(enabled);
  const status = usePublishedDataStatus("analysis-archetype-taxonomy", "/data/analysis/archetype-taxonomy.json", enabled);
  if (!taxonomy) return status.phase === "error" ? "Archetype unavailable" : "Loading archetype…";
  let index = indexes.get(taxonomy);
  if (!index) {
    const strategies = new Map(taxonomy.strategyArchetypes.map(strategy => [strategy.id, strategy.name]));
    index = new Map();
    for (const cluster of taxonomy.clusters) {
      const label = strategies.get(cluster.strategyArchetypeId) ?? cluster.name;
      for (const id of cluster.deckIds) index.set(id, label);
    }
    indexes.set(taxonomy, index);
  }
  for (const id of deckIds) {
    const label = index.get(id);
    if (label) return label;
  }
  return "Custom build";
}
