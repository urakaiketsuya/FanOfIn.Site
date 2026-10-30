import type { deckBuildComparison } from '@gatcg/shared';

/** Presentation ordering only; preserve the full report's quantities and population. */
export function deckBuildPreviewRows(comparison: ReturnType<typeof deckBuildComparison>) {
  return comparison.sections.flatMap(section => section.cards.map(card => ({ ...card, section: section.section })))
    .filter(row => row.reference && row.current !== row.reference.median)
    .sort((a, b) => Math.abs(b.current - b.reference!.median) - Math.abs(a.current - a.reference!.median)
      || b.included - a.included || a.section.localeCompare(b.section) || a.name.localeCompare(b.name))
    .slice(0, 3);
}
