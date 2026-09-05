import { useMemo } from "react";
import type { ArchetypeTaxonomyData, Card } from "@gatcg/shared";
import { decodedDeckToRow, type DecodedDeck } from "../../lib/decodedDecks";
import type { DeckBuilderRow } from "./useDeckBuilderPopulation";

/** The three cross-Champion pools that still feed the same `computeCardImpactEntries`-based ranking `useSuggestedBuild.ts` already does — "this Champion + Spirit"/"this Champion, any Spirit" stay handled by `useDeckBuilderPopulation` directly, and "nearest similar decks"/"global element stats" are different enough in shape (see `useNearestDecks.ts`/`useGlobalElementSuggestions.ts`) to need their own hooks. */
export type CrossChampionPool = "spiritAnyChampion" | "closestCluster" | "sameClass";

export interface PoolPopulationResult {
  rows: DeckBuilderRow[];
  /** Human-readable description of what this population actually is and how big it is — always shown, since none of these pools should be silent about being a substitute for "this Champion + Spirit". */
  label: string;
}

/** Top-2 classes by weighted copies across main+material — same "deck identity" convention as computeDeckIdentity (app/src/lib/deckIdentity.ts), just for classes instead of elements (classes have no NORM-equivalent colorless value to exclude). */
function deckClasses(deck: DecodedDeck, cardsByName: Map<string, Card>): Set<string> {
  const counts = new Map<string, number>();
  for (const [name, qty] of [...deck.main, ...deck.material]) {
    const card = cardsByName.get(name);
    if (!card) continue;
    for (const c of card.classes) counts.set(c, (counts.get(c) ?? 0) + qty);
  }
  return new Set(
    Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([c]) => c),
  );
}

/**
 * Populations for the three "filter the shared decoded-deck universe by a predicate, any
 * Champion" pools. `championCard` is the *intended* Champion (resolved by the caller against the
 * stable single-Champion population, same as `useSuggestedBuild`'s `championCardOverride`) — used
 * to know which elements/classes to match against, not to filter `decks` by Champion (the whole
 * point of these pools is to look past it).
 */
export function usePoolPopulation(
  /** `null` when none of these three pools is currently active — short-circuits to an empty, unlabeled result without doing any of the (potentially 57k-deck-scanning) work below. */
  pool: CrossChampionPool | null,
  decks: DecodedDeck[],
  championName: string | null,
  spiritFilter: string | null,
  championCard: Card | undefined,
  cardsByName: Map<string, Card>,
  archetypeTaxonomyData: ArchetypeTaxonomyData | undefined,
  /** Named-alter Spirit prints (e.g. "Aithne, Spirit of Fire") -> base name ("Spirit of Fire"), same map `DeckBuilderIndex.tsx` already keeps `spiritFilter` itself canonicalized against — needed here too since `DecodedDeck.spiritName` is the raw per-deck name, not canonicalized. */
  spiritCanonicalNames: Map<string, string>,
): PoolPopulationResult {
  return useMemo((): PoolPopulationResult => {
    if (pool === null) return { rows: [], label: "" };

    if (pool === "spiritAnyChampion") {
      if (!spiritFilter) return { rows: [], label: "Pick a Spirit to use this pool." };
      const rows = decks.filter((d) => d.spiritName !== null && (spiritCanonicalNames.get(d.spiritName) ?? d.spiritName) === spiritFilter).map(decodedDeckToRow);
      return { rows, label: `Everyone who ran ${spiritFilter}, any Champion (${rows.length} decks)` };
    }

    if (pool === "sameClass") {
      const championClasses = new Set(championCard?.classes ?? []);
      if (championClasses.size === 0) return { rows: [], label: "No class data for this Champion yet." };
      const rows = decks
        .filter((d) => {
          const classes = deckClasses(d, cardsByName);
          for (const c of classes) if (championClasses.has(c)) return true;
          return false;
        })
        .map(decodedDeckToRow);
      return { rows, label: `Decks sharing ${Array.from(championClasses).join("/")}, any Champion/element (${rows.length} decks)` };
    }

    // closestCluster
    if (!archetypeTaxonomyData || !championCard) return { rows: [], label: "No archetype data yet." };
    const myElements = new Set(championCard.elements.filter((e) => e !== "NORM"));
    if (myElements.size === 0) return { rows: [], label: "This Champion has no element to match against." };

    let best: { name: string; championName: string; deckIds: string[]; playerCount: number } | null = null;
    for (const cluster of archetypeTaxonomyData.clusters) {
      if (cluster.championName === championName) continue; // the point of this pool is a *different* Champion
      const clusterElements = new Set<string>();
      for (const dc of cluster.definingCards) {
        for (const e of cardsByName.get(dc.name)?.elements ?? []) if (e !== "NORM") clusterElements.add(e);
      }
      let overlaps = false;
      for (const e of myElements) if (clusterElements.has(e)) overlaps = true;
      if (!overlaps) continue;
      if (!best || cluster.playerCount > best.playerCount) {
        best = { name: cluster.name, championName: cluster.championName, deckIds: cluster.deckIds, playerCount: cluster.playerCount };
      }
    }
    if (!best) return { rows: [], label: "No matching archetype found for these elements." };

    const deckIdSet = new Set(best.deckIds);
    const rows = decks.filter((d) => deckIdSet.has(d.deckId)).map(decodedDeckToRow);
    return { rows, label: `Borrowed from ${best.name} (${best.championName}, ${rows.length} decks)` };
  }, [pool, decks, championName, spiritFilter, championCard, cardsByName, archetypeTaxonomyData, spiritCanonicalNames]);
}
