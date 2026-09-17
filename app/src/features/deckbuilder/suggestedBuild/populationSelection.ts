import type { Card } from "@gatcg/shared";
import { weightedJaccard } from "../../../lib/decodedDecks";
import type { DeckBuilderRow } from "../useDeckBuilderPopulation";

const SPIRIT_ELEMENT_FALLBACK_MIN_SIMILARITY = 0.45;

function rowsCentroid(rows: DeckBuilderRow[]): Map<string, number> {
  const centroid = new Map<string, number>();
  for (const row of rows) {
    for (const [name, quantity] of row.main) centroid.set(name, (centroid.get(name) ?? 0) + quantity);
    for (const [name, quantity] of row.material) centroid.set(name, (centroid.get(name) ?? 0) + quantity);
  }
  if (rows.length === 0) return centroid;
  for (const [name, total] of centroid) centroid.set(name, total / rows.length);
  return centroid;
}

export interface SelectedPopulation {
  spiritRows: DeckBuilderRow[];
  conditionalRows: DeckBuilderRow[];
  rankingRows: DeckBuilderRow[];
  baselineWinRate: number | null;
  conditionalWinRate: number | null;
  usedFallback: boolean;
  usedSpiritElementFallback: boolean;
  spiritElementFallbackSpirits: string[];
}

export function selectSuggestedBuildPopulation(
  rows: DeckBuilderRow[],
  spiritFilter: string | null,
  lockedCards: Map<string, number>,
  cardsByName: Map<string, Card>,
  minSampleSize: number,
  minRankingPopulation: number,
): SelectedPopulation {
  const exactSpiritRows = spiritFilter === null ? rows : rows.filter((row) => row.spiritName === spiritFilter);
  let spiritRows = exactSpiritRows;
  let usedSpiritElementFallback = false;
  let spiritElementFallbackSpirits: string[] = [];
  if (spiritRows.length < minRankingPopulation && spiritFilter !== null) {
    const chosenSpiritElements = new Set((cardsByName.get(spiritFilter)?.elements ?? []).filter((element) => element !== "NORM"));
    if (chosenSpiritElements.size > 0) {
      const fallbackRows = rows.filter((row) => {
        if (!row.spiritName) return false;
        return (cardsByName.get(row.spiritName)?.elements ?? []).some((element) => chosenSpiritElements.has(element));
      });
      const otherSpiritRows = fallbackRows.filter((row) => row.spiritName !== spiritFilter);
      const passesSimilarityCheck =
        exactSpiritRows.length === 0 || weightedJaccard(rowsCentroid(exactSpiritRows), rowsCentroid(otherSpiritRows)) >= SPIRIT_ELEMENT_FALLBACK_MIN_SIMILARITY;
      if (fallbackRows.length > spiritRows.length && passesSimilarityCheck) {
        spiritRows = fallbackRows;
        usedSpiritElementFallback = true;
        spiritElementFallbackSpirits = Array.from(new Set(otherSpiritRows.map((row) => row.spiritName!))).sort();
      }
    }
  }

  if (spiritRows.length === 0) {
    return { spiritRows, conditionalRows: [], rankingRows: [], baselineWinRate: null, conditionalWinRate: null, usedFallback: false, usedSpiritElementFallback: false, spiritElementFallbackSpirits: [] };
  }

  const baselineWinRate = spiritRows.reduce((sum, row) => sum + row.winRate, 0) / spiritRows.length;
  const lockedNames = new Set(lockedCards.keys());
  const conditionableLockedNames = Array.from(lockedNames).filter(
    (name) => spiritRows.filter((row) => row.main.has(name) || row.material.has(name)).length >= minSampleSize,
  );
  const conditionalRows = conditionableLockedNames.length === 0
    ? spiritRows
    : spiritRows.filter((row) => conditionableLockedNames.every((name) => row.main.has(name) || row.material.has(name)));
  const conditionalWinRate = conditionalRows.length > 0 ? conditionalRows.reduce((sum, row) => sum + row.winRate, 0) / conditionalRows.length : null;
  const usedFallback = lockedNames.size > 0 && conditionalRows.length < minRankingPopulation;

  return {
    spiritRows,
    conditionalRows,
    rankingRows: usedFallback ? spiritRows : conditionalRows,
    baselineWinRate,
    conditionalWinRate,
    usedFallback,
    usedSpiritElementFallback,
    spiritElementFallbackSpirits,
  };
}
