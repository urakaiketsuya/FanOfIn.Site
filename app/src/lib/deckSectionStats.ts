import type { Card, OmnidexDecklistCardLine } from "@gatcg/shared";
import { computeDeckComposition, computeMemoryCostCurve, computeReserveCostCurve } from "./deckIdentity";

/** Copy-weighted stats for one section; unknown copies remain in the denominator. */
export function deckSectionStats(lines: OmnidexDecklistCardLine[], catalog: Map<string, Card>) {
  const named = lines.map(line => ({ name: line.card, quantity: line.quantity }));
  const total = lines.reduce((sum, line) => sum + line.quantity, 0);
  const unresolved = lines.reduce((sum, line) => sum + (catalog.has(line.card) ? 0 : line.quantity), 0);
  const composition = computeDeckComposition(named, catalog);
  const breakdown = (counts: Map<string, number>) => [...counts]
    .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
    .map(([label, count]) => ({ label, count, percent: total ? count / total * 100 : 0 }));
  return { total, unresolved,
    types: breakdown(composition.types), elements: breakdown(composition.elements), subtypes: breakdown(composition.subtypes),
    memory: computeMemoryCostCurve(named, catalog), reserve: computeReserveCostCurve(named, catalog),
  };
}
