import type { DeckBuilderRow } from "../useDeckBuilderPopulation";
import type { DeckSection } from "./cardScoringAndQuantities";

/** Uses the population's modal section size; zero is meaningful for sideboards. */
export function modalSectionTotal(rows: DeckBuilderRow[], section: DeckSection, fallback: number): number {
  if (rows.length === 0) return fallback;
  const counts = new Map<number, number>();
  for (const row of rows) {
    const total = Array.from(row[section].values()).reduce((sum, quantity) => sum + quantity, 0);
    if (total > 0) counts.set(total, (counts.get(total) ?? 0) + 1);
  }
  if (counts.size === 0) return fallback;
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
}
